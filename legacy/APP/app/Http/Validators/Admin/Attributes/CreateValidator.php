<?php

namespace App\Http\Validators\Admin\Attributes;

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

                $rules['hint.'.$lang->language_code] = 'nullable|max:100';

            }

            // Set rules for the rest fields

            $rules['category_id'] = 'required|exists:categories,id';

            $rules['subcategory_id'] = 'nullable|exists:subcategories,id';

            $rules['childcategory_id'] = 'nullable|exists:childcategories,id';

            $rules['type'] = 'required|in:select,checkbox';

            $rules['is_required'] = 'boolean';

            $rules['is_checked'] = 'boolean';

            $rules['is_disabled'] = 'boolean';

            $rules['options'] = 'required_if:type,select|array';

            $rules['options.*.text'] = 'required_if:type,select|max:100';

            $rules['options.*.value'] = 'required_if:type,select|max:100|alpha_dash:ascii';

            // Set errors messages

            $messages = [

                'name.*.required' => __('messages.t_validator_required'),

                'name.*.max' => __('messages.t_validator_max', ['max' => 100]),

                'hint.*.max' => __('messages.t_validator_max', ['max' => 100]),

                'category_id.required' => __('messages.t_validator_required'),

                'category_id.exists' => __('messages.t_validator_exists'),

                'subcategory_id.exists' => __('messages.t_validator_exists'),

                'childcategory_id.exists' => __('messages.t_validator_exists'),

                'type.required' => __('messages.t_validator_required'),

                'type.in' => __('messages.t_validator_in'),

                'is_required.boolean' => __('messages.t_validator_boolean'),

                'is_checked.boolean' => __('messages.t_validator_boolean'),

                'is_disabled.boolean' => __('messages.t_validator_boolean'),

                'options.required_if' => __('messages.t_validator_required'),

                'options.array' => __('messages.t_validator_array'),

                'options.*.text.required_if' => __('messages.t_validator_required'),

                'options.*.text.max' => __('messages.t_validator_max', ['max' => 100]),

                'options.*.value.required_if' => __('messages.t_validator_required'),

                'options.*.value.max' => __('messages.t_validator_max', ['max' => 100]),

                'options.*.value.alpha_dash' => __('messages.t_validator_alpha_dash'),

            ];

            // Set data to validate

            $data = [

                'name' => $request->name,

                'hint' => $request->hint,

                'category_id' => $request->category_id,

                'subcategory_id' => $request->subcategory_id,

                'childcategory_id' => $request->childcategory_id,

                'type' => $request->type,

                'is_required' => $request->is_required,

                'is_checked' => $request->is_checked,

                'is_disabled' => $request->is_disabled,

                'options' => $request->options,

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
