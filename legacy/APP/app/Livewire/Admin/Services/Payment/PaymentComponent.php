<?php

namespace App\Livewire\Admin\Services\Payment;

use App\Models\AutomaticPaymentGateway;
use App\Models\OfflinePaymentGateway;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class PaymentComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $status = [];

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_payment_gateways'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.services.payment.payment', [

            'gateways' => $this->gateways,

        ]);

    }

    /**
     * Get all available payment gateways

     *

     * @return object
     */
    public function getGatewaysProperty()
    {

        return AutomaticPaymentGateway::oldest('name')->with('logo')->get();

    }

    /**
     * Get updated payment gateway

     *

     * @param  mixed  $value
     * @param  string  $slug
     * @return void
     */
    public function update($slug)
    {

        try {

            // Get payment gateway

            $gateway = AutomaticPaymentGateway::where('slug', $slug)->first();

            // Check if exists

            if (! $gateway) {

                // Get offline gateway

                $gateway = OfflinePaymentGateway::where('slug', $slug)->firstOrFail();

            }

            // Check if gateway already enabled

            if ($gateway->is_active) {

                // Disable it

                $gateway->is_active = false;

                $gateway->save();

            } else {

                // Enable it

                $gateway->is_active = true;

                $gateway->save();

            }

            // Clear payment gateway cached settings

            payment_gateway($slug, true);

            payment_gateway($slug, true, true);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

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
