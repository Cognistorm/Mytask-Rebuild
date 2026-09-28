<?php

namespace App\Http\Controllers;

use App\Enums\BillingPeriodEnum;
use App\Models\Plan;
use App\Services\Bog\BogPayment;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    private SubscriptionService $subscriptionService;
    private BogPayment $bogPayment;

    public function __construct(SubscriptionService $subscriptionService, BogPayment $bogPayment)
    {
        $this->subscriptionService = $subscriptionService;
        $this->bogPayment = $bogPayment;
    }

    public function subscribe(Request $request, string $planSlug)
    {
        $user = $request->user();
        $plan = Plan::where('slug', $planSlug)->firstOrFail();
        $billingPeriod = BillingPeriodEnum::tryFrom((string) $request->query('period')) ?? BillingPeriodEnum::Monthly;

        if ($billingPeriod === BillingPeriodEnum::Yearly && ! $plan->hasYearlyPrice()) {
            $billingPeriod = BillingPeriodEnum::Monthly;
        }

        if ($this->subscriptionService->isAlreadySubscribed($user, $plan)) {
            return redirect()->back()->with('error', 'You are already subscribed to this plan.');
        }

        $orderId = $this->subscriptionService->generateOrderId();

        $sessionData = $this->subscriptionService->prepareSessionData($user, $plan, $orderId, $billingPeriod);
        session(['subscription_details' => $sessionData]);

        $config = $this->subscriptionService->buildPaymentConfig($plan, $orderId, $sessionData, $billingPeriod);
        $result = $this->bogPayment->payment($config);

        $detailsOrderId = $this->subscriptionService->extractOrderId($result['_links']['details']['href']);
        $this->bogPayment->saveSubscription($detailsOrderId);

        $this->subscriptionService->createDepositWebhook(
            $user->id,
            $detailsOrderId,
            $plan->priceFor($billingPeriod)
        );
        return redirect($result['_links']['redirect']['href']);
    }
}
