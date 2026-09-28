<?php

namespace App\Http\Validators\Admin\Settings;

use Illuminate\Support\Facades\Validator;

class FooterValidator
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

                'is_language_switcher' => 'boolean',

                'page_terms' => 'required|exists:pages,id',

                'page_policy' => 'required|exists:pages,id',

                'logo' => 'nullable|image|mimes:jpg,jpeg,png,gif,svg',

                'logo_dark' => 'nullable|image|mimes:jpg,jpeg,png,gif,svg',

                'copyrights' => 'nullable|max:750',

                'social_facebook' => 'nullable|max:160',

                'social_twitter' => 'nullable|max:160',

                'social_instagram' => 'nullable|max:160',

                'social_linkedin' => 'nullable|max:160',

                'social_pinterest' => 'nullable|max:160',

                'social_youtube' => 'nullable|max:160',

                'social_github' => 'nullable|max:160',

                'social_wechat' => 'nullable|max:160',

                'social_tiktok' => 'nullable|max:160',

                'social_snapchat' => 'nullable|max:160',

                'social_whatsapp' => 'nullable|max:160',

                'social_sinaweibo' => 'nullable|max:160',

                'social_telegram' => 'nullable|max:160',

                'social_vk' => 'nullable|max:160',

            ];

            // Set errors messages

            $messages = [

                'is_language_switcher.boolean' => __('messages.t_validator_boolean'),

                'page_terms.required' => __('messages.t_validator_required'),

                'page_terms.exists' => __('messages.t_validator_exists'),

                'page_policy.required' => __('messages.t_validator_required'),

                'page_policy.exists' => __('messages.t_validator_exists'),

                'logo.image' => __('messages.t_validator_image'),

                'logo.mimes' => __('messages.t_validator_mimes'),

                'logo_dark.image' => __('messages.t_validator_image'),

                'logo_dark.mimes' => __('messages.t_validator_mimes'),

                'copyrights.max' => __('messages.t_validator_max', ['max' => 750]),

                'social_facebook.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_twitter.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_instagram.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_linkedin.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_pinterest.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_youtube.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_github.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_wechat.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_tiktok.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_snapchat.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_whatsapp.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_sinaweibo.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_telegram.max' => __('messages.t_validator_max', ['max' => 160]),

                'social_vk.max' => __('messages.t_validator_max', ['max' => 160]),

            ];

            // Set data to validate

            $data = [

                'is_language_switcher' => $request->is_language_switcher,

                'page_terms' => $request->page_terms,

                'page_policy' => $request->page_policy,

                'logo' => $request->logo,

                'logo_dark' => $request->logo_dark,

                'copyrights' => $request->copyrights,

                'social_facebook' => $request->social_facebook,

                'social_twitter' => $request->social_twitter,

                'social_instagram' => $request->social_instagram,

                'social_linkedin' => $request->social_linkedin,

                'social_pinterest' => $request->social_pinterest,

                'social_youtube' => $request->social_youtube,

                'social_github' => $request->social_github,

                'social_wechat' => $request->social_wechat,

                'social_tiktok' => $request->social_tiktok,

                'social_snapchat' => $request->social_snapchat,

                'social_whatsapp' => $request->social_whatsapp,

                'social_sinaweibo' => $request->social_sinaweibo,

                'social_telegram' => $request->social_telegram,

                'social_vk' => $request->social_vk,

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
