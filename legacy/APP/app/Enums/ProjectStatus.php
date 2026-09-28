<?php

namespace App\Enums;

enum ProjectStatus: string
{
    case ACTIVE = 'active';
    case PENDING_FINAL_REVIEW = 'pending_final_review';
    case COMPLETED = 'completed';
    case PENDING_PAYMENT = 'pending_payment';
    case REJECTED = 'rejected';
    case PENDING_APPROVAL = 'pending_approval';
    case UNDER_DEVELOPMENT = 'under_development';
    case CLOSED = 'closed';
    case INCOMPLETE = 'incomplete';
    case HIDDEN = 'hidden';

    /**
     * Get the label for the enum value
     */
    public function label(): string
    {
        return match($this) {
            self::ACTIVE => 'Active',
            self::PENDING_FINAL_REVIEW => 'Pending Final Review',
            self::COMPLETED => 'Completed',
            self::PENDING_PAYMENT => 'Pending Payment',
            self::REJECTED => 'Rejected',
            self::PENDING_APPROVAL => 'Pending Approval',
            self::UNDER_DEVELOPMENT => 'Under Development',
            self::CLOSED => 'Closed',
            self::INCOMPLETE => 'Incomplete',
            self::HIDDEN => 'Hidden',
        };
    }
}
