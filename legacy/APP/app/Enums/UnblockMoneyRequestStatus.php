<?php

namespace App\Enums;

enum UnblockMoneyRequestStatus: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case CLOSED = 'closed';

    /**
     * Get the label for the enum value
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING => __('messages.t_pending_status'),
            self::APPROVED => __('messages.t_approved_status'),
            self::REJECTED => __('messages.t_rejected_status'),
            self::CLOSED => __('messages.t_closed_status'),
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::PENDING  => 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
            self::APPROVED => 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
            self::REJECTED => 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
            self::CLOSED   => 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        };
    }
}
