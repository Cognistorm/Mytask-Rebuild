<?php

namespace App\Http\Validators\Admin\Settings;

use Illuminate\Support\Facades\Validator;

class PublishValidator
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

                'auto_approve_gigs' => 'boolean',

                'auto_approve_portfolio' => 'boolean',

                'enable_custom_offers' => 'boolean',

                'custom_offers_require_approval' => 'boolean',

                'custom_offers_expiry_days' => 'required|integer',

                'max_tags' => 'required|integer',

            ];

            // Set errors messages

            $messages = [

                'auto_approve_gigs.boolean' => __('messages.t_validator_boolean'),

                'auto_approve_portfolio.boolean' => __('messages.t_validator_boolean'),

                'enable_custom_offers.boolean' => __('messages.t_validator_boolean'),

                'custom_offers_expiry_days.required' => __('messages.t_validator_required'),

                'custom_offers_expiry_days.integer' => __('messages.t_validator_integer'),

                'custom_offers_require_approval.boolean' => __('messages.t_validator_boolean'),

                'max_tags.required' => __('messages.t_validator_required'),

                'max_tags.integer' => __('messages.t_validator_integer'),

            ];

            // Set data to validate

            $data = [

                'auto_approve_gigs' => $request->auto_approve_gigs,

                'auto_approve_portfolio' => $request->auto_approve_portfolio,

                'enable_custom_offers' => $request->enable_custom_offers,

                'custom_offers_require_approval' => $request->custom_offers_require_approval,

                'custom_offers_expiry_days' => $request->custom_offers_expiry_days,

                'max_tags' => $request->max_tags,

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
