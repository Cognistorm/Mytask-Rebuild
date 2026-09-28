<?php

namespace App\Livewire\Admin\Services\Cloud;

use App\Http\Validators\Admin\Services\Cloud\CloudinaryValidator;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CloudinaryComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $cloud_url;

    public $upload_preset;

    /**
     * Initialize component
     */
    public function mount(): void
    {

        // Fill form

        $this->fill([

            'cloud_url' => config('cloudinary.cloud_url'),

            'upload_preset' => config('cloudinary.upload_preset'),

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

        $this->seo()->setTitle(setSeoTitle('Cloudinary', true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.services.cloud.cloudinary');

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

            CloudinaryValidator::validate($this);

            // Update data

            Config::write('cloudinary.cloud_url', $this->cloud_url);

            Config::write('cloudinary.upload_preset', $this->upload_preset);

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
