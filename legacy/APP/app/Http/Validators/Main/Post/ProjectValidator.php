<?php

namespace App\Http\Validators\Main\Post;

use Illuminate\Support\Facades\Validator;

class ProjectValidator
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

            // Get publish settings

            $settings = settings('publish');

            // Get maximum image size

            $max_image_size = $settings->max_image_size * 1024;

            // Set rules

            $rules = [

                'title' => 'nullable|array|min:1',

                'title.en' => 'nullable|string|min:3|max:100|regex:/^[a-zA-Z0-9\s\-_.,!?()]+$/',

                'title.ka' => 'required|string|min:3|max:100|regex:/^[ა-ჰ0-9\s\-_.,!?()]+$/u',

                'description.en' => 'nullable|string|min:10|regex:/^[a-zA-Z0-9\s\-_.,!?()\n\r]+$/',

                'description.ka' => 'required|string|min:10|regex:/^[ა-ჰ0-9\s\-_.,!?()\n\r]+$/u',

                'thumbnail' => "required|image|mimes:jpg,jpeg,png,PNG,JPEG|max:$max_image_size",

                'description' => 'required|array|min:1',

                'category' => 'required|exists:projects_categories,id',

                'salary_type' => 'required|in:hourly,fixed',

                'min_price' => ['required', 'regex:/^([1-9][0-9]*|0)(\.[0-9]{1,2})?$/'],

                'max_price' => ['required', 'regex:/^([1-9][0-9]*|0)(\.[0-9]{1,2})?$/'],

            ];

            $messages = [
                'title.ka.required' => __('messages.t_validator_required'),
                'title.en.min' => __('messages.t_validator_min', ['min' => 3]),
                'title.ka.min' => __('messages.t_validator_min', ['min' => 3]),
                'title.en.max' => __('messages.t_validator_max', ['max' => 100]),
                'title.ka.max' => __('messages.t_validator_max', ['max' => 100]),
                'title.en.regex' => __('messages.t_validator_english_only'),
                'title.ka.regex' => __('messages.t_validator_georgian_only'),
                'description.en.min' => __('messages.t_validator_min', ['min' => 10]),
                'description.ka.min' => __('messages.t_validator_min', ['min' => 10]),
                'description.en.regex' => __('messages.t_validator_english_only'),
                'description.ka.regex' => __('messages.t_validator_georgian_only'),
                'title.required' => __('messages.t_validator_required'),
                'thumbnail.required' => __('messages.t_validator_required'),
                'thumbnail.image' =>  __('messages.t_validator_image'),
                'thumbnail.mimes' => __('messages.t_validator_mimes'),
                'thumbnail.max' => __('messages.t_validator_max_size', ['max' => $max_image_size]),
                'title.max' => __('messages.t_validator_max', ['max' => 100]),
                'description.en.required' => __('messages.t_validator_required'),
                'description.ka.required' => __('messages.t_validator_required'),
                'category.required' => __('messages.t_validator_required'),
                'category.exists' => __('messages.t_validator_exists'),
                'subcategory.required' => __('messages.t_validator_required'),
                'subcategory.exists' => __('messages.t_validator_exists'),
                'salary_type.required' => __('messages.t_validator_required'),
                'salary_type.in' => __('messages.t_validator_in'),
                'min_price.required' => __('messages.t_validator_required'),
                'min_price.regex' => __('messages.t_validator_regex'),
                'max_price.required' => __('messages.t_validator_required'),
                'max_price.regex' => __('messages.t_validator_regex'),

            ];

            $data = [
                'title' => $request->title,
                'description' => $request->description,
                'thumbnail' => $request->thumbnail,
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
            logger($th->getMessage());
            throw $th;
        }

    }

}
