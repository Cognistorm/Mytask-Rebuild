<?php

namespace App\Livewire\Admin\Services;

use App\Http\Validators\Admin\Services\RecaptchaValidator;
use App\Models\SettingsSecurity;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class RecaptchaComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $site_key;

    public $secret_key;

    public $is_enabled;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Fill default settings

        $this->fill([

            'site_key' => config('recaptcha.site_key'),

            'secret_key' => config('recaptcha.secret_key'),

            'is_enabled' => settings('security')->is_recaptcha ? 1 : 0,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_recaptcha'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.services.recaptcha');

    }

    /**
     * Update settings

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            RecaptchaValidator::validate($this);

            // Update currency

            Config::write('recaptcha.site_key', $this->site_key);

            Config::write('recaptcha.secret_key', $this->secret_key);

            // Update settings

            SettingsSecurity::first()->update([

                'is_recaptcha' => $this->is_enabled ? 1 : 0,

            ]);

            // Clear security settings cache

            settings('security', true);

            // Clear config

            Artisan::call('config:clear');

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
