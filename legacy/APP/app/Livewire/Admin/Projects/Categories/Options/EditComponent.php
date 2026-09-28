<?php

namespace App\Livewire\Admin\Projects\Categories\Options;

use App\Http\Validators\Admin\Projects\Categories\EditValidator;
use App\Models\Language;
use App\Models\ProjectCategory;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Schema;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class EditComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $translations = [];

    public $translation_language_code;

    public $translation_language_value;

    public $name = [];

    public $slug;

    public $seo_description;

    public $thumbnail;

    public $ogimage;

    public $category;

    /**
     * Initialize component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get category

        $category = ProjectCategory::where('uid', $id)->firstOrFail();

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $category->translate($language->language_code);

            // Fill translations

            $this->name[$language->language_code] = ! empty($translation) ? $translation->name : null;

        }

        // Fill form

        $this->fill([

            'slug' => $category->slug,

            'seo_description' => $category->seo_description ? $category->seo_description : null,

        ]);

        // Check if category has translations


        // Set category

        $this->category = $category;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_projects_category'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.categories.options.edit', [

            'languages' => $this->languages,

        ]);

    }

    /**
     * Get supported languages

     *

     * @return object
     */
    public function getLanguagesProperty()
    {

        return Language::whereIsActive(true)->where('language_code', '!=', settings('general')->default_language)->orderBy('name', 'asc')->get();

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

            // Disable foreign key check

            Schema::disableForeignKeyConstraints();

            // Upload thumbnail

            if ($this->thumbnail) {

                $thumbnail_id = ImageUploader::make($this->thumbnail)
                    ->extension('jpg')
                    ->folder('projects/categories/thumbnails')
                    ->deleteById($this->category->thumbnail_id)
                    ->handle();

            } else {

                $thumbnail_id = $this->category->thumbnail_id;

            }

            // Upload ogimage

            if ($this->ogimage) {

                $ogimage_id = ImageUploader::make($this->ogimage)
                    ->extension('jpg')
                    ->folder('projects/categories/ogimages')
                    ->deleteById($this->category->ogimage_id)
                    ->handle();

            } else {

                $ogimage_id = $this->category->ogimage_id;

            }

            // Update category

            $this->category->slug = strtolower($this->slug);

            $this->category->seo_description = $this->seo_description;

            $this->category->thumbnail_id = $thumbnail_id;

            $this->category->ogimage_id = $ogimage_id;

            $this->category->save();

            // Check if category has translations

            // Save translations

            foreach (supported_languages() as $language) {

                $this->category->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : $this->category->translate($language->language_code)?->name;

            }

            // Save again

            $this->category->save();
            // Enable foreign key check

            Schema::enableForeignKeyConstraints();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

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
