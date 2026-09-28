<?php

namespace App\Http\Validators\Admin\Blog;

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

                'content' => 'required|max:500',

                'status' => 'required|in:active,pending,hidden',

            ];

            // Set errors messages

            $messages = [

                'content.required' => __('messages.t_validator_required'),

                'content.max' => __('messages.t_validator_max', ['max' => 500]),

                'status.required' => __('messages.t_validator_required'),

                'status.in' => __('messages.t_validator_in'),

            ];

            // Set data to validate

            $data = [

                'content' => $request->content,

                'status' => $request->status,

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
