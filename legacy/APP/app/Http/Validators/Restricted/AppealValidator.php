<?php

namespace App\Http\Validators\Restricted;

use Illuminate\Support\Facades\Validator;

class AppealValidator
{
    /**
     * Validate form

     *

     * @param  object  $request
     * @return void
     */
    public static function validate($request, $files_required)
    {

        try {

            // Set uploading config

            $max_files = settings('media')->restrictions_max_files;

            $max_size = settings('media')->restrictions_max_size;

            $extensions = settings('media')->restrictions_allowed_extensions;

            // Set empty rules array

            $rules = [];

            // Check if files required

            if ($files_required) {

                $rules['files'] = 'required|array|min:1|max:'.$max_files;

                $rules['files.*'] = 'required|file|mimes:'.$extensions.'|max:'.$max_size * 1024;

            }

            // Set rules

            $rules['message'] = 'required|max:1500';

            // Set errors messages

            $messages = [

                'message.required' => __('messages.t_validator_required'),

                'message.max' => __('messages.t_validator_max', ['max' => 1500]),

                'files.required' => __('messages.t_validator_required'),

                'files.array' => __('messages.t_validator_array'),

                'files.min' => __('messages.t_validator_min_array', ['min' => 1]),

                'files.max' => __('messages.t_validator_max_array', ['max' => $max_files]),

                'files.*.required' => __('messages.t_validator_required'),

                'files.*.file' => __('messages.t_validator_file'),

                'files.*.mimes' => __('messages.t_validator_mimes'),

                'files.*.max' => __('messages.t_validator_max_size', ['max' => $max_size]),

            ];

            // Set data to validate

            $data = [

                'message' => $request->message,

                'files' => $request->files,

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
