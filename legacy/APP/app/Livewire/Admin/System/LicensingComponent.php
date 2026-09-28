<?php

namespace App\Livewire\Admin\System;

use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class LicensingComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $purchase_code;

    public $buyer;

    public $license;

    public $supported_until;

    public $currently_supported;

    /**
     * Initialize component
     */
    public function mount(): void
    {

        // Fill form

        $this->fill([

            'purchase_code' => config('envato.purchase_code'),

            'buyer' => config('envato.buyer'),

            'license' => config('envato.license'),

            'supported_until' => config('envato.supported_until'),

            'currently_supported' => config('envato.currently_supported') ? 'Currently supported' : 'Support expired',

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

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_licensing'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.system.licensing');

    }

    /**
     * Update license details
     */
    public function update(): void
    {

        try {

            // Send a request

            $response = Http::acceptJson()->get('https://verify.edhub.me/?code='.$this->purchase_code);

            // Get json response

            $results = $response->json();

            // Check if success

            if (isset($results['success'])) {

                // Check if succeeded

                if ($results['success']) {

                    // Write new data

                    Config::write('envato.purchase_code', $this->purchase_code);

                    Config::write('envato.buyer', $results['buyer']);

                    Config::write('envato.license', $results['license']);

                    Config::write('envato.supported_until', $results['supported_until']);

                    Config::write('envato.currently_supported', $results['currently_supported']);

                    // Clear cache

                    Artisan::call('cache:clear');

                    // Success

                    $this->alert(

                        'success',

                        __('messages.t_success'),

                        livewire_alert_params('Your license info have been successfully updated. Please refresh this page.')

                    );

                    return;

                } else {

                    $message = isset($results['message']) ? $results['message'] : __('messages.t_toast_something_went_wrong');

                    // Something went wrong

                    $this->alert(

                        'error',

                        __('messages.t_error'),

                        livewire_alert_params($message, 'error')

                    );

                    return;

                }

            } else {

                // Something went wrong

                $this->alert(

                    'error',

                    __('messages.t_error'),

                    livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

                );

                return;

            }

        } catch (\Throwable $th) {

            // Error

            throw $th;
        }

    }

}
