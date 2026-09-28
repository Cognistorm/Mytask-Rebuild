<?php

namespace App\Http\Validators\Admin\Blog;

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

                $rules['title.'.$lang->language_code] = 'required|max:100';

            }

            $rules['slug'] = 'required|max:160|unique:blog_articles';

            $rules['image'] = 'required|image|mimes:jpg,jpeg,png,svg,gif';

            $rules['seo_description'] = 'nullable|max:250';

            // Set errors messages

            $messages = [

                'title.*.required' => __('messages.t_validator_required'),

                'title.*.max' => __('messages.t_validator_max', ['max' => 100]),

                'slug.required' => __('messages.t_validator_required'),

                'slug.max' => __('messages.t_validator_max', ['max' => 160]),

                'slug.unique' => __('messages.t_validator_unique'),

                'image.required' => __('messages.t_validator_required'),

                'image.image' => __('messages.t_validator_image'),

                'image.mimes' => __('messages.t_validator_mimes'),

                'seo_description.max' => __('messages.t_validator_max', ['max' => 250]),

            ];

            // Set data to validate

            $data = [

                'title' => $request->title,

                'slug' => $request->slug,

                'content' => $request->content,

                'image' => $request->image,

                'seo_description' => $request->seo_description,

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
