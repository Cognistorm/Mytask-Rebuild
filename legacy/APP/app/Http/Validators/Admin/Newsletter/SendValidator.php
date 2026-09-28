<?php

namespace App\Http\Validators\Admin\Newsletter;

use Illuminate\Support\Facades\Validator;

class SendValidator
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

                'subject' => 'required|max:160',

            ];

            // Set errors messages

            $messages = [

                'subject.required' => __('messages.t_validator_required'),

                'subject.max' => __('messages.t_validator_max', ['max' => 160]),

            ];

            // Set data to validate

            $data = [

                'subject' => $request->subject,

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
