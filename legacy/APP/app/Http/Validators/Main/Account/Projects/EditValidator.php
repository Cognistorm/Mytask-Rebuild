<?php

namespace App\Http\Validators\Main\Account\Projects;

use Illuminate\Support\Facades\Validator;

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
            $settings = settings('publish');

            $max_image_size = $settings->max_image_size * 1024;

            $rules = [

                'title' => 'required|array|min:1',

                'thumbnail' => "nullable|image|mimes:jpg,jpeg,png,PNG,JPEG|max:$max_image_size",

                'description' => 'required|array|min:1',

                'category' => 'required|exists:projects_categories,id',

                'salary_type' => 'required|in:hourly,fixed',

                'min_price' => ['required', 'regex:/^([1-9][0-9]*|0)(\.[0-9]{1,2})?$/'],

                'max_price' => ['required', 'regex:/^([1-9][0-9]*|0)(\.[0-9]{1,2})?$/'],

            ];

            // Add validation rules for each supported language in title and description
            foreach (supported_languages() as $language) {
                $langCode = $language->language_code;
                // Only validate languages that are present in the request
                if (isset($request->title[$langCode])) {
                    $rules["title.{$langCode}"] = 'required|string|max:100';
                }
                if (isset($request->description[$langCode])) {
                    $rules["description.{$langCode}"] = 'required|string';
                }
            }

            // Set errors messages

            $messages = [

                'title.required' => __('messages.t_validator_required'),

                'thumbnail.required' => __('messages.t_validator_required'),

                'thumbnail.image' =>  __('messages.t_validator_image'),

                'thumbnail.mimes' => __('messages.t_validator_mimes'),

                'thumbnail.max' => __('messages.t_validator_max_size', ['max' => $max_image_size]),

                'description.required' => __('messages.t_validator_required'),

                'category.required' => __('messages.t_validator_required'),

                'category.exists' => __('messages.t_validator_exists'),

                'salary_type.required' => __('messages.t_validator_required'),

                'salary_type.in' => __('messages.t_validator_in'),

                'min_price.required' => __('messages.t_validator_required'),

                'min_price.regex' => __('messages.t_validator_regex'),

                'max_price.required' => __('messages.t_validator_required'),

                'max_price.regex' => __('messages.t_validator_regex'),

            ];

            // Set data to validate

            $data = [

                'title' => $request->title,

                'description' => $request->description,

                'category' => $request->category,

                'salary_type' => $request->salary_type,

                'min_price' => $request->min_price,

                'max_price' => $request->max_price,

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
