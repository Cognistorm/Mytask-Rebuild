<div class="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] pt-6 pb-12 lg:pb-24">
    @if(request()->boolean('gigs'))
        <div class="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-100" role="alert">
            {{ __('messages.t_warning_gigs_limit') }}
        </div>
    @elseif (request()->boolean('project'))
        <div class="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-100" role="alert">
            {{ __('messages.t_warning_project_limit') }}
        </div>
    @endif
    <div class="pricing-container">
        @if($hasYearlyPlans)
            <div class="flex justify-center mb-6">
                <div class="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-full">
                    <button type="button"
                            wire:click="setBillingPeriod('month')"
                            wire:loading.attr="disabled"
                            @class([
                                'px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200',
                                'bg-white text-gray-900 shadow' => $billingPeriod === 'month',
                                'text-gray-500 hover:text-gray-700' => $billingPeriod !== 'month',
                            ])>
                        {{ __('messages.t_billing_monthly') }}
                    </button>
                    <button type="button"
                            wire:click="setBillingPeriod('year')"
                            wire:loading.attr="disabled"
                            @class([
                                'flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200',
                                'bg-white text-gray-900 shadow' => $billingPeriod === 'year',
                                'text-gray-500 hover:text-gray-700' => $billingPeriod !== 'year',
                            ])>
                        {{ __('messages.t_billing_yearly') }}
                        @if($yearlySavingsPercent)
                            <span class="px-2 py-0.5 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                                {{ __('messages.t_save_percent', ['percent' => $yearlySavingsPercent]) }}
                            </span>
                        @endif
                    </button>
                </div>
            </div>
        @endif
        <div class="pricing-grid">
            @foreach($preparedPlans as $planData)
                <div class="pricing-grid__item" wire:key="plan-{{ $planData['plan']->id }}">
                    <x-main.pricing-card
                        :title="$planData['plan']->name ?? ''"
                        :description="$planData['plan']->description ?? ''"
                        :slug="$planData['plan']->slug ?? ''"
                        :buttonLabel="$planData['buttonLabel']"
                        :statusLabel="$planData['statusLabel']"
                        :icon="null"
                        :sections="$planData['sections']"
                        :redirect="$planData['redirectUrl']"
                        :priceLabel="$planData['priceLabel'] ?? null"
                        :priceAmount="$planData['priceAmount'] ?? null"
                        :pricePeriod="$planData['pricePeriod'] ?? null"
                        :monthlyEquivalent="$planData['monthlyEquivalent'] ?? null"
                        :pointsPrice="$planData['pointsPrice'] ?? null"
                        :userPoints="$planData['userPoints'] ?? 0"
                        :isPremium="$planData['isPremium'] ?? false"
                        :hasActiveSubscription="$planData['hasActiveSubscription'] ?? false"
                    />
                </div>
            @endforeach
        </div>
    </div>
</div>
