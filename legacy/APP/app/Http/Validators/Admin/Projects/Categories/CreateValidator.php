<?php

namespace App\Http\Validators\Admin\Projects\Categories;

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

            $rules = [];

            // Get supported languages

            $supported_languages = supported_languages();

            // Loop through supported languages

            foreach ($supported_languages as $lang) {

                // Set rule

                $rules['name.'.$lang->language_code] = 'required|max:60';

            }

            $rulesMain = [

                'slug' => 'required|max:160|unique:projects_categories,slug|regex:/^[a-zA-Z0-9-_]+$/',

                'seo_description' => 'nullable|max:300',

                'thumbnail' => 'nullable|image|mimes:jpg,png,jpeg',

                'ogimage' => 'nullable|image|mimes:jpg,png,jpeg',

            ];

            $rules = array_merge($rules, $rulesMain);

            // Set errors messages

            $messages = [

                'name.*.required' => __('messages.t_validator_required'),

                'name.*.max' => __('messages.t_validator_max', ['max' => 60]),

                'slug.required' => __('messages.t_validator_required'),

                'slug.max' => __('messages.t_validator_max', ['max' => 160]),

                'slug.unique' => __('messages.t_validator_unique'),

                'slug.regex' => __('messages.t_validator_regex'),

                'seo_description.max' => __('messages.t_validator_max', ['max' => 300]),

                'thumbnail.image' => __('messages.t_validator_image'),

                'thumbnail.mimes' => __('messages.t_validator_image'),

                'ogimage.image' => __('messages.t_validator_image'),

                'ogimage.mimes' => __('messages.t_validator_image'),

            ];

            // Set data to validate

            $data = [

                'name' => $request->name,

                'slug' => $request->slug,

                'seo_description' => $request->seo_description,

                'thumbnail' => $request->thumbnail,

                'ogimage' => $request->ogimage,

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
