<?php

namespace App\Livewire\Admin\Services\Cloud;

use App\Http\Validators\Admin\Services\Cloud\WasabiValidator;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class WasabiComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $key;

    public $secret;

    public $region;

    public $bucket;

    /**
     * Initialize component
     */
    public function mount(): void
    {

        // Fill form

        $this->fill([

            'key' => config('filesystems.disks.wasabi.key'),

            'secret' => config('filesystems.disks.wasabi.secret'),

            'region' => config('filesystems.disks.wasabi.region'),

            'bucket' => config('filesystems.disks.wasabi.bucket'),

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

        $this->seo()->setTitle(setSeoTitle('Wasabi', true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.services.cloud.wasabi');

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

            WasabiValidator::validate($this);

            // Update data

            Config::write('filesystems.disks.wasabi.key', $this->key);

            Config::write('filesystems.disks.wasabi.secret', $this->secret);

            Config::write('filesystems.disks.wasabi.region', $this->region);

            Config::write('filesystems.disks.wasabi.bucket', $this->bucket);

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
