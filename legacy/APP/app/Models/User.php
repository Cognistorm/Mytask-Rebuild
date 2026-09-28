<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\HasApiTokens;
use Laravelcm\Subscriptions\Traits\HasPlanSubscriptions;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasPlanSubscriptions;

    protected static function boot(): void
    {
        parent::boot();

        static::deleting(function (User $user) {
            $user->projectBids()->delete();
            $user->gigs()->forceDelete();
            $user->favorites()->delete();
            $user->skills()->delete();
            $user->languages()->delete();
            $user->projects()->delete();
            $user->verification()->delete();
            $user->billing()->delete();
            $user->availability()->delete();
            $user->accounts()->delete();
            $user->notifications()->delete();
            $user->restrictions()->delete();
            $user->paymentMethods()->delete();
            $user->referrals()->delete();
            $user->referralEarnings()->delete();
            $user->reviews()->delete();

            OrderItem::where('owner_id', $user->id)->delete();
            Order::where('buyer_id', $user->id)->delete();
            ChMessage::where('from_id', $user->id)->orWhere('to_id', $user->id)->delete();
            ChFavorite::where('user_id', $user->id)->orWhere('favorite_id', $user->id)->delete();
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $guarded = [];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    /**
     * Get user verification
     *
     * @return object
     */
    public function verification()
    {
        return $this->hasOne(VerificationCenter::class, 'user_id');
    }

    /**
     * Get user avatar
     */
    public function avatar(): BelongsTo
    {
        return $this->belongsTo(FileManager::class, 'avatar_id');
    }

    /**
     * Get user billing info
     *
     * @return object
     */
    public function billing()
    {
        return $this->hasOne(UserBilling::class, 'user_id');
    }

    /**
     * Get user level
     *
     * @return object
     */
    public function level()
    {
        return $this->belongsTo(Level::class, 'level_id');
    }

    /**
     * Get user country
     *
     * @return object
     */
    public function country()
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    /**
     * Get user sales
     *
     * @return object
     */
    public function sales()
    {
        return $this->hasMany(OrderItem::class, 'owner_id');
    }

    /**
     * Get user skills
     *
     * @return object
     */
    public function skills()
    {
        return $this->hasMany(UserSkill::class, 'user_id');
    }

    /**
     * Get user linked account
     *
     * @return object
     */
    public function accounts()
    {
        return $this->hasOne(UserLinkedAccount::class, 'user_id');
    }

    /**
     * Get user projects
     *
     * @return object
     */
    public function projects()
    {
        return $this->hasMany(UserPortfolio::class, 'user_id');
    }

    /**
     * Get user languages
     *
     * @return object
     */
    public function languages()
    {
        return $this->hasMany(UserLanguage::class, 'user_id');
    }

    /**
     * Get user availability
     *
     * @return object
     */
    public function availability()
    {
        return $this->hasOne(UserAvailability::class, 'user_id');
    }

    /**
     * Check if user online
     *
     * @return bool
     */
    public function isOnline()
    {
        return Cache::has('user-is-online-'.$this->id);
    }

    /**
     * Get seller reviews
     *
     * @return object
     */
    public function reviews()
    {
        return $this->hasMany(Review::class, 'seller_id');
    }

    /**
     * Get user's project bids
     */
    public function projectBids(): HasMany
    {
        return $this->hasMany(ProjectBid::class, 'user_id');
    }

    /**
     * Get user's gigs
     */
    public function gigs(): HasMany
    {
        return $this->hasMany(Gig::class, 'user_id');
    }

    /**
     * Get user's favorites
     */
    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class, 'user_id');
    }

    /**
     * Get seller rating
     *
     * @return int
     */
    public function rating()
    {
        try {

            // Get total rating
            $total_rating = $this->reviews->sum('rating');

            // Get total reviews
            $total_reviews = $this->reviews->count();

            // Get rating
            $rating_value = $total_reviews === 0 ? 0 : $total_rating / $total_reviews;

            // Check if decimal
            if (is_numeric($rating_value) && floor($rating_value) != $rating_value) {
                return number_format($rating_value, 1);
            } else {
                return $rating_value;
            }

        } catch (\Throwable $th) {
            return 0;
        }
    }

    /**
     * Get notifications
     *
     * @return object
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    /**
     * Get user's restrictions
     */
    public function restrictions(): object
    {
        return $this->hasMany(UserRestriction::class, 'user_id');
    }

    /**
     * Get live chat contacts
     *
     * @return object
     */
    public function chat_contacts_from()
    {
        return $this->belongsToMany(self::class, 'ch_messages', 'to_id', 'from_id');
    }

    /**
     * Get live chat contacts
     *
     * @return object
     */
    public function chat_contacts_to()
    {
        return $this->belongsToMany(self::class, 'ch_messages', 'from_id', 'to_id');
    }

    public function contacts()
    {
        return $this->chat_contacts_to->merge($this->chat_contacts_from);
    }

    /**
     * Get user payment methods
     *
     * @return object
     */
    public function paymentMethods()
    {
        return $this->hasMany(UserPaymentMethod::class);
    }

    /**
     * Alias for planSubscriptions() method.
     *
     * @return \Illuminate\Database\Eloquent\Relations\MorphMany
     */
    public function subscriptions()
    {
        return $this->planSubscriptions();
    }

    /**
     * Check if user has any active subscriptions (cached version)
     *
     * @return bool
     */
    public function hasSubscription()
    {
        return Cache::remember('user_has_subscription_' . $this->id, 60, function () {
            return $this->subscriptions()
                ->whereNull('canceled_at')
                ->where('ends_at', '>', now())
                ->exists();
        });
    }
    /**
     * Clear subscription-related cache for this user
     *
     * @return void
     */
    public function clearSubscriptionCache()
    {
        Cache::forget('user_has_subscription_' . $this->id);
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }

    public function referralRecord(): HasOne
    {
        return $this->hasOne(Referral::class, 'referred_user_id');
    }

    public function referrer(): HasOneThrough
    {
        return $this->hasOneThrough(
            User::class,
            Referral::class,
            'referred_user_id',
            'id',
            'id',
            'referrer_id'
        );
    }

    public function referralEarnings(): HasMany
    {
        return $this->hasMany(ReferralEarning::class, 'referrer_id');
    }

    public function hasPaidPremium(): bool
    {
        if ($this->relationLoaded('subscriptions')) {
            return $this->subscriptions->whereNotNull('payment_id')->isNotEmpty();
        }
        return $this->subscriptions()->active()->whereNotNull('payment_id')->exists();
    }

    public function hasGiftedPremium(): bool
    {
        if ($this->relationLoaded('subscriptions')) {
            return $this->subscriptions->whereNull('payment_id')->isNotEmpty();
        }
        return $this->subscriptions()->active()->whereNull('payment_id')->exists();
    }

    public function scopeWithPaidPremium($query)
    {
        return $query->whereHas('subscriptions', fn ($q) => $q->active()->whereNotNull('payment_id'));
    }

    public function scopeWithGiftedPremium($query)
    {
        return $query->whereHas('subscriptions', fn ($q) => $q->active()->whereNull('payment_id'));
    }

    public function scopeWithoutPremium($query)
    {
        return $query->whereDoesntHave('subscriptions', fn ($q) => $q->active());
    }

    public function earnedFromReferrals(): HasMany
    {
        return $this->hasMany(ReferralEarning::class, 'referred_user_id');
    }

    /**
     * Add points to user balance
     *
     * @param int $points
     * @param string $reason
     * @return void
     */
    public function addPoints(int $points, string $reason = 'manual')
    {
        $this->increment('balance_points', $points);
    }

    /**
     * Deduct points from user balance
     *
     * @param int $points
     * @param string $reason
     * @return bool
     */
    public function deductPoints(int $points, string $reason = 'manual'): bool
    {
        if ($this->balance_points < $points) {
            return false;
        }

        $this->decrement('balance_points', $points);

        return true;
    }

    /**
     * Check if user has enough points
     *
     * @param int $points
     * @return bool
     */
    public function hasEnoughPoints(int $points): bool
    {
        return $this->balance_points >= $points;
    }

    /**
     * Get formatted points balance
     *
     * @return string
     */
    public function getFormattedPointsAttribute(): string
    {
        return number_format($this->balance_points);
    }
}
