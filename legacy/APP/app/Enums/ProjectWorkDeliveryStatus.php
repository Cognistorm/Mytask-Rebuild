<?php

namespace App\Enums;

enum ProjectWorkDeliveryStatus: string
{
    case PENDING = 'pending';
    case PROCEEDED = 'proceeded';
    case DELIVERED = 'delivered';
    case COMPLETED = 'completed';

    /**
     * Get the label for the enum value
     */
    public function label(): string
    {
        return match($this) {
            self::PENDING => 'Pending',
            self::PROCEEDED => 'In Progress',
            self::DELIVERED => 'Delivered',
            self::COMPLETED => 'Completed',
        };
    }
}
