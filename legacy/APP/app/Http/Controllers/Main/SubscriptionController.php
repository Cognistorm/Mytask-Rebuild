<?php

namespace App\Http\Controllers\Main;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Plan;
use App\Notifications\User\Everyone\SubscriptionConfirmation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SubscriptionController extends Controller
{
    /**
     * Purchase subscription with points
     */
    public function purchaseWithPoints(Request $request)
    {
        $request->validate([
            'points' => 'required|integer|min:1',
            'plan_slug' => 'required|string'
        ]);

        $user = auth()->user();
        $pointsRequired = $request->points;

        if ($user->balance_points < $pointsRequired) {
            return back()->with('error', __('messages.t_insufficient_points'));
        }

        $activeSubscription = $user->subscriptions()
            ->whereNull('canceled_at')
            ->where('ends_at', '>', now())
            ->first();

        if ($activeSubscription) {
            return back()->with('error', __('messages.t_already_have_active_subscription'));
        }

        $plan = Plan::where('slug', $request->plan_slug)->first();
        if (!$plan) {
            return back()->with('error', __('messages.t_plan_not_found'));
        }

        try {
            DB::beginTransaction();

            $user->decrement('balance_points', $pointsRequired);

            $subscription = $this->createSubscription($user, $plan);

            $this->logPointsTransaction($user->id, $pointsRequired, 'subscription_purchase', $request->plan_slug);

            DB::commit();


            if ($subscription) {
                $user->notify((new SubscriptionConfirmation($subscription))->locale(config('app.locale')));
                notification([
                    'text' => 't_subscription_activated_message',
                    'action' => route('account.my-subscription'),
                    'user_id' => $user->id,
                    'params' => [
                        'expires_at' => $subscription->ends_at->format('d-m-Y'),
                    ],
                ]);
            }

            return back()->with('success', __('messages.t_subscription_purchased_successfully'));

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Points subscription purchase failed: ' . $e->getMessage());
            return back()->with('error', __('messages.t_purchase_failed'));
        }
    }

    /**
     * Create user subscription (1 month only)
     */
    private function createSubscription($user, $plan)
    {
        // Create period for 1 month
        $period = new \Laravelcm\Subscriptions\Services\Period(
            interval: 'month',
            count: 1,
            start: Carbon::now()
        );

        // Create subscription using planSubscriptions
        $subscription = $user->planSubscriptions()->create([
            'name' => [
                'en' => $plan->getTranslations('name')['en'] ?? $plan->name,
                'ka' => $plan->getTranslations('name')['ka'] ?? $plan->name,
            ],
            'slug' => $plan->slug . '-' . $user->id . '-' . time(),
            'plan_id' => $plan->getKey(),
            'payment_id' => null,
            'starts_at' => $period->getStartDate(),
            'ends_at' => $period->getEndDate(),
        ]);

        $user->clearSubscriptionCache();
        $user->notify((new SubscriptionConfirmation($subscription))->locale(config('app.locale')));
        return $subscription;
    }

    /**
     * Log points transaction
     */
    private function logPointsTransaction($userId, $points, $type, $description)
    {
        \Log::info("Points transaction: User {$userId} spent {$points} points for {$type} - {$description}");
    }
}
