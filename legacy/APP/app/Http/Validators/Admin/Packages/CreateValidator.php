<?php

namespace App\Http\Validators\Admin\Packages;

use Illuminate\Support\Facades\Validator;

class CreateValidator
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

            // Set empty rules array

            $rules = [];

            // Get supported languages

            $supported_languages = supported_languages();

            // Loop through supported languages

            foreach ($supported_languages as $lang) {

                // Set rule

                $rules['name.'.$lang->language_code] = 'required|max:100';

                $rules['description.'.$lang->language_code] = 'nullable|max:500';

            }

            // Set rules for the rest fields

            $rules['is_enabled'] = 'boolean';

            $rules['is_primary'] = 'boolean';

            $rules['order_number'] = 'integer|required';

            // Set errors messages

            $messages = [

                'name.*.required' => __('messages.t_validator_required'),

                'name.*.max' => __('messages.t_validator_max', ['max' => 60]),

                'description.*.max' => __('messages.t_validator_max', ['max' => 500]),

                'is_enabled.boolean' => __('messages.t_validator_boolean'),

                'is_primary.boolean' => __('messages.t_validator_boolean'),

                'order_number.required' => __('messages.t_validator_required'),

                'order_number.integer' => __('messages.t_validator_integer'),

            ];

            // Set data to validate

            $data = [

                'name' => $request->name,

                'description' => $request->description,

                'is_enabled' => $request->is_enabled,

                'is_primary' => $request->is_primary,

                'order_number' => $request->order_number,

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
