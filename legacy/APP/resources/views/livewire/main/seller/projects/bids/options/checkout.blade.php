<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mb-16">
        <div class="mx-auto max-w-7xl">
            <div class="lg:flex lg:items-center lg:justify-between">
    
                <div class="min-w-0 flex-1">
    
                    {{-- Section heading --}}
                    <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                        @lang('messages.t_promote_ur_proposal')
                    </h2>
    
                    {{-- Breadcrumbs --}}
                    <div class="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6 rtl:space-x-reverse">
                        <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">

                            {{-- Main home --}}
                            <li>
                                <div class="flex items-center">
                                    <a href="{{ url('/') }}" class="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-zinc-300 dark:hover:text-white">
                                        @lang('messages.t_home')
                                    </a>
                                </div>
                            </li>
            
                            {{-- My dashboard --}}
                            <li aria-current="page">
                                <div class="flex items-center">
                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                                    <a href="{{ url('seller/home') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                                        @lang('messages.t_my_dashboard')
                                    </a>
                                </div>
                            </li>
            
                            {{-- Bids --}}
                            <li aria-current="page">
                                <div class="flex items-center">
                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                                    <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">
                                        @lang('messages.t_my_bids')
                                    </span>
                                </div>
                            </li>
            
                        </ol>
                    </div>
                    
                </div>
    
                {{-- Actions --}}
                <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4">

                    {{-- Back to proposals --}}
                    <span class="block">
                        <a href="{{ url('seller/projects/bids') }}" class="inline-flex items-center rounded-sm border border-gray-300 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus:ring-offset-zinc-900 dark:focus:ring-zinc-900">
                            @lang('messages.t_back_to_proposals')
                        </a>
                    </span>
        
                </div>
    
            </div>
        </div>
    </div>

    {{-- Content --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div class="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-5 gap-y-6">

            {{-- Checkout form --}}
            <div class="rounded-lg bg-white shadow-sm border-gray-200 border p-5 relative mb-4 dark:bg-zinc-800 dark:border-transparent dark:shadow-none">

                {{-- Section heading --}}
                <h4 class="text-base text-zinc-700 font-bold mb-1 dark:text-zinc-100">@lang('messages.t_promote_bid')</h4>
                <p class="leading-relaxed text-gray-500 mb-5 text-sm dark:text-zinc-400">
                    @lang('messages.t_promote_bid_subtitle')
                </p>

                {{-- Select a payment method --}}
                <h5 class="flex items-center my-8">
                    <span class="text-xs uppercase tracking-wide text-primary-600 font-semibold ltr:mr-3 rtl:ml-3">
                        @lang('messages.t_select_payment_method')    
                    </span> 
                    <span aria-hidden="true" class="grow bg-gray-100 rounded h-0.5 dark:bg-zinc-700"></span>
                </h5>

                {{-- Enabed payment mathods list --}}
                @if (!$selected_payment_method)
                    <fieldset class="mt-4">
                        <legend class="sr-only">
                            @lang('messages.t_select_payment_method')    
                        </legend>
                        <div class="space-y-5">

                            {{-- Paypal --}}
                            @if (settings('paypal')->is_enabled)
                                <div class="flex items-center">
                                    <input id="selected_payment_method_paypal" name="selected_payment_method" wire:model="selected_payment_method" value="paypal" type="radio" class="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:bg-zinc-600 dark:border-zinc-600 dark:focus:ring-zinc-400 dark:focus:ring-offset-zinc-800">
                                    <label for="selected_payment_method_paypal" class="flex items-center ltr:ml-3 rtl:mr-3 cursor-pointer">
                                        <span class="block text-sm font-semibold text-zinc-700 dark:text-zinc-200"> 
                                            {{ settings('paypal')->name }}    
                                        </span>
                                    </label>
                                </div>
                            @endif
                            
                        </div>
                    </fieldset>
                @endif

                
                {{-- Check selected payment method --}}
                @switch($selected_payment_method)

                    {{-- PayPal --}}
                    @case('paypal')

                        {{-- Calculate exchange rate --}}
                        @php
                            
                            $gateway_exchange_rate = (float)settings('paypal')->exchange_rate;
                            $exchange_total_amount = $this->calculateExchangeAmount($gateway_exchange_rate);

                        @endphp
                        
                        <div class="w-full md:max-w-xs mx-auto mt-12 block">

                            {{-- Paypal button --}}
                            <div id="paypal-button-container" wire:ignore></div>

                            <script>
                                // Render the PayPal button into #paypal-button-container
                                paypal.Buttons({

                                    // Set up the transaction
                                    createOrder: function(data, actions) {
                                        return actions.order.create({
                                            purchase_units: [{
                                                amount: {
                                                    value: '{{ $exchange_total_amount }}'
                                                }
                                            }]
                                        });
                                    },

                                    // Finalize the transaction
                                    onApprove: function(data, actions) {

                                        @this.checkout(data.orderID);

                                    }

                                    }).render('#paypal-button-container');
                            </script>

                        </div>

                        @break
                        
                    @default
                        
                @endswitch

            </div>

            {{-- Bid preview --}}
            <div class="w-full relative h-fit">
            
                {{-- Bid card --}}
                <div class="rounded-lg bg-white shadow-sm border-gray-200 border relative mb-4 dark:bg-zinc-800 dark:shadow-none px-4 py-5 sm:px-6 {{ $subscription->bid->is_highlight ? 'ltr:border-l-8 rtl:border-l-8 border-amber-300 dark:border-zinc-600' : '' }}">
                
                    {{-- Bid heading --}}
                    <div class="flex items-center justify-between mb-8">
                
                        {{-- Freelancer profile --}}
                        <div class="flex items-center space-x-4 rtl:space-x-reverse">
                
                            {{-- Avatar --}}
                            <a href="{{ url('profile', $subscription->bid->user->username) }}" target="_blank" class="block">
                                <img class="rounded-full h-12 w-12 object-cover object-center" src="{{ src($subscription->bid->user->avatar) }}" alt="{{ $subscription->bid->user->username }}">
                            </a>
                
                            {{-- User info --}}
                            <div class="space-y-0.5">
                
                                <div class="flex items-center">
                
                                    {{-- User fullname --}}
                                    @if ($subscription->bid->user->fullname)
                                        <span class="font-medium text-zinc-900 text-sm hover:text-black dark:text-zinc-200 ltr:pr-1 rtl:pl-1">
                                            {{ $subscription->bid->user->fullname }}
                                        </span>
                                    @endif
                
                                    {{-- Username --}}
                                    <a href="{{ url('profile', $subscription->bid->user->username) }}" class="font-medium text-gray-500 text-[13px] hover:text-primary-600 focus:text-primary-600 inline-flex items-center">
                                        <svg class="w-4 h-4" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10c1.466 0 2.961-.371 4.442-1.104l-.885-1.793C14.353 19.698 13.156 20 12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8v1c0 .692-.313 2-1.5 2-1.396 0-1.494-1.819-1.5-2V8h-2v.025A4.954 4.954 0 0 0 12 7c-2.757 0-5 2.243-5 5s2.243 5 5 5c1.45 0 2.748-.631 3.662-1.621.524.89 1.408 1.621 2.838 1.621 2.273 0 3.5-2.061 3.5-4v-1c0-5.514-4.486-10-10-10zm0 13c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3z"></path></svg>
                                        <span>{{ $subscription->bid->user->username }}</span>
                                    </a>
                
                                </div>
                
                                {{-- User details --}}
                                <div class="flex items-center space-x-3 rtl:space-x-reverse text-[13px] dark:text-zinc-400">
                
                                    {{-- Country --}}
                                    @if ($subscription->bid->user->country)
                                        <p class="flex items-center space-x-1 rtl:space-x-reverse">
                                            <img class="h-4 ltr:pr-0.5 rtl:pl-0.5 -mt-0.5 lazy" src="{{ placeholder_img() }}" data-src="{{ countryFlag($subscription->bid->user->country->code) }}" alt="{{ $subscription->bid->user->country->name }}">
                                        </p>
                
                                        <div class="mx-2 my-0.5 text-gray-300 dark:text-zinc-600">|</div>
                                    @endif
                
                                    {{-- Rating --}}
                                    <p class="flex shrink-0 items-center space-x-1 rtl:space-x-reverse">
                                        <svg aria-hidden="true" class="w-4 h-4 {{ $subscription->bid->user->rating() == 0 ? 'text-gray-400' : 'text-amber-500' }} -mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                        <span>
                                            {{ $subscription->bid->user->rating() }}
                                        </span>
                                    </p>
                
                                    {{-- Verified account --}}
                                    @if ($subscription->bid->user->status === 'verified')
                                        <div class="mx-2 my-0.5 text-gray-300 dark:text-zinc-600">|</div>
                                        <div class="flex shrink-0 items-center space-x-1 rtl:space-x-reverse">
                                            <svg class="w-4 h-4 text-blue-500 -mt-0.5" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                                            <span>@lang('messages.t_verified')</span>
                                        </div>
                                    @endif
                
                                </div>
                
                            </div>
                
                        </div>
                        
                        {{-- Budget --}}
                        <div class="shrink-0">
                            <div class="flex items-center justify-between space-x-2 rtl:space-x-reverse">
            
                                {{-- Budget --}}
                                @if ($subscription->bid->amount && $subscription->bid->days)
                                    <span class="flex items-center text-sm font-normal text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 px-3 py-2 rounded-md">
                                        <span class="font-semibold text-zinc-800 dark:text-zinc-200">{{ money($subscription->bid->amount, settings('currency')->code, true) }}</span>
                                        <span class="mx-2">/</span>
                                        <div>
                                            @if ($subscription->bid->days === 1)
                                                {{ $subscription->bid->days }} {{ strtolower(__('messages.t_day')) }}
                                            @else
                                                {{ $subscription->bid->days }} {{ strtolower(__('messages.t_days')) }}
                                            @endif	
                                        </div>
                                    </span>
                                @endif
            
                            </div>
                        </div>
                                    
                    </div>
                    
                    {{-- Bid message --}}
                    @if ($subscription->bid->is_sealed)
                        <div class="flex flex-col items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-gray-500 sm:flex-row sm:px-5 dark:border-zinc-700 dark:text-zinc-400">
                            
                            {{-- Info --}}
                            <div class="flex items-center space-x-3 rtl:space-x-reverse">
                                <svg class="w-5 h-5 text-slate-400 flex-none ltr:-ml-2 rtl:-mr-2" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M11 11h2v6h-2zm0-4h2v2h-2z"></path></svg>
                                <p class="text-sm">@lang('messages.t_this_bid_sealed_explain')</p>
                            </div>
                
                            {{-- Badge --}}
                            <span class="text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-0 font-medium rounded-full text-xs tracking-wide px-8 py-2 text-center ltr:ml-6 rtl:mr-6">
                                @lang('messages.t_sealed')
                            </span>
                            
                        </div>
                    @else
                        <p class="mb-2 font-light text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            {!! nl2br($subscription->bid->message) !!}
                        </p>
                    @endif
                
                    {{-- Bid footer --}}
                    <div class="mt-6 flex justify-between items-center">
                        <div class="space-x-2 rtl:space-x-reverse"></div>
                
                        <aside class="flex items-center mt-3 space-x-5 rtl:space-x-reverse text-xs text-gray-500 dark:text-zinc-300">
                
                            {{-- Sponsored --}}
                            @if ($subscription->bid->is_sponsored)
                                <div class="flex items-center space-x-1 rtl:space-x-reverse">
                                    <svg class="w-4 h-4 text-gray-400" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.219 3.375 8 7.399 4.781 3.375A1.002 1.002 0 0 0 3 4v15c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V4a1.002 1.002 0 0 0-1.781-.625L16 7.399l-3.219-4.024c-.381-.474-1.181-.474-1.562 0zM5 19v-2h14.001v2H5zm10.219-9.375c.381.475 1.182.475 1.563 0L19 6.851 19.001 15H5V6.851l2.219 2.774c.381.475 1.182.475 1.563 0L12 5.601l3.219 4.024z"></path></svg>
                                    <span>{{ __('messages.t_sponsored') }}</span>
                                </div>
                            @endif
                
                            {{-- Date --}}
                            <div class="flex items-center space-x-1 rtl:space-x-reverse">
                                <svg class="w-4 h-4 text-gray-400" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4c-4.879 0-9 4.121-9 9s4.121 9 9 9 9-4.121 9-9-4.121-9-9-9zm0 16c-3.794 0-7-3.206-7-7s3.206-7 7-7 7 3.206 7 7-3.206 7-7 7z"></path><path d="M13 12V8h-2v6h6v-2zm4.284-8.293 1.412-1.416 3.01 3-1.413 1.417zm-10.586 0-2.99 2.999L2.29 5.294l2.99-3z"></path></svg>
                                <span>{{ format_date($subscription->bid->created_at, 'ago') }}</span>
                            </div>
                
                        </aside>
                
                    </div>
                
                </div>
            </div>

            {{-- Order summary --}}
            <div class="w-full col-span-2">
                <div class="rounded-lg bg-white shadow-sm border-gray-200 border relative mb-4 dark:bg-zinc-800 dark:border-transparent dark:shadow-none py-6 px-6 lg:py-8">

                    <h1 class="font-bold text-base text-zinc-900 mb-6 dark:text-zinc-100">@lang('messages.t_selected_upgrades')</h1>

                    <div class="divide-y divide-gray-100 dark:divide-zinc-700 text-sm lg:mt-0">

                        {{-- Sponsored plan --}}
                        @if ($subscription->bid?->is_sponsored)
                            @php
                                $sponsored = \App\Models\ProjectBiddingPlan::wherePlanType('sponsored')->first();
                            @endphp
                            @if ($sponsored)
                                <div class="pb-4 flex items-center justify-between">
                                    <dt class="text-gray-600 dark:text-zinc-300">
                                        <span class="font-semibold px-3 py-1 rounded-sm text-[13px] tracking-wide" style="color: {{ $sponsored->badge_text_color }};background-color: {{ $sponsored->badge_bg_color }}">
                                            {{ __('messages.t_' . $sponsored->plan_type) }}
                                        </span>
                                        <p class="text-[13px] mt-2">
                                            {{ __('messages.t_bidding_plan_' . $sponsored->plan_type . '_subtitle') }}
                                        </p>    
                                    </dt>
                                    <dd class="font-medium text-gray-900 ltr:pl-10 rtl:pr-10 dark:text-white">
                                        {{ money($sponsored->price, settings('currency')->code, true) }}
                                    </dd>
                                </div>
                            @endif
                        @endif

                        {{-- Sealed plan --}}
                        @if ($subscription->bid?->is_sealed)
                            @php
                                $sealed = \App\Models\ProjectBiddingPlan::wherePlanType('sealed')->first();
                            @endphp
                            @if ($sealed)
                                <div class="py-4 flex items-center justify-between">
                                    <dt class="text-gray-600 dark:text-zinc-300">
                                        <span class="font-semibold px-3 py-1 rounded-sm text-[13px] tracking-wide" style="color: {{ $sealed->badge_text_color }};background-color: {{ $sealed->badge_bg_color }}">
                                            {{ __('messages.t_' . $sealed->plan_type) }}
                                        </span>
                                        <p class="text-[13px] mt-2">
                                            {{ __('messages.t_bidding_plan_' . $sealed->plan_type . '_subtitle') }}
                                        </p>    
                                    </dt>
                                    <dd class="font-medium text-gray-900 ltr:pl-10 rtl:pr-10 dark:text-white">
                                        {{ money($sealed->price, settings('currency')->code, true) }}
                                    </dd>
                                </div>
                            @endif
                        @endif

                        {{-- Highlight plan --}}
                        @if ($subscription->bid?->is_highlight)
                            @php
                                $highlight = \App\Models\ProjectBiddingPlan::wherePlanType('highlight')->first();
                            @endphp
                            @if ($highlight)
                                <div class="py-4 flex items-center justify-between">
                                    <dt class="text-gray-600 dark:text-zinc-300">
                                        <span class="font-semibold px-3 py-1 rounded-sm text-[13px] tracking-wide" style="color: {{ $highlight->badge_text_color }};background-color: {{ $highlight->badge_bg_color }}">
                                            {{ __('messages.t_' . $highlight->plan_type) }}
                                        </span>
                                        <p class="text-[13px] mt-2">
                                            {{ __('messages.t_bidding_plan_' . $highlight->plan_type . '_subtitle') }}
                                        </p>    
                                    </dt>
                                    <dd class="font-medium text-gray-900 ltr:pl-10 rtl:pr-10 dark:text-white">
                                        {{ money($highlight->price, settings('currency')->code, true) }}
                                    </dd>
                                </div>
                            @endif
                        @endif

                        {{-- Total --}}
                        <div class="pt-4 flex items-center justify-between">
                            <dt class="font-medium text-gray-900 dark:text-zinc-100">@lang('messages.t_total')</dt>
                            <dd class="font-medium text-primary-600">
                                {{ money($subscription->amount, settings('currency')->code, true) }}
                            </dd>
                        </div>

                    </div>
                </div>
                
                {{-- Secure payment --}}
                <div class="flex items-center space-x-2 rtl:space-x-reverse justify-center mt-5 text-green-500 dark:text-green-400">
                    <svg class="w-6 h-6" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.995 6.9a.998.998 0 0 0-.548-.795l-8-4a1 1 0 0 0-.895 0l-8 4a1.002 1.002 0 0 0-.547.795c-.011.107-.961 10.767 8.589 15.014a.987.987 0 0 0 .812 0c9.55-4.247 8.6-14.906 8.589-15.014zM12 19.897C5.231 16.625 4.911 9.642 4.966 7.635L12 4.118l7.029 3.515c.037 1.989-.328 9.018-7.029 12.264z"></path><path d="m11 12.586-2.293-2.293-1.414 1.414L11 15.414l5.707-5.707-1.414-1.414z"></path></svg>
                    <span class="text-sm font-medium">@lang('messages.t_ur_transaction_is_secure')</span>
                </div>
            </div>

        </div>
    </div>

</div>

@push('styles')

    {{-- PayPal SDK --}}
    @if (settings('paypal')->is_enabled)

        {{-- Get client id and curency --}}
        @php
            $paypal_client_id = config('paypal.mode') === 'sandbox' ? config('paypal.sandbox.client_id') : config('paypal.live.client_id');
            $currency         = config('paypal.currency');
        @endphp

        {{-- SDK --}}
        <script src="https://www.paypal.com/sdk/js?client-id={{ $paypal_client_id }}&currency={{ $currency }}"></script>

    @endif

@endpush