<?php

namespace App\Livewire\Admin\Subcategories\Options;

use App\Http\Validators\Admin\Subcategories\EditValidator;
use App\Models\Category;
use App\Models\Subcategory;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class EditComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $name = [];

    public $content_top = [];

    public $content_bottom = [];

    public $slug;

    public $description;

    public $icon;

    public $image;

    public $parent_id;

    public Subcategory $subcategory;

    /**
     * Initialize component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set subcategory

        $this->subcategory = Subcategory::where('uid', $id)->with(['icon', 'image'])->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $this->subcategory->translate($language->language_code);

            // Fill translations

            $this->name[$language->language_code] = ! empty($translation) ? $translation->name : null;

            $this->content_top[$language->language_code] = ! empty($translation) ? $translation->content_top : null;

            $this->content_bottom[$language->language_code] = ! empty($translation) ? $translation->content_bottom : null;

        }

        // Fill form

        $this->fill([

            'slug' => $this->subcategory->slug,

            'description' => $this->subcategory->description,

            'parent_id' => $this->subcategory->parent_id,

        ]);

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_subcategory'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.subcategories.options.edit', [

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
     * Update subcategory

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Upload categorory icon

            if ($this->icon) {

                $icon_id = ImageUploader::make($this->icon)
                    ->deleteById($this->subcategory->icon_id)
                    ->resize(100, 100)
                    ->folder('subcategories')
                    ->handle();

            } else {

                $icon_id = $this->subcategory->icon_id;

            }

            // Upload subcategory image

            if ($this->image) {

                $image_id = ImageUploader::make($this->image)
                    ->deleteById($this->subcategory->image_id)
                    ->folder('subcategories')
                    ->handle();

            } else {

                $image_id = $this->subcategory->image_id;

            }

            // Update subcategory

            $this->subcategory->slug = Str::slug($this->slug);

            $this->subcategory->description = $this->description ? $this->description : null;

            $this->subcategory->icon_id = $icon_id;

            $this->subcategory->image_id = $image_id;

            $this->subcategory->parent_id = $this->parent_id;

            // Save translations

            foreach (supported_languages() as $language) {

                $this->subcategory->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : $this->subcategory->translate($language->language_code)?->name;

                $this->subcategory->translateOrNew($language->language_code)->content_top = isset($this->content_top[$language->language_code]) && ! empty($this->content_top[$language->language_code]) ? $this->content_top[$language->language_code] : $this->subcategory->translate($language->language_code)?->content_top;

                $this->subcategory->translateOrNew($language->language_code)->content_bottom = isset($this->content_bottom[$language->language_code]) && ! empty($this->content_bottom[$language->language_code]) ? $this->content_bottom[$language->language_code] : $this->subcategory->translate($language->language_code)?->content_bottom;

            }

            // Save again

            $this->subcategory->save();

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
