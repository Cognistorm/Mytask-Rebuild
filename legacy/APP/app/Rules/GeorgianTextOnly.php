<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class GeorgianTextOnly implements Rule
{
    public function passes($attribute, $value)
    {
        $cleanText = strip_tags($value);
        $cleanText = html_entity_decode($cleanText, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cleanText = preg_replace('/[\x{00A0}\x{200B}\x{FEFF}]/u', ' ', $cleanText);
        $cleanText = trim($cleanText);

        if (empty($cleanText)) {
            return false;
        }

        if (!preg_match('/[ა-ჰ]/u', $cleanText)) {
            return false;
        }

        return !preg_match('/[a-zA-Z]/u', $cleanText);
    }

    public function message()
    {
        return __('messages.t_validator_georgian_only');
    }
}
