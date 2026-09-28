<?php

namespace App\Console\Commands;

use App\Enums\BillingPeriodEnum;
use App\Models\Subscription;
use App\Models\UserPaymentMethod;
use App\Notifications\User\Everyone\SubscriptionRenewed;
use App\Services\Bog\BogPayment;
use App\Services\Subscription\SubscriptionService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class ProcessSubscriptionPayments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:process-payments';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process automatic payments for expired subscriptions';


    public function handle(SubscriptionService $subscriptionService, BogPayment $bogPayment): int
    {
        $this->info('Processing subscription payments...');

        try {
            $subscriptions = $this->getExpiredSubscriptions();
            $this->info("Found {$subscriptions->count()} subscriptions to process.");

            $this->processSubscriptions($subscriptions, $subscriptionService, $bogPayment);

            $this->info('Subscription payment processing completed successfully.');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->handleFatalError($e);
            return Command::FAILURE;
        }
    }

    private function getExpiredSubscriptions(): Collection
    {
        return Subscription::with(['subscriber', 'payment'])
            ->where('ends_at', '<=', Carbon::now())
            ->whereNull('canceled_at')
            ->get();
    }

    private function processSubscriptions(Collection $subscriptions, SubscriptionService $subscriptionService, BogPayment $bogPayment): void
    {
        $subscriptions->each(function (Subscription $subscription) use ($subscriptionService, $bogPayment) {
            try {
                $this->processIndividualSubscription($subscription, $subscriptionService, $bogPayment);
            } catch (\Exception $e) {
                $this->handleSubscriptionError($subscription, $e);
                $this->cancelSubscription($subscription);
            }
        });
    }

    private function processIndividualSubscription(Subscription $subscription, SubscriptionService $subscriptionService, BogPayment $bogPayment): void
    {
        if (!$subscription->subscriber) {
            $this->warn("No subscriber found for subscription: {$subscription->id}");
            return;
        }

        if ($subscription->cancels_at) {
            $this->finalizeSubscriptionCancellation($subscription);
            $this->info("Finalized cancellation for subscription: {$subscription->id}");
            return;
        }

        $paymentResult = $this->processPayment($subscription, $bogPayment);

        if ($this->isPaymentSuccessful($paymentResult)) {
            $this->renewSubscription($subscription);
            $this->info("Successfully renewed subscription: {$subscription->id}");
        } else {
            $this->cancelSubscription($subscription);
            $this->info("Cancelled subscription due to payment failure: {$subscription->id}");
        }
    }

    private function processPayment(Subscription $subscription, BogPayment $bogPayment): ?array
    {
        $payment = $subscription->payment()->first();

        if (!$payment) {
            $this->warn("No payment record found for subscription: {$subscription->id}");
            return null;
        }

        // If user has no saved payment methods, consider as missing payment method
        $hasPaymentMethod = UserPaymentMethod::where('user_id', optional($subscription->subscriber)->id)->exists();
        if (! $hasPaymentMethod) {
            $this->warn("No saved payment method for user: {$subscription->subscriber?->id} (subscription: {$subscription->id})");
            return null;
        }

        $paymentDetails = $bogPayment->getPaymentDetails($payment->order_id);

        if (!is_array($paymentDetails) || empty($paymentDetails)) {
            $this->warn("Payment details unavailable for subscription: {$subscription->id}");
            return null;
        }

        if (!$this->isValidPaymentMethod($paymentDetails, $subscription)) {
            $this->warn("Payment method not found or expired for subscription: {$subscription->id}");
            return null;
        }

        return $bogPayment->offlinePayment($payment->order_id);
    }

    private function isValidPaymentMethod(array $paymentDetails, Subscription $subscription): bool
    {
        if (!isset($paymentDetails['payment_detail']['card_expiry_date']) ||
            !isset($paymentDetails['payment_detail']['payer_identifier'])) {
            return false;
        }

        [$month, $year] = explode('/', $paymentDetails['payment_detail']['card_expiry_date']);

        $payer = $paymentDetails['payment_detail']['payer_identifier'];

        $monthAlt = ltrim($month, '0');
        $monthPadded = str_pad($monthAlt, 2, '0', STR_PAD_LEFT);
        $year2 = substr($year, -2);

        return UserPaymentMethod::query()
            ->where('user_id', optional($subscription->subscriber)->id)
            ->where('masked_card_number', $payer)
            ->whereIn('expiration_month', [$month, $monthAlt, $monthPadded])
            ->whereIn('expiration_year', [$year, $year2])
            ->exists();
    }

    private function isPaymentSuccessful(?array $result): bool
    {
        if ($result === null) {
            return false;
        }

        // Prefer explicit success signals when provided by gateway
        foreach (['status', 'state', 'order_state'] as $key) {
            if (isset($result[$key])) {
                $value = strtolower((string) $result[$key]);
                // Common success states
                if (in_array($value, ['succeeded', 'success', 'captured', 'approved', 'paid', 'completed'])) {
                    return true;
                }
                // If a status exists but isn't in success states, treat as failure
                return false;
            }
        }

        // Fallback: consider successful if an id exists and no status was provided
        return isset($result['id']);
    }

    private function handleSubscriptionError(Subscription $subscription, \Exception $exception): void
    {
        $errorMessage = "Failed to process subscription {$subscription->id}: {$exception->getMessage()}";

        $this->error($errorMessage);
    }

    private function handleFatalError(\Exception $exception): void
    {
        $errorMessage = "Fatal error during subscription payment processing: {$exception->getMessage()}";

        $this->error($errorMessage);
        $this->error("Stack trace: {$exception->getTraceAsString()}");
    }

    private function clearSubscriptionCache(Subscription $subscription): void
    {
        if ($subscription->subscriber) {
            $subscription->subscriber->clearSubscriptionCache();
        }
    }

    private function renewSubscription(Subscription $subscription): void
    {
        $now = Carbon::now();
        $newEndDate = ($subscription->billing_period ?? BillingPeriodEnum::Monthly)->addTo($now);

        $subscription->update([
            'starts_at' => $now,
            'ends_at' => $newEndDate,
            'canceled_at' => null,
            'cancels_at' => null,
        ]);

        notification([
            'text' => 't_subscription_updated_message',
            'action' => route('main.subscription'),
            'user_id' => $subscription->subscriber->id,
            'params' => [
                'expires_at' => $subscription->ends_at->format('d-m-Y'),
            ],
        ]);

        $subscription->subscriber->notify((new SubscriptionRenewed($subscription))->locale('ka'));

        $this->clearSubscriptionCache($subscription);
    }

    private function cancelSubscription(Subscription $subscription): void
    {
        $now = Carbon::now();

        $subscription->update([
            'canceled_at' => $now,
            'cancels_at' => $now,
        ]);

        $this->clearSubscriptionCache($subscription);
    }

    private function finalizeSubscriptionCancellation(Subscription $subscription): void
    {
        $now = Carbon::now();

        $subscription->update([
            'canceled_at' => $now,
        ]);

        $this->clearSubscriptionCache($subscription);
    }
}
