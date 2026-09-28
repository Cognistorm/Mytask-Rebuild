<?php

namespace App\Enums;

use Carbon\Carbon;

enum BillingPeriodEnum: string
{
    case Monthly = 'month';
    case Yearly = 'year';

    public function label(): string
    {
        return match ($this) {
            self::Monthly => 'Monthly',
            self::Yearly => 'Yearly',
        };
    }

    public function addTo(Carbon $date): Carbon
    {
        return match ($this) {
            self::Monthly => $date->copy()->addMonth(),
            self::Yearly => $date->copy()->addYear(),
        };
    }

    /**
     * @return array<string, string>
     */
    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $period): array => [$period->value => $period->label()])
            ->all();
    }
}
