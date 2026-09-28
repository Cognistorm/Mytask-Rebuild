<?php

namespace App\Models;

use App\Enums\BillingPeriodEnum;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Laravelcm\Subscriptions\Models\Plan;
use Laravelcm\Subscriptions\Models\Subscription as BaseSubscription;
use LogicException;

class Subscription extends BaseSubscription
{
    protected $fillable = [
        'subscriber_id',
        'subscriber_type',
        'plan_id',
        'slug',
        'name',
        'description',
        'starts_at',
        'ends_at',
        'cancels_at',
        'canceled_at',
        'payment_id',
        'billing_period',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'subscriber_type' => 'string',
        'slug' => 'string',
        'trial_ends_at' => 'datetime',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'cancels_at' => 'datetime',
        'canceled_at' => 'datetime',
        'deleted_at' => 'datetime',
        'billing_period' => BillingPeriodEnum::class,
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(DepositWebhook::class, 'payment_id', 'id');
    }

    public function cancels(): bool
    {
        return !!$this->cancels_at;
    }

    public function scopeActive($query)
    {
        return $query->whereNull('canceled_at')->where('ends_at', '>', now());
    }
}
