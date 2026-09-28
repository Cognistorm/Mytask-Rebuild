<?php

namespace App\Models;

use App\Enums\BillingPeriodEnum;
use Laravelcm\Subscriptions\Models\Plan as BasePlan;

class Plan extends BasePlan
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'slug',
        'name',
        'description',
        'features_included',
        'features_excluded',
        'is_active',
        'price',
        'yearly_price',
        'signup_fee',
        'currency',
        'invoice_period',
        'sort_order',
    ];

    /**
     * The attributes that are translatable.
     *
     * @var array
     */
    public $translatable = [
        'name',
        'description',
        'features_included',
        'features_excluded',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price' => 'float',
        'yearly_price' => 'float',
        'signup_fee' => 'float',
        'deleted_at' => 'datetime',
    ];

    public function hasYearlyPrice(): bool
    {
        return $this->yearly_price !== null && $this->yearly_price > 0;
    }

    public function priceFor(BillingPeriodEnum $billingPeriod): float
    {
        return match ($billingPeriod) {
            BillingPeriodEnum::Yearly => $this->hasYearlyPrice() ? $this->yearly_price : $this->price * 12,
            BillingPeriodEnum::Monthly => $this->price,
        };
    }
}
