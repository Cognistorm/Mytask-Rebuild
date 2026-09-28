<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;

class Recaptcha implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        try {

            // Check if recaptcha enabled
            if (settings('security')->is_recaptcha) {

                // Get recaptcha secret key
                $secret = config('recaptcha.secret_key');

                // Send a request
                $response = Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secret,
                    'response' => $value,
                    'ip' => request()->ip(),
                ]);

                // Check response
                if ($response->successful() && $response->json('success') && $response->json('score') > .5) {
                } else {

                    // Failed
                    $fail('messages.t_validator_recaptcha')->translate();

                }

            }

        } catch (\Throwable $th) {

            // Failed
            $fail('messages.t_validator_recaptcha')->translate();

        }
    }
}
