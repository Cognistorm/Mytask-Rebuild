<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\MediaValidator;
use App\Models\SettingsMedia;
use App\Models\SettingsPublish;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class MediaComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $default_storage_driver;

    public $enable_video_upload;

    public $enable_audio_upload;

    public $enable_documents_upload;

    public $enable_attachments_custom_offers;

    public $max_images_per_gig;

    public $max_documents_per_gig;

    public $max_images_per_portfolio;

    public $max_files_per_custom_offer;

    public $max_single_image_size;

    public $max_single_document_size;

    public $max_single_portfolio_image_size;

    public $max_single_offer_file_size;

    public $offer_attachments_allowed_extensions;

    public $requirements_max_file_size;

    public $requirements_allowed_extensions;

    public $delivered_work_max_file_size;

    public $delivered_work_allowed_extensions;

    public $restrictions_max_files;

    public $restrictions_max_size;

    public $restrictions_allowed_extensions;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get media settings

        $media = settings('media');

        // Get publish settings

        $publish = settings('publish');

        // Fill default settings

        $this->fill([

            'default_storage_driver' => $media->default_storage_driver,

            'enable_video_upload' => $publish->is_video_enabled ? 1 : 0,

            'enable_audio_upload' => $media->enable_audio_upload ? 1 : 0,

            'enable_documents_upload' => $publish->is_documents_enabled ? 1 : 0,

            'enable_attachments_custom_offers' => $publish->custom_offer_enable_attachments ? 1 : 0,

            'max_images_per_gig' => $publish->max_images,

            'max_documents_per_gig' => $publish->max_documents,

            'max_images_per_portfolio' => $media->portfolio_max_images,

            'max_files_per_custom_offer' => $publish->custom_offer_attachment_max_files,

            'max_single_image_size' => $publish->max_image_size,

            'max_single_document_size' => $publish->max_document_size,

            'max_single_portfolio_image_size' => $media->portfolio_max_size,

            'max_single_offer_file_size' => $publish->custom_offer_attachment_max_size,

            'offer_attachments_allowed_extensions' => $publish->custom_offer_attachments_allowed_extensions,

            'requirements_max_file_size' => $media->requirements_file_max_size,

            'requirements_allowed_extensions' => $media->requirements_file_allowed_extensions,

            'delivered_work_max_file_size' => $media->delivered_work_max_size,

            'delivered_work_allowed_extensions' => $media->completed_work_allowed_extensions,

            'restrictions_max_files' => $media->restrictions_max_files,

            'restrictions_max_size' => $media->restrictions_max_size,

            'restrictions_allowed_extensions' => $media->restrictions_allowed_extensions,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_media_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.media');

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

            MediaValidator::validate($this);

            // Update media settings

            SettingsMedia::first()->update([

                'requirements_file_max_size' => $this->requirements_max_file_size,

                'requirements_file_allowed_extensions' => $this->requirements_allowed_extensions,

                'delivered_work_max_size' => $this->delivered_work_max_file_size,

                'completed_work_allowed_extensions' => $this->delivered_work_allowed_extensions,

                'portfolio_max_images' => $this->max_images_per_portfolio,

                'portfolio_max_size' => $this->max_single_portfolio_image_size,

                'default_storage_driver' => $this->default_storage_driver,

                'enable_audio_upload' => $this->enable_audio_upload ? 1 : 0,

                'restrictions_max_files' => $this->restrictions_max_files,

                'restrictions_max_size' => $this->restrictions_max_size,

                'restrictions_allowed_extensions' => $this->restrictions_allowed_extensions,

            ]);

            // Clear media settings cache

            settings('media', true);

            // Update publish settings

            SettingsPublish::first()->update([

                'is_video_enabled' => $this->enable_video_upload ? 1 : 0,

                'is_documents_enabled' => $this->enable_documents_upload ? 1 : 0,

                'max_documents' => $this->max_documents_per_gig,

                'max_document_size' => $this->max_single_document_size,

                'max_images' => $this->max_images_per_gig,

                'max_image_size' => $this->max_single_image_size,

                'custom_offer_enable_attachments' => $this->enable_attachments_custom_offers ? 1 : 0,

                'custom_offer_attachment_max_size' => $this->max_single_offer_file_size,

                'custom_offer_attachment_max_files' => $this->max_files_per_custom_offer,

                'custom_offer_attachments_allowed_extensions' => $this->offer_attachments_allowed_extensions,

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
