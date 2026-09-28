<?php

namespace App\Http\Validators\Admin\Levels;

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

            // Set empty rules array

            $rules = [];

            // Get supported languages

            $supported_languages = supported_languages();

            // Loop through supported languages

            foreach ($supported_languages as $lang) {

                // Set rule

                $rules['title.'.$lang->language_code] = 'required|max:100';

            }

            // Set rules

            $rules['account_type'] = 'required|in:seller,buyer';

            $rules['order_number'] = 'required|integer';

            $rules['seller_max_sales'] = 'nullable|integer';

            $rules['seller_min_sales'] = 'nullable|integer';

            $rules['buyer_max_purchases'] = 'nullable|integer';

            $rules['buyer_min_purchases'] = 'nullable|integer';

            $rules['text_color'] = 'required|max:10';

            $rules['bg_color'] = 'nullable|max:10';

            $rules['badge'] = 'nullable|image|mimes:jpg,png,jpeg,svg,webp,gif';

            // Set errors messages

            $messages = [

                'title.*.required' => __('messages.t_validator_required'),

                'title.*.max' => __('messages.t_validator_max', ['max' => 60]),

                'account_type.required' => __('messages.t_validator_required'),

                'account_type.in' => __('messages.t_validator_in'),

                'seller_max_sales.integer' => __('messages.t_validator_integer'),

                'seller_min_sales.integer' => __('messages.t_validator_integer'),

                'buyer_max_purchases.integer' => __('messages.t_validator_integer'),

                'buyer_min_purchases.integer' => __('messages.t_validator_integer'),

                'text_color.required' => __('messages.t_validator_required'),

                'text_color.max' => __('messages.t_validator_max', ['max' => 10]),

                'bg_color.max' => __('messages.t_validator_max', ['max' => 10]),

                'badge.image' => __('messages.t_validator_image'),

                'badge.mimes' => __('messages.t_validator_mimes'),

            ];

            // Set data to validate

            $data = [

                'title' => $request->title,

                'account_type' => $request->account_type,

                'seller_max_sales' => $request->seller_max_sales,

                'seller_min_sales' => $request->seller_min_sales,

                'buyer_max_purchases' => $request->buyer_max_purchases,

                'buyer_min_purchases' => $request->buyer_min_purchases,

                'text_color' => $request->text_color,

                'bg_color' => $request->bg_color,

                'badge' => $request->badge,

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
