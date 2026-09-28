@props([
    'title' => null,
    'slug' => null,
    'subtitle' => null,
    'description' => null,
    'buttonLabel' => null,
    'statusLabel' => null,
    'featured' => null,
    'icon' => null,
    'sections' => [],
    'redirect' => null,
    'price' => null,
    'currency' => null,
    'priceLabel' => null,
    'priceAmount' => null,
    'pricePeriod' => null,
    'monthlyEquivalent' => null,
    'pointsPrice' => null,
    'userPoints' => null,
    'isPremium' => true,
    'hasActiveSubscription' => false,
])
<div class="pricing-card">
    <div class="pricing-card__header">
        <div class="flex items-center gap-3">
            @if($icon)
                <img class="plan-icon" src="{{ $icon }}" alt="{{ $title }}_icon">
            @endif
            <h2 class="plan-title">{{ $title }}</h2>
            @if($isPremium)
                <div class="relative inline-block">
                    <div class="w-7 h-7 bg-yellow-100 hover:bg-yellow-200 rounded-full flex items-center justify-center cursor-help transition-colors duration-200"
                         onmouseover="showInfoTooltip(this)"
                         onmouseout="hideInfoTooltip(this)">
                        <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="info-tooltip absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 text-white text-xs sm:text-sm rounded-lg shadow-lg opacity-0 pointer-events-none transition-all duration-300 z-50 whitespace-normal w-64 sm:w-80">
                        <div class="text-center sm:text-left leading-relaxed">
                            {{ __('messages.t_subscription_auto_renewal_notice') }}
                        </div>
                    </div>
                </div>
            @endif
        </div>
        @if($description)
            <p class="plan-description">{{ $description }}</p>
        @endif
    </div>

    <div class="pricing-card__price">
        <div class="flex items-baseline gap-1">
            @if($priceAmount)
                <span class="price-currency">₾</span>
                <span class="price-amount">{{ $priceAmount }}</span>
                <span class="price-period">/{{ $pricePeriod }}</span>
            @else
                <span class="price-amount">{{ __('messages.t_free') }}</span>
            @endif
        </div>
        <p class="price-note">
            @if($monthlyEquivalent)
                {{ __('messages.t_billed_yearly_equivalent', ['price' => '₾ ' . $monthlyEquivalent]) }}
            @elseif($isPremium && $pointsPrice)
                <span class="inline-flex items-center gap-1">
                    {{ __('messages.t_or') }}
                    <svg class="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                    {{ number_format($pointsPrice) }} {{ __('messages.t_points') }}/{{ __('messages.t_month') }}
                </span>
            @else
                &nbsp;
            @endif
        </p>
    </div>

    <div class="pricing-card__actions">
        @if($isPremium && $pointsPrice && auth()->check() && !$hasActiveSubscription)
            @if($buttonLabel)
                <a class="plan-button" href="{{ $redirect ?? '#' }}">{{ $buttonLabel }}</a>
            @endif

            @if(auth()->user()->balance_points >= $pointsPrice)
                <button type="button" onclick="purchaseWithPoints({{ $pointsPrice }})" class="plan-button plan-button--outline">
                    {{ __('messages.t_buy_with_points') }}
                </button>
            @else
                <div class="relative">
                    <button type="button" disabled
                            class="plan-button plan-button--outline plan-button--disabled"
                            onmouseover="showTooltip(this)"
                            onmouseout="hideTooltip(this)">
                        {{ __('messages.t_buy_with_points') }}
                    </button>
                    <div class="tooltip absolute top-full left-0 right-0 mt-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 pointer-events-none transition-opacity duration-200 z-10">
                        <p class="text-center break-words">
                            {{ __('messages.t_not_enough_points_tooltip', [
                                'required' => number_format($pointsPrice),
                                'available' => number_format(auth()->user()->balance_points)
                            ]) }}
                        </p>
                    </div>
                </div>
            @endif
        @elseif($buttonLabel)
            <a class="plan-button" href="{{ $redirect ?? '#' }}">{{ $buttonLabel }}</a>
        @elseif($statusLabel)
            <div class="plan-button plan-button--status">{{ $statusLabel }}</div>
        @endif

        @if($featured)
            <p class="featured-label">{!! $featured !!}</p>
        @endif
    </div>

    <div class="pricing-card__features">
        @if(!empty($sections['withdrawal_info']))
            <div class="feature-item">
                <svg width="1.25rem" height="1.25rem" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="minus in orange circle">
                    <circle cx="90" cy="90" r="78" fill="#FF9800"/>
                    <rect x="45" y="84" width="90" height="12" fill="#FFFFFF"/>
                </svg>
                <span>{{ __('messages.t_withdrawal_fee') }} {{ $sections['withdrawal_info'] }}</span>
            </div>
        @endif
        @foreach($sections['features'] as $section)
            @if(!empty($section['title']))
                <h5 class="section-title">{{ $section['title'] }}</h5>
            @endif
            @if(!empty($section['list']) && is_array($section['list']))
                <ul class="section-list list-{{ strtolower($slug) }}">
                    @foreach($section['list'] as $item)
                        <li @class(['feature-item', 'feature-item--excluded' => $loop->parent->index !== 0])>
                            @if($loop->parent->index === 0)
                                <x-icon name="check-circle" solid class="w-5 h-5 text-green-500"/>
                            @else
                                <x-icon name="x-circle" solid class="w-5 h-5 text-red-400"/>
                            @endif
                            <span>{{ $item }}</span>
                        </li>
                    @endforeach
                </ul>
            @endif
        @endforeach
    </div>
</div>

@if($isPremium && $pointsPrice)
    <script>
        function showTooltip(element) {
            const tooltip = element.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.classList.remove('opacity-0');
                tooltip.classList.add('opacity-100');
            }
        }

        function hideTooltip(element) {
            const tooltip = element.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.classList.remove('opacity-100');
                tooltip.classList.add('opacity-0');
            }
        }

        function showInfoTooltip(element) {
            const tooltip = element.parentElement.querySelector('.info-tooltip');
            if (tooltip) {
                tooltip.classList.remove('opacity-0');
                tooltip.classList.add('opacity-100');
            }
        }

        function hideInfoTooltip(element) {
            const tooltip = element.parentElement.querySelector('.info-tooltip');
            if (tooltip) {
                tooltip.classList.remove('opacity-100');
                tooltip.classList.add('opacity-0');
            }
        }

        function purchaseWithPoints(pointsRequired) {
            if (confirm('{{ __("messages.t_confirm_points_purchase", ["points" => ":points"]) }}'.replace(':points', pointsRequired))) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '{{ route("subscription.purchase-with-points") }}';

                const csrfToken = document.createElement('input');
                csrfToken.type = 'hidden';
                csrfToken.name = '_token';
                csrfToken.value = '{{ csrf_token() }}';
                form.appendChild(csrfToken);

                const pointsInput = document.createElement('input');
                pointsInput.type = 'hidden';
                pointsInput.name = 'points';
                pointsInput.value = pointsRequired;
                form.appendChild(pointsInput);

                const planInput = document.createElement('input');
                planInput.type = 'hidden';
                planInput.name = 'plan_slug';
                planInput.value = '{{ $slug }}';
                form.appendChild(planInput);

                document.body.appendChild(form);
                form.submit();
            }
        }
    </script>
@elseif($isPremium)
    <script>
        function showInfoTooltip(element) {
            const tooltip = element.parentElement.querySelector('.info-tooltip');
            if (tooltip) {
                tooltip.classList.remove('opacity-0');
                tooltip.classList.add('opacity-100');
            }
        }

        function hideInfoTooltip(element) {
            const tooltip = element.parentElement.querySelector('.info-tooltip');
            if (tooltip) {
                tooltip.classList.remove('opacity-100');
                tooltip.classList.add('opacity-0');
            }
        }
    </script>
@endif
