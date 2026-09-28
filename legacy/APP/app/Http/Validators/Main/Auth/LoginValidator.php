<?php

namespace App\Http\Validators\Main\Auth;

use App\Rules\Recaptcha;
use Illuminate\Support\Facades\Validator;

class LoginValidator
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

                'email' => 'required|max:60|email',

                'password' => 'required|max:60',

                'recaptcha_token' => new Recaptcha,

            ];

            // Set errors messages

            $messages = [

                'email.required' => __('messages.t_validator_required'),

                'email.email' => __('messages.t_validator_email'),

                'email.max' => __('messages.t_validator_max', ['max' => 60]),

                'password.required' => __('messages.t_validator_required'),

                'password.max' => __('messages.t_validator_max', ['max' => 60]),

            ];

            // Set data to validate

            $data = [

                'email' => $request->email,

                'password' => $request->password,

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
