<?php

namespace App\Http\Validators\Admin\Support;

use Illuminate\Support\Facades\Validator;

class ReplyValidator
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

                'reply' => 'required',

            ];

            // Set errors messages

            $messages = [

                'subject.required' => __('messages.t_validator_required'),

                'subject.max' => __('messages.t_validator_max', ['max' => 160]),

                'reply.required' => __('messages.t_validator_required'),

            ];

            // Set data to validate

            $data = [

                'subject' => $request->subject,

                'reply' => $request->reply,

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
