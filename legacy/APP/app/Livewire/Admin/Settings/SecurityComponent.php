<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\SecurityValidator;
use App\Models\SettingsSecurity;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Artisan;
use Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class SecurityComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $is_social_media_accounts;

    public $debug;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('security');

        // Fill default settings

        $this->fill([

            'is_social_media_accounts' => $settings->is_social_media_accounts ? 1 : 0,

            'debug' => config('app.debug') ? 1 : 0,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_security_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.security');

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

            SecurityValidator::validate($this);

            // Update security settings

            SettingsSecurity::first()->update([

                'is_social_media_accounts' => $this->is_social_media_accounts ? 1 : 0,

            ]);

            // Write debug mode status

            Config::write('app.debug', $this->debug);

            // Clear cache

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
