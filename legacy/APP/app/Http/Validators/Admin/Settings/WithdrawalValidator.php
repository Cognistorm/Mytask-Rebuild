<?php

namespace App\Http\Validators\Admin\Settings;

use Illuminate\Support\Facades\Validator;

class WithdrawalValidator
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

                'is_offline_method' => 'boolean',

                'is_paypal_method' => 'boolean',

                'min_withdrawal_amount' => 'required|integer',

                'withdrawal_period' => 'required|in:daily,weekly,monthly',

            ];

            // Set errors messages

            $messages = [

                'is_offline_method.boolean' => __('messages.t_validator_boolean'),

                'is_paypal_method.boolean' => __('messages.t_validator_boolean'),

                'min_withdrawal_amount.required' => __('messages.t_validator_required'),

                'min_withdrawal_amount.integer' => __('messages.t_validator_integer'),

                'withdrawal_period.required' => __('messages.t_validator_required'),

                'withdrawal_period.in' => __('messages.t_validator_in'),

            ];

            // Set data to validate

            $data = [

                'is_offline_method' => $request->is_offline_method,

                'is_paypal_method' => $request->is_paypal_method,

                'min_withdrawal_amount' => $request->min_withdrawal_amount,

                'withdrawal_period' => $request->withdrawal_period,

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
