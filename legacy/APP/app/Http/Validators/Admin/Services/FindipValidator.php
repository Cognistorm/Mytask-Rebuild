<?php

namespace App\Http\Validators\Admin\Services;

use Illuminate\Support\Facades\Validator;

class FindipValidator
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

                'key' => 'required|max:32',

            ];

            // Set errors messages

            $messages = [

                'key.required' => __('messages.t_validator_required'),

                'key.max' => __('messages.t_validator_max', ['max' => 32]),

            ];

            // Set data to validate

            $data = [

                'key' => $request->key,

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
