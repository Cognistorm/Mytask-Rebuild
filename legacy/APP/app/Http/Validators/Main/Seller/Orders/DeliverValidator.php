<?php

namespace App\Http\Validators\Main\Seller\Orders;

use Illuminate\Support\Facades\Validator;

class DeliverValidator
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

            $max_size_mb    = 10;
            $max_size_kb    = $max_size_mb * 1024;
            $max_size_bytes = $max_size_mb * 1024 * 1024;

            // Set rules

            $rules = [

                'work' => 'nullable|file|mimes:zip,rar,7z|max:'.$max_size_kb,

                'quick_response' => 'required|max:2500',

            ];

            // Set errors messages

            $messages = [

                'work.file' => __('messages.t_validator_file'),

                'work.mimes' => __('messages.t_validator_mimes'),

                'work.max' => __('messages.t_validator_max_size', ['max' => human_filesize($max_size_bytes)]),

                'quick_response.required' => __('messages.t_validator_required'),

                'quick_response.max' => __('messages.t_validator_max', ['max' => 2500]),

            ];

            // Set data to validate

            $data = [

                'quick_response' => $request->quick_response,

                'work' => $request->work,

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
