<?php

namespace App\Http\Validators\Admin\Subcategories;

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

                $rules['name.'.$lang->language_code] = 'required|max:60';

            }

            // Set rules for the rest fields

            $rules['slug'] = 'required|max:60|unique:subcategories,slug';

            $rules['description'] = 'nullable|max:300';

            $rules['icon'] = 'nullable|image|mimes:jpg,jpeg,png';

            $rules['image'] = 'nullable|image|mimes:jpg,jpeg,png';

            $rules['parent_id'] = 'required|exists:categories,id';

            // Set errors messages

            $messages = [

                'name.*.required' => __('messages.t_validator_required'),

                'name.*.max' => __('messages.t_validator_max', ['max' => 60]),

                'slug.required' => __('messages.t_validator_required'),

                'slug.max' => __('messages.t_validator_max', ['max' => 60]),

                'slug.unique' => __('messages.t_validator_unique'),

                'description.required' => __('messages.t_validator_required'),

                'description.max' => __('messages.t_validator_max', ['max' => 350]),

                'icon.image' => __('messages.t_validator_image'),

                'icon.mimes' => __('messages.t_validator_mimes'),

                'image.image' => __('messages.t_validator_image'),

                'image.mimes' => __('messages.t_validator_mimes'),

                'parent_id.required' => __('messages.t_validator_required'),

                'parent_id.exists' => __('messages.t_validator_exists'),

            ];

            // Set data to validate

            $data = [

                'name' => $request->name,

                'slug' => $request->slug,

                'description' => $request->description,

                'icon' => $request->icon,

                'image' => $request->image,

                'parent_id' => $request->parent_id,

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
