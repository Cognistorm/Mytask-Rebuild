<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\CurrencyValidator;
use App\Models\SettingsCurrency;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CurrencyComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $name;

    public $code;

    public $exchange_rate;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('currency');

        // Fill default settings

        $this->fill([

            'name' => $settings->name,

            'code' => $settings->code,

            'exchange_rate' => $settings->exchange_rate,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_currency_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.currency', [

            'currencies' => config('money')['currencies'],

        ]);

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

            CurrencyValidator::validate($this);

            // Update settings

            SettingsCurrency::first()->update([

                'name' => $this->name,

                'code' => $this->code,

                'exchange_rate' => $this->exchange_rate,

            ]);

            // Refresh data from cache

            settings('currency', true);

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
