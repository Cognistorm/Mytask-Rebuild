<?php

namespace App\Livewire\Main\Subscription;

use App\Enums\BillingPeriodEnum;
use App\Enums\SubscriptionEnum;
use App\Models\Plan;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class SubscriptionComponent extends Component
{

    use LivewireAlert;

    public $plans;
    public $userSubscription;
    public string $billingPeriod = 'month';

    public function mount()
    {
        $this->plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        if (auth()->check()) {
            $this->userSubscription = auth()->user()->subscriptions()
                ->whereNull('canceled_at')
                ->first();
        }
        $this->handleSessionMessages();
    }

    public function setBillingPeriod(string $billingPeriod): void
    {
        $this->billingPeriod = (BillingPeriodEnum::tryFrom($billingPeriod) ?? BillingPeriodEnum::Monthly)->value;
    }

    public function hasYearlyPlans(): bool
    {
        return $this->plans->contains(fn (Plan $plan): bool => $plan->hasYearlyPrice());
    }

    private function selectedBillingPeriod(Plan $plan): BillingPeriodEnum
    {
        $billingPeriod = BillingPeriodEnum::tryFrom($this->billingPeriod) ?? BillingPeriodEnum::Monthly;

        if ($billingPeriod === BillingPeriodEnum::Yearly && ! $plan->hasYearlyPrice()) {
            return BillingPeriodEnum::Monthly;
        }

        return $billingPeriod;
    }

    private function handleSessionMessages()
    {
        if (session()->has('message')) {
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(session('message'), 'error')
            );
        }
    }

    private function preparePlanData(Plan $plan): array
    {
        $withdrawalPercentage = match($plan->slug) {
            SubscriptionEnum::PREMIUM->slug() => '0%',
            default => '10%'
        };

        $sections = [
            'withdrawal_info' => $withdrawalPercentage,
            'features' => [
                ['list' => $plan->features_included ?? []],
                ['list' => $plan->features_excluded ?? []],
            ],
        ];

        $buttonLabel = $statusLabel = $redirectUrl = null;
        $subscription = $this->userSubscription;
        $planSlug = $plan->slug;

        $billingPeriod = $this->selectedBillingPeriod($plan);
        $isPremium = $planSlug === SubscriptionEnum::PREMIUM->slug();
        $pointsPrice = $isPremium && $billingPeriod === BillingPeriodEnum::Monthly ? 100 : null;
        $userPoints = auth()->check() ? auth()->user()->balance_points : 0;
        $hasActiveSubscription = $subscription !== null;
        $priceLabel = $this->formatPriceLabel($plan, $billingPeriod);
        $price = $plan->priceFor($billingPeriod);
        $priceAmount = $price > 0 ? number_format($price, 2) : null;
        $pricePeriod = $billingPeriod === BillingPeriodEnum::Yearly ? __('messages.t_year') : __('messages.t_month');
        $monthlyEquivalent = $billingPeriod === BillingPeriodEnum::Yearly && $price > 0 ? number_format($price / 12, 2) : null;
        $subscribeUrl = route('subscription.subscribe', ['planSlug' => $planSlug, 'period' => $billingPeriod->value]);

        if (! $subscription) {
           if ($planSlug === SubscriptionEnum::PREMIUM->slug()) {
                $buttonLabel = __('messages.t_buy_subscribe');
                $redirectUrl = $subscribeUrl;
            }

            return compact('plan', 'sections', 'buttonLabel', 'statusLabel', 'redirectUrl', 'isPremium', 'pointsPrice', 'userPoints', 'hasActiveSubscription', 'priceLabel', 'priceAmount', 'pricePeriod', 'monthlyEquivalent');
        }

        $currentEnum = SubscriptionEnum::from($subscription->plan_id);
        $currentSlug = $currentEnum->slug();

        if ($planSlug === SubscriptionEnum::STANDARD->slug()) {
            return compact('plan', 'sections', 'buttonLabel', 'statusLabel', 'redirectUrl', 'isPremium', 'pointsPrice', 'userPoints', 'hasActiveSubscription', 'priceLabel', 'priceAmount', 'pricePeriod', 'monthlyEquivalent');
        }

        if ($planSlug === SubscriptionEnum::PREMIUM->slug()) {
            if ($currentSlug === SubscriptionEnum::PREMIUM->slug()) {
                $statusLabel = __('messages.t_active');
            } else {
                $buttonLabel = __('messages.t_subscribe');
                $redirectUrl = $subscribeUrl;
            }
        }

        return compact('plan', 'sections', 'buttonLabel', 'statusLabel', 'redirectUrl', 'isPremium', 'pointsPrice', 'userPoints', 'hasActiveSubscription', 'priceLabel', 'priceAmount', 'pricePeriod', 'monthlyEquivalent');
    }

    private function formatPriceLabel(Plan $plan, BillingPeriodEnum $billingPeriod): ?string
    {
        $price = $plan->priceFor($billingPeriod);

        if ($price <= 0 || ! $plan->currency) {
            return null;
        }

        $periodLabel = $billingPeriod === BillingPeriodEnum::Yearly ? __('messages.t_year') : __('messages.t_month');

        return '₾ ' . number_format($price, 2) . '/' . $periodLabel;
    }

    private function yearlySavingsPercent(): ?int
    {
        $plan = $this->plans->first(fn (Plan $plan): bool => $plan->hasYearlyPrice() && $plan->price > 0);

        if (! $plan) {
            return null;
        }

        $savings = (int) round((1 - $plan->yearly_price / ($plan->price * 12)) * 100);

        return $savings > 0 ? $savings : null;
    }

    /**
     * Render the component
     */
    #[Layout('components.layouts.main-app')]
    public function render()
    {
        $preparedPlans = $this->plans->map(function ($plan) {
            return $this->preparePlanData($plan);
        });

        return view('livewire.main.subscription.subscription-component', [
            'preparedPlans' => $preparedPlans,
            'userSubscription' => $this->userSubscription,
            'hasYearlyPlans' => $this->hasYearlyPlans(),
            'yearlySavingsPercent' => $this->yearlySavingsPercent(),
        ]);
    }
}
