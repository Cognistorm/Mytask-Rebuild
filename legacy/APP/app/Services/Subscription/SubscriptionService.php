<?php

namespace App\Services\Subscription;

use App\Enums\BillingPeriodEnum;
use App\Models\DepositWebhook;
use App\Models\User;
use App\Models\UserPaymentMethod;
use App\Services\Bog\BogPayment;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Str;
use Laravelcm\Subscriptions\Models\Plan;

class SubscriptionService
{
    /**
     * Initiate a subscription for a user.
     *
     * @param Authenticatable $user
     * @param Plan $plan
     * @return array
     */
    public function initiateSubscription(Authenticatable $user, Plan $plan)
    {
        // Generate a unique order ID
        $orderId = 'sub_' . Str::random(10);
        $amount = $plan->price;
        \Illuminate\Support\Facades\Log::info('Initiating subscription', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'amount' => $amount
        ]);

        $config = [
            'order_id' => $orderId,
            'amount' => $amount,
            'type' => 'subscription',
            'plan_id' => $plan->id,
            'item_name' => $plan->name['en'] ?? 'Subscription Plan',
        ];

        session([
            'subscription_details' => [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'order_id' => $orderId,
            ]
        ]);
        $bogPayment = new BogPayment();
        return $bogPayment->payment($config);
    }


    /**
     * Store payment method for user.
     *
     * @param User $user
     * @param array $paymentDetails
     * @return UserPaymentMethod
     */
    protected function storePaymentMethod(User $user, array $paymentDetails)
    {
        $hasDefault = $user->paymentMethods()->where('is_default', true)->exists();
        [$month, $year] = explode('/', $paymentDetails['payment_detail']['card_expiry_date']);

        $masked_card_number = $paymentDetails['payment_detail']['payer_identifier'] ?? null;

        $existingPaymentMethod = $user->paymentMethods()
            ->where('masked_card_number', $masked_card_number)
            ->where('expiration_month', $month)
            ->where('expiration_year', $year)
            ->first();

        if ($existingPaymentMethod) {
            return $existingPaymentMethod;
        }

        return UserPaymentMethod::create([
            'user_id' => $user->id,
            'card_type' => $paymentDetails['payment_detail']['card_type'] ?? null,
            'masked_card_number' => $masked_card_number,
            'expiration_month' => $month ?? null,
            'expiration_year' => $year ?? null,
            'card_holder_name' => $user->fullname ?? null,
            'is_default' => !$hasDefault,
        ]);
    }

    /**
     * Process subscription after successful payment.
     *
     * @param string $orderId
     * @param array $paymentDetails
     *
     */
    public function processSubscription($paymentDetails, $order)
    {
        try {
            $data = $this->validateSubscriptionData($order->payment_id);
            if (!$data) {
                return null;
            }
            $this->storePaymentMethod($data['user'], $paymentDetails);

            return $this->createSubscription($data, $order->id);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error processing subscription', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Get payment details from BOG API
     *
     * @param string $orderId Payment ID
     */
    public function getPaymentDetailsFromBog(string $orderId): array
    {
        $order = DepositWebhook::where('payment_id', $orderId)->firstOrFail();
        $bogPayment     = new BogPayment();
        $paymentDetails = $bogPayment->getPaymentDetails($order->order_id);
        if (($paymentDetails['order_status']['key'] ?? null) === 'completed') {
            $order->update(['status' => 'succeeded']);
        }

        return [ $paymentDetails, $order ];
    }

    /**
     * Validate subscription data and retrieve user and plan.
     *
     * @param string $orderId
     * @return array|null
     */
    private function validateSubscriptionData(string $orderId): ?array
    {
        // Get subscription details from session
        $subscriptionDetails = session('subscription_details');

        if (!$subscriptionDetails || $subscriptionDetails['order_id'] !== $orderId) {
            \Illuminate\Support\Facades\Log::error('Invalid subscription details for order', [
                'order_id' => $orderId,
                'session_details' => $subscriptionDetails
            ]);
            return null;
        }

        $user = User::find($subscriptionDetails['user_id']);
        $plan = \App\Models\Plan::find($subscriptionDetails['plan_id']);
        if (!$user || !$plan) {
            \Illuminate\Support\Facades\Log::error('User or plan not found for subscription', [
                'order_id' => $orderId,
                'user_id' => $subscriptionDetails['user_id'] ?? null,
                'plan_id' => $subscriptionDetails['plan_id'] ?? null
            ]);
            return null;
        }

        return [
            'user' => $user,
            'plan' => $plan,
            'details' => $subscriptionDetails
        ];
    }

    /**
     * Create a new subscription without trial period.
     *
     * @param User $user
     * @param Plan $plan
     * @param array $subscriptionDetails
     */
    private function createSubscription($data, $orderId)
    {
        $user = $data['user'];
        $plan = $data['plan'];

        $billingPeriod = BillingPeriodEnum::tryFrom($data['details']['billing_period'] ?? '') ?? BillingPeriodEnum::Monthly;

        $period = new \Laravelcm\Subscriptions\Services\Period(
            interval: $billingPeriod->value,
            count: 1,
            start: Carbon::now()
        );

        $subscription = $user->planSubscriptions()->create([
            'name' => [
                'en' => $plan->getTranslations('name')['en'] ?? $plan->name,
                'ka' => $plan->getTranslations('name')['ka'] ?? $plan->name,
            ],
            'slug' => $plan->slug . '-' . $user['id'],
            'plan_id' => $plan->getKey(),
            'payment_id' => $orderId,
            'billing_period' => $billingPeriod,
            'starts_at' => $period->getStartDate(),
            'ends_at' => $period->getEndDate(),
        ]);

        $user->clearSubscriptionCache();

        return $subscription;
    }



    /**
     * Check if user is already subscribed to a plan.
     *
     * @param User $user
     * @param Plan $plan
     * @return bool
     */
    public function isAlreadySubscribed($user, Plan $plan): bool
    {
        $current = $user->subscriptions()
            ->whereNull('canceled_at')
            ->where('ends_at', '>', now())
            ->first();
        return $current && $current->plan_id === $plan->id;
    }


    /**
     * Generate a unique order ID for subscription.
     *
     * @return string
     */
    public function generateOrderId(): string
    {
        return 'sub_' . Str::random(10);
    }

    /**
     * Prepare session data for subscription.
     *
     * @param User $user
     * @param Plan $plan
     * @param string $orderId
     * @param BillingPeriodEnum $billingPeriod
     * @return array{user_id: int, plan_id: int, order_id: string, billing_period: string}
     */
    public function prepareSessionData($user, Plan $plan, string $orderId, BillingPeriodEnum $billingPeriod = BillingPeriodEnum::Monthly): array
    {
        return [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'order_id' => $orderId,
            'billing_period' => $billingPeriod->value,
        ];
    }

    /**
     * Build payment configuration for BOG payment.
     *
     * @param Plan $plan
     * @param string $orderId
     * @param array $sessionData
     * @param BillingPeriodEnum $billingPeriod
     * @return array
     */
    public function buildPaymentConfig(\App\Models\Plan $plan, string $orderId, array $sessionData, BillingPeriodEnum $billingPeriod = BillingPeriodEnum::Monthly): array
    {
        return [
            'order_id' => $orderId,
            'amount' => $plan->priceFor($billingPeriod),
            'type' => 'subscription',
            'plan_id' => $plan->id,
            'item_name' => $plan->name['en'] ?? $plan->name,
        ];
    }

    /**
     * Extract order ID from details URL.
     *
     * @param string $detailsUrl
     * @return string
     */
    public function extractOrderId(string $detailsUrl): string
    {
        return substr($detailsUrl, strrpos($detailsUrl, '/') + 1);
    }

    /**
     * Create deposit webhook record.
     *
     * @param int $userId
     * @param string $paymentId
     * @param float $amount
     * @return void
     */
    public function createDepositWebhook(int $userId, string $paymentId, float $amount): void
    {
        DepositWebhook::create([
            'user_id' => $userId,
            'payment_id' => session('subscription_details.order_id'),
            'order_id' => $paymentId,
            'payment_method' => 'bog',
            'status' => 'pending',
            'amount' => $amount,
        ]);
    }
}
