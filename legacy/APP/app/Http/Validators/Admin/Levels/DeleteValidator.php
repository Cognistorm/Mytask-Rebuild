<?php

namespace App\Http\Validators\Admin\Levels;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class DeleteValidator
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

                'new_level' => ['required', Rule::exists('levels', 'id')->where('id', '!=', $request->level->id)],

                'default_buyer_level' => ['nullable', Rule::exists('levels', 'id')->where('id', '!=', $request->level->id)->where('account_type', 'buyer')],

                'default_seller_level' => ['nullable', Rule::exists('levels', 'id')->where('id', '!=', $request->level->id)->where('account_type', 'seller')],

            ];

            // Set errors messages

            $messages = [

                'new_level.required' => __('messages.t_validator_required'),

                'default_buyer_level.exists' => __('messages.t_validator_exists'),

                'default_seller_level.exists' => __('messages.t_validator_exists'),

            ];

            // Set data to validate

            $data = [

                'new_level' => $request->new_level,

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
