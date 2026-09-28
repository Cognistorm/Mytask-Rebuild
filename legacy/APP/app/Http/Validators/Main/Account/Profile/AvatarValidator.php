<?php

namespace App\Http\Validators\Main\Account\Profile;

use Illuminate\Support\Facades\Validator;

class AvatarValidator
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

                'avatar' => 'required|image|mimes:jpeg,jpg,png,webp,gif,bmp,svg|max:2048',

            ];

            // Set errors messages

            $messages = [

                'avatar.required' => __('messages.t_validator_required'),

                'avatar.image' => __('messages.t_validator_image'),

                'avatar.mimes' => __('messages.t_validator_mimes'),

                'avatar.max' => __('messages.t_validator_max_file_size_2mb'),

            ];

            // Set data to validate

            $data = [

                'avatar' => $request->avatar,

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
