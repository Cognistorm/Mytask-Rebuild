<?php

namespace App\Enums;

enum ReferralEventType: string
{
    case SIGNUP = 'signup';

    public function label(): string
    {
        return match($this) {
            self::SIGNUP => 'Sign Up Bonus',
        };
    }

    public function points(): int
    {
        return match($this) {
            self::SIGNUP => 10,
        };
    }

    public function description(): string
    {
        return match($this) {
            self::SIGNUP => 'Referral signup bonus',
        };
    }
}