<?php

namespace App\Enums;

enum ReferralStatus: string
{
    case PENDING = 'pending';
    case VERIFIED = 'verified';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match($this) {
            self::PENDING => __('messages.t_pending'),
            self::VERIFIED => __('messages.t_verified'),
            self::CANCELLED => __('messages.t_cancelled'),
        };
    }

    public function color(): string
    {
        return match($this) {
            self::PENDING => 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
            self::VERIFIED => 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            self::CANCELLED => 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        };
    }
}
