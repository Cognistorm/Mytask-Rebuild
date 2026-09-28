<?php

namespace App\Http\Validators\Main\Account\Settings;

use App\Rules\UsernameRule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class EditValidator
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

                'username' => ['required', 'max:60', 'min:3', Rule::unique('users')->ignore(auth()->id()), new UsernameRule],

                'email' => ['required', 'email:rfc,dns', 'max:60', 'min:6', Rule::unique('users')->ignore(auth()->id())],

                'fullname' => 'required|max:60',

                'country' => 'nullable|exists:countries,id',

                'password' => 'required|max:60',

                'city' => 'required|max:60',


            ];

            // Set errors messages

            $messages = [

                'username.required' => __('messages.t_validator_required'),

                'username.max' => __('messages.t_validator_max', ['max' => 60]),

                'username.min' => __('messages.t_validator_min', ['min' => 3]),

                'username.unique' => __('messages.t_validator_unique'),

                'email.required' => __('messages.t_validator_required'),

                'email.max' => __('messages.t_validator_max', ['max' => 60]),

                'email.min' => __('messages.t_validator_min', ['min' => 6]),

                'email.email' => __('messages.t_validator_email'),

                'email.unique' => __('messages.t_validator_unique'),

                'fullname.required' =>  __('messages.t_validator_required'),

                'city.required' =>  __('messages.t_validator_required'),

                'password.required' => __('messages.t_validator_required'),

                'fullname.max' => __('messages.t_validator_max', ['max' => 60]),

                'country.exists' => __('messages.t_validator_exists'),

                'password.max' => __('messages.t_validator_max', ['max' => 60]),

                'city.max' => __('messages.t_validator_max', ['max' => 60]),


            ];

            // Set data to validate

            $data = [

                'email' => $request->email,

                'username' => $request->username,

                'fullname' => $request->fullname,

                'country' => $request->country,

                'password' => $request->password,

                'city' => $request->city,

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
