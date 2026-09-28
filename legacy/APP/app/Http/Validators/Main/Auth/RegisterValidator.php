<?php

namespace App\Http\Validators\Main\Auth;

use App\Rules\Recaptcha;
use App\Rules\UsernameRule;
use Illuminate\Support\Facades\Validator;

class RegisterValidator
{
    /**
     * Validate form
     *
     * @param object $request
     * @return void
     */
    static function validate($request)
    {
        try {
            // Set rules
            $rules = [
                'username'        => ['required', 'max:60', 'min:3', 'unique:users', new UsernameRule()],
                'email'           => 'required|max:60|email:rfc,dns|unique:users',
                'password'        => 'required|max:60|min:8|regex:/^(?=.*[A-Z])(?=.*\d)/',
                'fullname'        => 'required|max:60|min:3',
                'referral_code'   => 'nullable|exists:users,referral_code',
                'agree_terms'     => 'required|accepted',
                'recaptcha_token' => [new Recaptcha()]
            ];

            // Set errors messages
            $messages = [
                'recaptcha_token.required' => 'invalid recaptcha',
                'username.required' => __('messages.t_validator_required'),
                'username.max'      => __('messages.t_validator_max', ['max' => 60]),
                'username.min'      => __('messages.t_validator_min', ['min' => 3]),
                'username.unique'   => __('messages.t_validator_unique'),
                'email.required'    => __('messages.t_validator_required'),
                'email.max'         => __('messages.t_validator_max', ['max' => 60]),
                'email.email'       => __('messages.t_validator_email'),
                'email.unique'      => __('messages.t_validator_unique'),
                'password.required' => __('messages.t_validator_required'),
                'password.max'      => __('messages.t_validator_max', ['max' => 60]),
                'password.min'      => __('messages.t_validator_min', ['min' => 8]),
                'password.regex'    => __('messages.t_password_validation_message'),
                'fullname.required' => __('messages.t_validator_required'),
                'fullname.max'      => __('messages.t_validator_max', ['max' => 60]),
                'fullname.min'      => __('messages.t_validator_min', ['min' => 3]),
                'fullname.regex'    => __('messages.t_validator_regex'),
                'referral_code.exists' => __('messages.t_referral_code_invalid'),
                'agree_terms.required' => __('messages.t_you_must_agree_to_terms'),
                'agree_terms.accepted' => __('messages.t_you_must_agree_to_terms'),
            ];

            // Set data to validate
            $data = [
                'email'         => $request->email,
                'username'      => $request->username,
                'password'      => $request->password,
                'fullname'      => $request->fullname,
                'referral_code' => $request->referral_code,
                'agree_terms'   => $request->agree_terms,
                'recaptcha_token' => $request->recaptcha_token,
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
