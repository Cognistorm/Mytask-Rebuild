<?php

namespace App\Enums;

enum ProjectMilestoneStatus: string
{
    case FUNDED = 'funded';
    case PAID = 'paid';
    case REQUEST = 'request';
    case DRAFT = 'draft';
    case REFUNDED = 'refunded';

    /**
     * Get the label for the enum value
     */
    public function label(): string
    {
        return match($this) {
            self::FUNDED => 'Funded',
            self::PAID => 'Paid',
            self::REQUEST => 'Request',
            self::DRAFT => 'Draft',
            self::REFUNDED => 'Refunded',
        };
    }
}
