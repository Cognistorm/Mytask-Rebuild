<?php

namespace App\Enums;

enum SubscriptionEnum: int
{
    case STANDARD = 1;
    case PREMIUM = 2;

    public function slug(): string
    {
        return match($this) {
            self::STANDARD => 'standard',
            self::PREMIUM => 'premium',
        };
    }

    /**
     * Get the label for the enum value
     */
    public function label(): string
    {
        return match($this) {
            self::STANDARD => 'Free',
            self::PREMIUM => 'Premium',
        };
    }
}
