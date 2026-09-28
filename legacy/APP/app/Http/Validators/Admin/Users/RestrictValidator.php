<?php

namespace App\Http\Validators\Admin\Users;

use Illuminate\Support\Facades\Validator;

class RestrictValidator
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

                'message' => 'required',

                'files_required' => 'required|boolean',

            ];

            // Set errors messages

            $messages = [

                'message.required' => __('messages.t_validator_required'),

                'files_required.required' => __('messages.t_validator_required'),

                'files_required.boolean' => __('messages.t_validator_boolean'),

            ];

            // Set data to validate

            $data = [

                'message' => $request->message,

                'files_required' => $request->files_required,

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
