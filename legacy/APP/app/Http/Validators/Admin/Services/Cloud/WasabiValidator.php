<?php

namespace App\Http\Validators\Admin\Services\Cloud;

use Illuminate\Support\Facades\Validator;

class WasabiValidator
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

                'key' => 'required',

                'secret' => 'required',

                'region' => 'required',

                'bucket' => 'required',

            ];

            // Set errors messages

            $messages = [

                'key.required' => __('messages.t_validator_required'),

                'secret.required' => __('messages.t_validator_required'),

                'region.required' => __('messages.t_validator_required'),

                'bucket.required' => __('messages.t_validator_required'),

            ];

            // Set data to validate

            $data = [

                'key' => $request->key,

                'secret' => $request->secret,

                'region' => $request->region,

                'bucket' => $request->bucket,

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
