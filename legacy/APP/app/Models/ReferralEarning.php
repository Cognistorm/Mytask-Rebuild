<?php

namespace App\Models;

use App\Enums\ReferralEarningStatus;
use App\Enums\ReferralEventType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralEarning extends Model
{
    protected $fillable = [
        'referrer_id',
        'referred_user_id',
        'event_type',
        'points',
        'status',
        'description',
        'earned_at',
        'approved_at',
    ];

    protected $casts = [
        'event_type' => ReferralEventType::class,
        'status' => ReferralEarningStatus::class,
        'points' => 'integer',
        'earned_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    /**
     * Get the referrer (user who made the referral)
     */
    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    /**
     * Get the referred user
     */
    public function referredUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }

    /**
     * Scope to get earnings for a specific referrer
     */
    public function scopeForReferrer($query, $userId)
    {
        return $query->where('referrer_id', $userId);
    }

    /**
     * Scope to get earnings by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get earnings by event type
     */
    public function scopeByEventType($query, $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope to get approved earnings
     */
    public function scopeApproved($query)
    {
        return $query->where('status', ReferralEarningStatus::APPROVED);
    }

    /**
     * Scope to get total points earned
     */
    public function scopeTotalPoints($query, $userId)
    {
        return $query->forReferrer($userId)->approved()->sum('points');
    }

    /**
     * Scope to get pending points
     */
    public function scopePendingPoints($query, $userId)
    {
        return $query->forReferrer($userId)->byStatus(ReferralEarningStatus::PENDING)->sum('points');
    }

    /**
     * Create earning record for an event
     */
    public static function createEarning($referrerId, $referredUserId, ReferralEventType $eventType)
    {
        return static::create([
            'referrer_id' => $referrerId,
            'referred_user_id' => $referredUserId,
            'event_type' => $eventType,
            'points' => $eventType->points(),
            'status' => ReferralEarningStatus::APPROVED,
            'description' => $eventType->description(),
            'earned_at' => now(),
            'approved_at' => now(),
        ]);
    }

    /**
     * Create earning record for signup (10 points)
     */
    public static function createSignupEarning($referrerId, $referredUserId)
    {
        return static::createEarning($referrerId, $referredUserId, ReferralEventType::SIGNUP);
    }
}
