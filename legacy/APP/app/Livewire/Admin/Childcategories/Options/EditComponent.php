<?php

namespace App\Livewire\Admin\Childcategories\Options;

use App\Http\Validators\Admin\Childcategories\EditValidator;
use App\Models\Category;
use App\Models\Childcategory;
use App\Models\Subcategory;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class EditComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $name = [];

    public $content_top = [];

    public $content_bottom = [];

    public $slug;

    public $description;

    public $icon;

    public $image;

    public $parent_id;

    public $subcategory_id;

    public Childcategory $childcategory;

    public $subcategories = [];

    /**
     * Initialize component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set childcategory

        $this->childcategory = Childcategory::where('uid', $id)->with(['icon', 'image', 'subcategory', 'parent'])->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $this->childcategory->translate($language->language_code);

            // Fill translations

            $this->name[$language->language_code] = ! empty($translation) ? $translation->name : null;

            $this->content_top[$language->language_code] = ! empty($translation) ? $translation->content_top : null;

            $this->content_bottom[$language->language_code] = ! empty($translation) ? $translation->content_bottom : null;

        }

        // Fill form

        $this->fill([

            'slug' => $this->childcategory->slug,

            'description' => $this->childcategory->description,

            'parent_id' => $this->childcategory->parent_id,

            'subcategory_id' => $this->childcategory->subcategory_id,

        ]);

        // Load subcategories

        $this->subcategories = Subcategory::where('parent_id', $this->parent_id)
            ->withTranslation()
            ->orderBy('id')
            ->get();

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_edit_childcategory'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.childcategories.options.edit', [

            'categories' => $this->categories,

        ]);

    }

    /**
     * Get all parent categories

     *

     * @return object
     */
    public function getCategoriesProperty()
    {

        return Category::orderBy('id')
            ->withTranslation()
            ->get();

    }

    /**
     * Listen to the updated parent category id

     *

     * @param  string  $value
     * @return void
     */
    public function updatedParentId($value)
    {

        // Set subcategories

        $this->subcategories = Subcategory::where('parent_id', $value)
            ->withTranslation()
            ->orderBy('id')
            ->get();

    }

    /**
     * Update subcategory

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Parent category must be valid for the selected subcategory

            $is_valid = Category::where('id', $this->parent_id)
                ->whereHas('subcategories', function ($query) {

                    return $query->where('id', $this->subcategory_id);

                })
                ->first();

            // Check if it's valid

            if (! $is_valid) {

                // Not a valid subcategory

                $this->alert(

                    'error',

                    __('messages.t_error'),

                    livewire_alert_params(__('dashboard.t_pls_select_a_valid_subcategory'), 'error')

                );

                return;

            }

            // Upload childcategory icon

            if ($this->icon) {

                $icon_id = ImageUploader::make($this->icon)
                    ->deleteById($this->childcategory->icon_id)
                    ->resize(100, 100)
                    ->folder('childcategories')
                    ->handle();

            } else {

                $icon_id = $this->childcategory->icon_id;

            }

            // Upload childcategory image

            if ($this->image) {

                $image_id = ImageUploader::make($this->image)
                    ->deleteById($this->childcategory->image_id)
                    ->folder('childcategories')
                    ->handle();

            } else {

                $image_id = $this->childcategory->image_id;

            }

            // Update childcategory

            $this->childcategory->slug = Str::slug($this->slug);

            $this->childcategory->description = $this->description ? $this->description : null;

            $this->childcategory->icon_id = $icon_id;

            $this->childcategory->image_id = $image_id;

            $this->childcategory->parent_id = $this->parent_id;

            $this->childcategory->subcategory_id = $this->subcategory_id;

            // Save translations

            foreach (supported_languages() as $language) {

                $this->childcategory->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : $this->childcategory->translate($language->language_code)?->name;

                $this->childcategory->translateOrNew($language->language_code)->content_top = isset($this->content_top[$language->language_code]) && ! empty($this->content_top[$language->language_code]) ? $this->content_top[$language->language_code] : $this->childcategory->translate($language->language_code)?->content_top;

                $this->childcategory->translateOrNew($language->language_code)->content_bottom = isset($this->content_bottom[$language->language_code]) && ! empty($this->content_bottom[$language->language_code]) ? $this->content_bottom[$language->language_code] : $this->childcategory->translate($language->language_code)?->content_bottom;

            }

            // Save again

            $this->childcategory->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

            // Refresh the page

            $this->dispatch('refresh');

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_form_validation_error'), 'error')

            );

            throw $e;
        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

            throw $th;
        }

    }

}
