<?php

namespace App\Services\Referral;

use App\Models\ReferralCodeBenefit;
use App\Models\User;
use Carbon\Carbon;
use Laravelcm\Subscriptions\Models\Plan;

class ReferralBenefitService
{
    public function applyBenefitsForCode(User $user, string $referralCode): bool
    {
        $benefit = ReferralCodeBenefit::findByCode($referralCode);

        if (!$benefit || !$benefit->canBeUsed()) {
            return false;
        }

        $this->grantPremiumSubscription($user, $benefit);

        return true;
    }

    private function grantPremiumSubscription(User $user, ReferralCodeBenefit $benefit): void
    {
        $plan = Plan::where('slug', 'premium')->first();

        if (!$plan) {
            return;
        }

        $startsAt = Carbon::now();
        $endsAt = $startsAt->copy()->addMonths($benefit->premium_duration_months);

        $user->planSubscriptions()->create([
            'name' => $plan->name,
            'slug' => 'premium-gifted-' . $user->id . '-' . time(),
            'plan_id' => $plan->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);
    }
}
