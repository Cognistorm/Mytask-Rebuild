<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\PublishValidator;
use App\Models\SettingsPublish;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class PublishComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $auto_approve_gigs;

    public $auto_approve_portfolio;

    public $enable_custom_offers;

    public $custom_offers_require_approval;

    public $custom_offers_expiry_days;

    public $max_tags;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('publish');

        // Fill default settings

        $this->fill([

            'auto_approve_gigs' => $settings->auto_approve_gigs ? 1 : 0,

            'auto_approve_portfolio' => $settings->auto_approve_portfolio ? 1 : 0,

            'custom_offers_require_approval' => $settings->custom_offers_require_approval ? 1 : 0,

            'enable_custom_offers' => $settings->enable_custom_offers ? 1 : 0,

            'custom_offers_expiry_days' => $settings->custom_offers_expiry_days,

            'max_tags' => $settings->max_tags,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_publish_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.publish');

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

            PublishValidator::validate($this);

            // Update settings

            SettingsPublish::first()->update([

                'auto_approve_gigs' => $this->auto_approve_gigs ? 1 : 0,

                'auto_approve_portfolio' => $this->auto_approve_portfolio ? 1 : 0,

                'enable_custom_offers' => $this->enable_custom_offers ? 1 : 0,

                'custom_offers_require_approval' => $this->custom_offers_require_approval ? 1 : 0,

                'custom_offers_expiry_days' => $this->custom_offers_expiry_days,

                'max_tags' => $this->max_tags,

            ]);

            // Refresh data from cache

            settings('publish', true);

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

        }

    }

}
