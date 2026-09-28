<?php

namespace App\Http\Validators\Main\Blog;

use App\Rules\Recaptcha;
use Illuminate\Support\Facades\Validator;

class CommentValidator
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

                'comment' => 'required|max:1500',

            ];

            // Set errors messages

            $messages = [

                'comment.required' => __('messages.t_validator_required'),

                'comment.max' => __('messages.t_validator_max', ['max' => 1500]),

            ];

            // Set data to validate

            $data = [

                'comment' => $request->comment,

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
