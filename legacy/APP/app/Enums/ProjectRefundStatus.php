<?php

namespace App\Enums;

enum ProjectRefundStatus: string
{
    case PENDING = 'pending';
    case REJECTED_BY_SELLER = 'rejected_by_seller';
    case ACCEPTED_BY_SELLER = 'accepted_by_seller';
    case REJECTED_BY_ADMIN = 'rejected_by_admin';
    case ACCEPTED_BY_ADMIN = 'accepted_by_admin';
    case CLOSED = 'closed';

    /**
     * Get the label for the enum value
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::REJECTED_BY_SELLER => "Rejected By Seller",
            self::ACCEPTED_BY_SELLER => 'Accepted By Seller',
            self::REJECTED_BY_ADMIN => 'Rejected By Admin',
            self::ACCEPTED_BY_ADMIN => 'Accepted By Admin',
            self::CLOSED => 'Closed',
        };
    }

    /**
     * Get display information for project status based on refund status and conditions
     */
    public static function getProjectStatusDisplay($refund, $hasDeliveredWork = false): array
    {
        if (!$refund) {
            return [
                'text' => '',
                'class' => '',
                'show' => false
            ];
        }

        return match ($refund->status) {
            self::PENDING => [
                'text' => 'messages.t_refund_requested',
                'class' => 'text-orange-600',
                'show' => true
            ],
            self::REJECTED_BY_SELLER => $refund->request_admin_intervention ? [
                'text' => 'messages.t_disputed',
                'class' => 'text-amber-600',
                'show' => true
            ] : ($hasDeliveredWork ? [
                'text' => 'messages.t_delivered',
                'class' => 'text-green-600',
                'show' => false
            ] : [
                'text' => 'messages.t_in_the_process',
                'class' => 'text-amber-600',
                'show' => false
            ]),
            self::REJECTED_BY_ADMIN => [
                'text' => 'messages.t_rejected_by_admin',
                'class' => 'text-red-600 font-bold',
                'show' => true
            ],
            self::ACCEPTED_BY_ADMIN => [
                'text' => 'messages.t_accepted_by_admin',
                'class' => 'text-green-600 font-bold',
                'show' => true
            ],
            default => [
                'text' => '',
                'class' => '',
                'show' => false
            ]
        };
    }

    public static function canRequestRefund($refund): bool
    {
        if (!$refund) {
            return true;
        }

        if($refund->status === self::PENDING){
            return true;
        }

        if (in_array($refund->status, [self::REJECTED_BY_ADMIN, self::ACCEPTED_BY_ADMIN])) {
            return false;
        }

        return $refund->status === self::REJECTED_BY_SELLER && !$refund->request_admin_intervention;
    }

    public static function getRefundTooltip($refund, $hasDeliveredWork = false, $isDeliveryTimeExpired = false): string
    {
        if (!$hasDeliveredWork && !$isDeliveryTimeExpired) {
            return 'messages.t_refund_available_after_delivery_time_expires';
        }

        if ($refund && $refund->status === self::REJECTED_BY_SELLER && $refund->request_admin_intervention) {
            return 'messages.t_admin_intervention_in_progress';
        }

        return 'messages.t_refund_not_available';
    }

    public static function getInfoDisplayForBuyer($refund): array
    {
        if (!$refund) {
            return ['text' => '', 'class' => '', 'show' => false];
        }

        return match ($refund->status) {
            self::PENDING => [
                'text' => 'messages.t_info_refund_request_buyer',
                'class' => 'text-orange-600',
                'show' => true
            ],
            self::REJECTED_BY_SELLER => $refund->request_admin_intervention ? [
                'text' => 'messages.t_info_disputed_buyer',
                'class' => 'text-amber-600 font-bold',
                'show' => true
            ] : [
                'text' => 'messages.t_info_refund_rejected_buyer',
                'class' => 'text-orange-600 font-bold',
                'show' => true
            ],
            self::ACCEPTED_BY_SELLER => [
                'text' => 'messages.t_info_refund_accepted_buyer',
                'class' => 'text-green-600 font-bold',
                'show' => true
            ],
            self::REJECTED_BY_ADMIN => [
                'text' => 'messages.t_info_refund_rejected_by_admin_buyer',
                'class' => 'text-red-600 font-bold',
                'show' => true
            ],
            self::ACCEPTED_BY_ADMIN => [
                'text' => 'messages.t_info_refund_accepted_by_admin_buyer',
                'class' => 'text-green-600 font-bold',
                'show' => true
            ],
            default => ['text' => '', 'class' => '', 'show' => false]
        };
    }

    public static function getInfoDisplayForSeller($refund): array
    {
        if (!$refund) {
            return ['text' => '', 'class' => '', 'show' => false];
        }

        return match ($refund->status) {
            self::PENDING => [
                'text' => 'messages.t_info_refund_request_seller',
                'class' => 'text-orange-600 font-bold',
                'show' => true
            ],
            self::REJECTED_BY_SELLER => $refund->request_admin_intervention ? [
                'text' => 'messages.t_info_disputed_seller',
                'class' => 'text-amber-600 font-bold',
                'show' => true
            ] : [
                'text' => 'messages.t_info_refund_rejected_seller',
                'class' => 'text-orange-600 font-bold',
                'show' => true
            ],
            self::ACCEPTED_BY_SELLER => [
                'text' => 'messages.t_info_refund_accepted_seller',
                'class' => 'text-green-600 font-bold',
                'show' => true
            ],
            self::REJECTED_BY_ADMIN => [
                'text' => 'messages.t_info_refund_rejected_by_admin_seller',
                'class' => 'text-red-600 font-bold',
                'show' => true
            ],
            self::ACCEPTED_BY_ADMIN => [
                'text' => 'messages.t_info_refund_accepted_by_admin_seller',
                'class' => 'text-green-600 font-bold',
                'show' => true
            ],
            default => ['text' => '', 'class' => '', 'show' => false]
        };
    }
}
