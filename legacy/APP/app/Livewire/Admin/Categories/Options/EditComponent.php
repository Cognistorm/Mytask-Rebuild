<?php

namespace App\Livewire\Admin\Categories\Options;

use App\Http\Validators\Admin\Categories\EditValidator;
use App\Models\Category;
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

    public $is_visible = false;

    public Category $category;

    /**
     * Initialize component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set category

        $this->category = Category::where('uid', $id)->with(['icon', 'image'])->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $this->category->translate($language->language_code);

            // Fill translations

            $this->name[$language->language_code] = ! empty($translation) ? $translation->name : null;

            $this->content_top[$language->language_code] = ! empty($translation) ? $translation->content_top : null;

            $this->content_bottom[$language->language_code] = ! empty($translation) ? $translation->content_bottom : null;

        }

        // Fill form

        $this->fill([

            'slug' => $this->category->slug,

            'description' => $this->category->description,

            'is_visible' => $this->category->is_visible ? true : false,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_category'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.categories.options.edit');

    }

    /**
     * Update category

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
                    ->deleteById($this->category->icon_id)
                    ->resize(100, 100)
                    ->folder('categories')
                    ->handle();

            } else {

                $icon_id = $this->category->icon_id;

            }

            // Upload category image

            if ($this->image) {

                $image_id = ImageUploader::make($this->image)
                    ->deleteById($this->category->image_id)
                    ->folder('categories')
                    ->handle();

            } else {

                $image_id = $this->category->image_id;

            }

            // Update category

            $this->category->slug = Str::slug($this->slug);

            $this->category->description = $this->description ? $this->description : null;

            $this->category->icon_id = $icon_id;

            $this->category->image_id = $image_id;

            $this->category->is_visible = $this->is_visible ? true : false;

            // Save translations

            foreach (supported_languages() as $language) {

                $this->category->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : $this->category->translate($language->language_code)?->name;

                $this->category->translateOrNew($language->language_code)->content_top = isset($this->content_top[$language->language_code]) && ! empty($this->content_top[$language->language_code]) ? $this->content_top[$language->language_code] : $this->category->translate($language->language_code)?->content_top;

                $this->category->translateOrNew($language->language_code)->content_bottom = isset($this->content_bottom[$language->language_code]) && ! empty($this->content_bottom[$language->language_code]) ? $this->content_bottom[$language->language_code] : $this->category->translate($language->language_code)?->content_bottom;

            }

            // Save again

            $this->category->save();

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
