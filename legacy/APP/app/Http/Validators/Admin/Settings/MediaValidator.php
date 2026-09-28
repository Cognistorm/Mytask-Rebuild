<?php

namespace App\Http\Validators\Admin\Settings;

use Illuminate\Support\Facades\Validator;

class MediaValidator
{
    /**
     * Validate form

     *

     * @param  object  $request
     * @return void
     */
    public static function validate($request)
    {

        try {

            // Set rules

            $rules = [

                'default_storage_driver' => 'required|in:amazon,local,wasabi,cloudinary',

                'enable_video_upload' => 'boolean',

                'enable_audio_upload' => 'boolean',

                'enable_documents_upload' => 'boolean',

                'enable_attachments_custom_offers' => 'boolean',

                'max_images_per_gig' => 'required|integer',

                'max_documents_per_gig' => 'required|integer',

                'max_images_per_portfolio' => 'required|integer',

                'max_files_per_custom_offer' => 'required|integer',

                'max_single_image_size' => 'required|integer',

                'max_single_document_size' => 'required|integer',

                'max_single_portfolio_image_size' => 'required|integer',

                'max_single_offer_file_size' => 'required|integer',

                'offer_attachments_allowed_extensions' => 'required',

                'requirements_max_file_size' => 'required|integer',

                'requirements_allowed_extensions' => 'required',

                'delivered_work_max_file_size' => 'required|integer',

                'delivered_work_allowed_extensions' => 'required',

                'restrictions_max_files' => 'required|integer',

                'restrictions_max_size' => 'required|integer',

                'restrictions_allowed_extensions' => 'required',

            ];

            // Set errors messages

            $messages = [

                'default_storage_driver.required' => __('messages.t_validator_required'),

                'default_storage_driver.in' => __('messages.t_validator_in'),

                'enable_video_upload.boolean' => __('messages.t_validator_boolean'),

                'enable_audio_upload.boolean' => __('messages.t_validator_boolean'),

                'enable_documents_upload.boolean' => __('messages.t_validator_boolean'),

                'enable_attachments_custom_offers.boolean' => __('messages.t_validator_boolean'),

                'max_images_per_gig.required' => __('messages.t_validator_required'),

                'max_images_per_gig.integer' => __('messages.t_validator_integer'),

                'max_documents_per_gig.required' => __('messages.t_validator_required'),

                'max_documents_per_gig.integer' => __('messages.t_validator_integer'),

                'max_images_per_portfolio.required' => __('messages.t_validator_required'),

                'max_images_per_portfolio.integer' => __('messages.t_validator_integer'),

                'max_files_per_custom_offer.required' => __('messages.t_validator_required'),

                'max_files_per_custom_offer.integer' => __('messages.t_validator_integer'),

                'max_single_image_size.required' => __('messages.t_validator_required'),

                'max_single_image_size.integer' => __('messages.t_validator_integer'),

                'max_single_document_size.required' => __('messages.t_validator_required'),

                'max_single_document_size.integer' => __('messages.t_validator_integer'),

                'max_single_portfolio_image_size.required' => __('messages.t_validator_required'),

                'max_single_portfolio_image_size.integer' => __('messages.t_validator_integer'),

                'max_single_offer_file_size.required' => __('messages.t_validator_required'),

                'max_single_offer_file_size.integer' => __('messages.t_validator_integer'),

                'offer_attachments_allowed_extensions.required' => __('messages.t_validator_required'),

                'requirements_max_file_size.required' => __('messages.t_validator_required'),

                'requirements_max_file_size.integer' => __('messages.t_validator_integer'),

                'requirements_allowed_extensions.required' => __('messages.t_validator_required'),

                'delivered_work_max_file_size.required' => __('messages.t_validator_required'),

                'delivered_work_max_file_size.integer' => __('messages.t_validator_integer'),

                'delivered_work_allowed_extensions.required' => __('messages.t_validator_required'),

                'restrictions_max_files.required' => __('messages.t_validator_required'),

                'restrictions_max_files.integer' => __('messages.t_validator_integer'),

                'restrictions_max_size.required' => __('messages.t_validator_required'),

                'restrictions_max_size.integer' => __('messages.t_validator_integer'),

                'restrictions_allowed_extensions.required' => __('messages.t_validator_required'),

            ];

            // Set data to validate

            $data = [

                'default_storage_driver' => $request->default_storage_driver,

                'enable_video_upload' => $request->enable_video_upload,

                'enable_audio_upload' => $request->enable_audio_upload,

                'enable_documents_upload' => $request->enable_documents_upload,

                'enable_attachments_custom_offers' => $request->enable_attachments_custom_offers,

                'max_images_per_gig' => $request->max_images_per_gig,

                'max_documents_per_gig' => $request->max_documents_per_gig,

                'max_images_per_portfolio' => $request->max_images_per_portfolio,

                'max_files_per_custom_offer' => $request->max_files_per_custom_offer,

                'max_single_image_size' => $request->max_single_image_size,

                'max_single_document_size' => $request->max_single_document_size,

                'max_single_portfolio_image_size' => $request->max_single_portfolio_image_size,

                'max_single_offer_file_size' => $request->max_single_offer_file_size,

                'offer_attachments_allowed_extensions' => $request->offer_attachments_allowed_extensions,

                'requirements_max_file_size' => $request->requirements_max_file_size,

                'requirements_allowed_extensions' => $request->requirements_allowed_extensions,

                'delivered_work_max_file_size' => $request->delivered_work_max_file_size,

                'delivered_work_allowed_extensions' => $request->delivered_work_allowed_extensions,

                'restrictions_max_files' => $request->restrictions_max_files,

                'restrictions_max_size' => $request->restrictions_max_size,

                'restrictions_allowed_extensions' => $request->restrictions_allowed_extensions,

            ];

            // Validate data

            Validator::make($data, $rules, $messages)->validate();

            // Reset validation

            $request->resetValidation();

        } catch (\Throwable $th) {

            throw $th;
        }

    }

}
