<?php



namespace App\Http\Validators\Main\Create;



use Illuminate\Support\Facades\Validator;
use App\Rules\EnglishTextOnly;
use App\Rules\GeorgianTextOnly;
use App\Models\Language;


class OverviewValidator

{



    /**

     * Validate all form

     *

     * @param object $request

     * @return void

     */

    static function all($request)

    {

        try {



            // Set rules

            $rules    = [

                'title'           => 'nullable|array',

                'title.en'        => ['nullable', 'string', 'min:3', 'max:100', new EnglishTextOnly],

                'title.ka'        => ['required', 'string', 'min:3', 'max:100', new GeorgianTextOnly],

                'category'        => 'required|exists:categories,id',

                'subcategory'     => 'required|exists:subcategories,id',

                'childcategory'   => 'required|exists:childcategories,id',

                'description'     => 'nullable|array',

                'description.en'  => ['nullable', 'string', 'min:10', new EnglishTextOnly],

                'description.ka'  => ['required', 'string', 'min:10', new GeorgianTextOnly],

                'seo_title'       => 'nullable|max:100',

                'seo_description' => 'nullable|max:150',

            ];



            // Set inputs

            $inputs   = [

                'title'           => $request->title,

                'category'        => $request->category,

                'subcategory'     => $request->subcategory,

                'childcategory'   => $request->childcategory,

                'description'     => $request->description,

                'seo_title'       => $request->seo_title,

                'seo_description' => $request->seo_description,

            ];



            // Set messages

            $messages = [

                'title.required'       => __('messages.t_validator_required'),

                'title.array'          => __('messages.t_validator_array'),

                'title.*.required'     => __('messages.t_validator_required'),

                'title.*.max'          => __('messages.t_validator_max', ['max' => 100]),

                'title.en.required'    => __('messages.t_validator_required'),

                'title.en.min'         => __('messages.t_validator_min', ['min' => 3]),

                'title.en.max'         => __('messages.t_validator_max', ['max' => 100]),

                'title.en.regex'       => __('messages.t_validator_english_only'),

                'title.ka.required'    => __('messages.t_validator_required'),

                'title.ka.min'         => __('messages.t_validator_min', ['min' => 3]),

                'title.ka.max'         => __('messages.t_validator_max', ['max' => 100]),

                'title.ka.regex'       => __('messages.t_validator_georgian_only'),

                'category.required'    => __('messages.t_validator_required'),

                'category.exists'      => __('messages.t_validator_exists'),

                'subcategory.required' => __('messages.t_validator_required'),

                'subcategory.exists'   => __('messages.t_validator_exists'),

                'childcategory.required' => __('messages.t_validator_required'),

                'childcategory.exists'   => __('messages.t_validator_exists'),

                'description.required' => __('messages.t_validator_required'),

                'description.array'    => __('messages.t_validator_array'),

                'description.*.required' => __('messages.t_validator_required'),

                'description.en.required' => __('messages.t_validator_required'),

                'description.en.min'      => __('messages.t_validator_min', ['min' => 10]),

                'description.en.regex'    => __('messages.t_validator_english_only'),

                'description.ka.required' => __('messages.t_validator_required'),

                'description.ka.min'      => __('messages.t_validator_min', ['min' => 10]),

                'description.ka.regex'    => __('messages.t_validator_georgian_only'),

                'seo_title.max'        => __('messages.t_validator_max', ['max' => 100]),

                'seo_description.max'  => __('messages.t_validator_max', ['max' => 150]),

            ];



            // Validate data

            Validator::make($inputs, $rules, $messages)->validate();



            // Reset validation

            $request->resetValidation();



        } catch (\Throwable $th) {

            throw $th;

        }

    }





    /**

     * Validate add faq form

     *

     * @param object $request

     * @return void

     */

    static function faq($request)

    {

        try {



            // Set rules

            $rules    = [

                'question' => 'required|max:100',

                'answer'   => 'required|max:300'

            ];



            // Set inputs

            $inputs   = [

                'question' => $request->question,

                'answer'   => $request->answer

            ];



            // Set messages

            $messages = [

                'answer.required'   => "Answer is required",

                'answer.max'        => "Max 300 characters",

                'question.required' => "Question is required",

                'question.max'      => "Max 100 characters"

            ];



            // Validate data

            Validator::make($inputs, $rules, $messages)->validate();



            // Reset validation

            $request->resetValidation();



        } catch (\Throwable $th) {

            throw $th;

        }

    }



    /**

     * Validate tag

     *

     * @param string $tag

     * @return void

     */

    static function tag($tag)

    {

        try {



            // Set rules

            $rules    = [

                'tag' => 'required|max:20'

            ];



            // Set inputs

            $inputs   = [

                'tag' => $tag,

            ];



            // Set messages

            $messages = [

                'tag.required' => "Tag is required",

                'tag.max'      => "Maximum is 20",

                'tag.regex'    => "Invalid tag",

            ];



            // Validate data

            Validator::make($inputs, $rules, $messages)->validate();



        } catch (\Throwable $th) {

            throw $th;

        }

    }



}
