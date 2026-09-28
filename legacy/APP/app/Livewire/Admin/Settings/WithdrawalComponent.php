<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\WithdrawalValidator;
use App\Models\SettingsWithdrawal;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class WithdrawalComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $is_offline_method;

    public $is_paypal_method;

    public $min_withdrawal_amount;

    public $withdrawal_period;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('withdrawal');

        // Fill default settings

        $this->fill([

            'is_offline_method' => config('payouts.offline.enabled') ? 1 : 0,

            'is_paypal_method' => config('payouts.paypal.enabled') ? 1 : 0,

            'min_withdrawal_amount' => $settings->min_withdrawal_amount,

            'withdrawal_period' => $settings->withdrawal_period,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_withdrawal_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.withdrawal');

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

            WithdrawalValidator::validate($this);

            // Update settings

            SettingsWithdrawal::where('id', 1)->update([

                'min_withdrawal_amount' => $this->min_withdrawal_amount,

                'withdrawal_period' => $this->withdrawal_period,

            ]);

            // Rewrite config

            Config::write('payouts.paypal.enabled', $this->is_paypal_method ? 1 : 0);

            Config::write('payouts.offline.enabled', $this->is_offline_method ? 1 : 0);

            // Refresh data from cache

            settings('withdrawal', true);

            // Clear cache

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
