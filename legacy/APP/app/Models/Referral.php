<?php

namespace App\Models;

use App\Enums\ReferralStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    protected $fillable = [
        'referrer_id',
        'referred_user_id',
        'referral_code',
        'status',
        'source',
        'ip_address',
        'user_agent',
        'referred_at',
    ];

    protected $casts = [
        'status' => ReferralStatus::class,
        'referred_at' => 'datetime',
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
     * Scope to get referrals for a specific referrer
     */
    public function scopeForReferrer($query, $userId)
    {
        return $query->where('referrer_id', $userId);
    }

    /**
     * Scope to get referrals by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get verified referrals
     */
    public function scopeVerified($query)
    {
        return $query->where('status', ReferralStatus::VERIFIED);
    }

    /**
     * Get total referrals count for a user
     */
    public static function getTotalCount($userId)
    {
        return static::forReferrer($userId)->count();
    }

    /**
     * Get active referrals count for a user
     */
    public static function getActiveCount($userId)
    {
        return static::forReferrer($userId)->verified()->count();
    }
}
