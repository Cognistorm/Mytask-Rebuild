<?php

namespace App\Livewire\Admin\Projects\Categories\Options;

use App\Http\Validators\Admin\Projects\Categories\CreateValidator;
use App\Http\Validators\Admin\Projects\Categories\TranslationValidator;
use App\Models\Language;
use App\Models\ProjectCategory;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class CreateComponent extends Component
{
    use Actions ,LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $translations = [];

    public $translation_language_code;

    public $translation_language_value;

    public $name = [];

    public $slug;

    public $seo_description;

    public $thumbnail;

    public $ogimage;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_projects_category'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.categories.options.create', [

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
     * Add category in other language

     *

     * @return void
     */
    public function addTranslation()
    {

        try {

            // Validate form

            TranslationValidator::validate($this);

            // Check if already set a category in this language

            if (array_search($this->translation_language_code, array_column($this->translations, 'language_code'))) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_project_cat_trans_lang_key_exists_error'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Add catgeory in this language

            array_push($this->translations, [

                'language_code' => strtolower($this->translation_language_code),

                'language_value' => $this->translation_language_value,

            ]);

            // Refresh values

            array_keys($this->translations);

            // Reset language value

            $this->reset('translation_language_value');

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

    /**
     * Edit translation

     *

     * @param  int  $index
     * @return void
     */
    public function deleteTranslation($index)
    {

        // Check if key exists

        if (array_key_exists($index, $this->translations)) {

            // delete

            unset($this->translations[$index]);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } else {

            // Not found

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

        }

    }

    /**
     * Create new projects category

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Upload thumbnail

            if ($this->thumbnail) {

                $thumbnail_id = ImageUploader::make($this->thumbnail)
                    ->extension('jpg')
                    ->folder('projects/categories/thumbnails')
                    ->handle();

            } else {

                $thumbnail_id = null;

            }

            // Upload ogimage

            if ($this->ogimage) {

                $ogimage_id = ImageUploader::make($this->ogimage)
                    ->extension('jpg')
                    ->folder('projects/categories/ogimages')
                    ->handle();

            } else {

                $ogimage_id = null;

            }

            // Create new category

            $category = new ProjectCategory;

            $category->uid = uid();
            
            $category->slug = strtolower($this->slug);

            $category->seo_description = $this->seo_description;

            $category->thumbnail_id = $thumbnail_id;

            $category->ogimage_id = $ogimage_id;

            $category->save();
            // Check if has translations

            foreach (supported_languages() as $language) {
                $category->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : null;
            }

            // Save again

            $category->save();


            // Reset form

            $this->reset();

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
