<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralCodeBenefit extends Model
{
    protected $fillable = [
        'code',
        'name',
        'is_active',
        'premium_duration_months',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'premium_duration_months' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function findByCode(string $code): ?self
    {
        return static::active()
            ->where('code', strtolower($code))
            ->first();
    }

    public function canBeUsed(): bool
    {
        return $this->is_active;
    }
}
