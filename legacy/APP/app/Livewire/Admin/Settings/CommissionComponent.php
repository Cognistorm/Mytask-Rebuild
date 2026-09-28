<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\CommissionValidator;
use App\Models\SettingsCommission;
use App\Models\SettingsPublish;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CommissionComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $enable_taxes;

    public $tax_type;

    public $tax_value;

    public $commission_from;

    public $commission_type;

    public $commission_value;

    public $custom_offers_commission_type;

    public $custom_offers_commission_value_freelancer;

    public $custom_offers_commission_value_buyer;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get commission settings

        $commission = settings('commission');

        // Get publish settings

        $publish = settings('publish');

        // Fill default settings

        $this->fill([

            'enable_taxes' => $commission->enable_taxes ? 1 : 0,

            'tax_type' => $commission->tax_type,

            'tax_value' => $commission->tax_value,

            'commission_from' => $commission->commission_from,

            'commission_type' => $commission->commission_type,

            'commission_value' => $commission->commission_value,

            'custom_offers_commission_type' => $publish->custom_offers_commission_type,

            'custom_offers_commission_value_freelancer' => $publish->custom_offers_commission_value_freelancer,

            'custom_offers_commission_value_buyer' => $publish->custom_offers_commission_value_buyer,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_commission_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.commission');

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

            CommissionValidator::validate($this);

            // Update commission settings

            SettingsCommission::first()->update([

                'enable_taxes' => $this->enable_taxes ? 1 : 0,

                'tax_type' => $this->tax_type,

                'tax_value' => $this->tax_value,

                'commission_from' => $this->commission_from,

                'commission_type' => $this->commission_type,

                'commission_value' => $this->commission_value,

            ]);

            // Clear commission settings cache

            settings('commission', true);

            // Update publish settings

            SettingsPublish::first()->update([

                'custom_offers_commission_type' => $this->custom_offers_commission_type,

                'custom_offers_commission_value_freelancer' => $this->custom_offers_commission_value_freelancer,

                'custom_offers_commission_value_buyer' => $this->custom_offers_commission_value_buyer,

            ]);

            // Clear publish settings cache

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

            throw $th;
        }

    }

}
