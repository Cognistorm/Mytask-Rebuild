<?php

namespace App\Livewire\Admin\Languages\Options;

use App\Http\Validators\Admin\Languages\EditValidator;
use App\Models\Language;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class EditComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public Language $language;

    public $country_code;

    public $language_code;

    public $name;

    public $is_active;

    public $force_rtl;

    public $frontend_timing_locale;

    public $backend_timing_locale;

    public $i_will_indentation;

    /**
     * Init component

     *

     * @param  int  $id
     * @return void
     */
    public function mount($id)
    {

        // Get language

        $language = Language::where('uid', $id)->firstOrFail();

        // Fill form

        $this->fill([

            'country_code' => $language->country_code,

            'language_code' => $language->language_code,

            'name' => $language->name,

            'is_active' => $language->is_active ? 1 : 0,

            'force_rtl' => $language->force_rtl ? 1 : 0,

            'frontend_timing_locale' => $language->frontend_timing_locale,

            'backend_timing_locale' => $language->backend_timing_locale,

            'i_will_indentation' => isset($language->params['i_will_indentation']) ? $language->params['i_will_indentation'] : null,

        ]);

        // Set language

        $this->language = $language;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_language'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.languages.options.edit');

    }

    /**
     * Update language

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Set params

            $params = [

                'i_will_indentation' => $this->i_will_indentation,

            ];

            // Update

            $this->language->name = $this->name;

            $this->language->country_code = $this->country_code;

            $this->language->language_code = $this->language_code;

            $this->language->is_active = $this->is_active ? 1 : 0;

            $this->language->force_rtl = $this->force_rtl ? 1 : 0;

            $this->language->frontend_timing_locale = $this->frontend_timing_locale;

            $this->language->backend_timing_locale = $this->backend_timing_locale;

            $this->language->params = $params;

            $this->language->save();

            // Refresh supported langs

            supported_languages(true);

            // Clear cache

            Artisan::call('cache:clear');

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
