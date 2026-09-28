<?php

namespace App\Http\Validators\Admin\Services\Cloud;

use Illuminate\Support\Facades\Validator;

class CloudinaryValidator
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

                'cloud_url' => 'required',

                'upload_preset' => 'required',

            ];

            // Set errors messages

            $messages = [

                'cloud_url.required' => __('messages.t_validator_required'),

                'upload_preset.required' => __('messages.t_validator_required'),

            ];

            // Set data to validate

            $data = [

                'cloud_url' => $request->cloud_url,

                'upload_preset' => $request->upload_preset,

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
