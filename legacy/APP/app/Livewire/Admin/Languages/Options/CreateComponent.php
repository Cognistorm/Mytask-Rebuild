<?php

namespace App\Livewire\Admin\Languages\Options;

use App\Http\Validators\Admin\Languages\CreateValidator;
use App\Models\Language;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CreateComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $name;

    public $country_code;

    public $language_code;

    public $is_active = true;

    public $force_rtl = false;

    public $i_will_indentation;

    public $backend_timing_locale;

    public $frontend_timing_locale;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_language'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.languages.options.create');

    }

    /**
     * Create new language

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Check if directory exists

            if (! File::exists(lang_path(strtolower($this->language_code)))) {

                // Create new folder

                File::makeDirectory(lang_path(strtolower($this->language_code)));

                // Copy translation file to new folder

                File::copy(lang_path('en/messages.php'), lang_path(strtolower($this->language_code).'/messages.php'));

                File::copy(lang_path('en/dashboard.php'), lang_path(strtolower($this->language_code).'/dashboard.php'));

            }

            // Set params

            $params = [

                'i_will_indentation' => $this->i_will_indentation,

            ];

            // Create new language

            $language = new Language;

            $language->uid = Str::uuid()->toString();

            $language->language_code = strtolower($this->language_code);

            $language->country_code = strtolower($this->country_code);

            $language->name = $this->name;

            $language->is_active = $this->is_active ? 1 : 0;

            $language->force_rtl = $this->force_rtl ? 1 : 0;

            $language->frontend_timing_locale = $this->frontend_timing_locale;

            $language->backend_timing_locale = $this->backend_timing_locale;

            $language->params = $params;

            $language->save();

            // Refresh supported langs

            supported_languages(true);

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
