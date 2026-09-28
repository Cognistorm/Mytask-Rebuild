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
                        @lang('messages.t_edit_my_proposal')
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

                    {{-- View project --}}
                    <span class="sm:ltr:ml-3 sm:rtl:mr-3">
						<a href="{{ url('project/' . $bid->project->pid . '/' . $bid->project->slug) }}" target="_blank" class="inline-flex items-center rounded-sm border border-transparent bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
							@lang('messages.t_view_project')
						</a>
					</span>
        
                </div>
    
            </div>
        </div>
    </div>

    {{-- Content --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div class="grid grid-cols-1 {{ settings('projects')->is_premium_bidding && $can_promote ? 'lg:grid-cols-2 lg:gap-x-5' : '' }} gap-y-6">

            {{-- Bid form --}}
            <div class="bg-white shadow-sm border border-gray-200 px-9 py-10 rounded-lg dark:bg-zinc-800 dark:border-transparent">
                <h4 class="text-base text-zinc-700 font-bold mb-8 dark:text-zinc-100">@lang('messages.t_my_proposal')</h4>
                <div class="grid grid-cols-12 md:gap-x-6 gap-y-6 py-2">
		
                    {{-- Amount --}}
                    <div class="col-span-12 md:col-span-6">
                        <x-forms.text-input
                            :label="__('messages.t_bid_amount')"
                            placeholder="0.00"
                            model="bid_amount"
                            :suffix="settings('currency')->code"
                            hint="{{ money(convertToNumber($bid->project->budget_min),settings('currency')->code, true) }} / {{ money(convertToNumber($bid->project->budget_max),settings('currency')->code, true) }}" />
                    </div>

                    {{-- Paid to you --}}
                    <div class="col-span-12 md:col-span-6">
                        <x-forms.text-input disabled readonly
                            :label="__('messages.t_paid_to_you')"
                            placeholder="0.00"
                            model="bid_amount_paid"
                            :suffix="settings('currency')->code"
                            :hint="__('messages.t_bid_paid_to_you_tooltip')" />
                    </div>

                    {{-- Days --}}
                    <div class="col-span-12">
                        <x-forms.text-input
                            :label="__('messages.t_this_project_will_be_delivered_in')"
                            model="bid_days"
                            :suffix="mb_strtoupper(__('messages.t_days'))" />
                    </div>

                    {{-- Description --}}
                    <div class="col-span-12">
                        <x-forms.textarea
                            :label="__('messages.t_describe_ur_proposal')"
                            :placeholder="__('messages.t_describe_ur_proposal_placeholder')"
                            model="bid_description"
                            :rows="8"
                            svg_icon='<svg class="w-5 h-5 text-gray-500" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.045 7.401c.378-.378.586-.88.586-1.414s-.208-1.036-.586-1.414l-1.586-1.586c-.378-.378-.88-.586-1.414-.586s-1.036.208-1.413.585L4 13.585V18h4.413L19.045 7.401zm-3-3 1.587 1.585-1.59 1.584-1.586-1.585 1.589-1.584zM6 16v-1.585l7.04-7.018 1.586 1.586L7.587 16H6zm-2 4h16v2H4z"></path></svg>' />
                    </div>

                    {{-- Update --}}
                    <div class="col-span-12">
					    <x-forms.button action="update" text="{{ __('messages.t_update') }}" :block="1"  />
                    </div>

                </div>
            </div>

            {{-- Promote bid --}}
            @if (settings('projects')->is_premium_bidding && $plans && $can_promote)
                <div class="bg-white shadow-sm border border-gray-200 px-9 py-10 rounded-lg dark:bg-zinc-800 dark:border-transparent">
                    <fieldset>
                        
                        {{-- Section title --}}
                        <legend class="text-base text-zinc-700 font-bold mb-8 dark:text-zinc-100">@lang('messages.t_optional_upgrades')</legend>

                        <div class="space-y-2 divide-y divide-gray-200 dark:divide-zinc-700 w-full">
                            @foreach ($plans as $plan)

                                {{-- Sponsored --}}
                                @if ($plan->plan_type === 'sponsored' && !$bid->is_sponsored)
                                    <div class="relative flex items-center w-full py-4">
                                        <div class="flex items-center h-5">
                                            <input id="bid-promotion-plan-{{ $plan->uid }}" name="bidding_selected_plans" wire:model.defer="bid_{{ $plan->plan_type }}" value="{{ $plan->uid }}" type="checkbox" class="focus:ring-transparent focus:outline-none ring-offset-0 focus:shadow-none h-5 w-5 text-primary-600 border-gray-300 border-2 rounded-sm cursor-pointer dark:bg-transparent dark:border-zinc-600 dark:text-zinc-500 dark:focus:ring-offset-zinc-500">
                                        </div>
                                        <div class="ltr:ml-4 rtl:mr-4 text-sm w-full">
                                            <label for="bid-promotion-plan-{{ $plan->uid }}" class="font-medium text-gray-700 flex items-center justify-between">
                
                                                {{-- Badge --}}
                                                <div class="inline-flex px-2 py-1 rounded-full text-xs font-medium tracking-widest uppercase min-w-[120px] justify-center" style="color: {{ $plan->badge_text_color }};background-color: {{ $plan->badge_bg_color }};">
                                                    @lang('messages.t_' . $plan->plan_type)
                                                </div>
                                                
                                                {{-- Price --}}
                                                <span class="text-sm font-semibold text-zinc-700 bg-gray-100 rounded-md px-3 py-2 dark:bg-zinc-900 dark:text-zinc-200">{{ money($plan->price, settings('currency')->code, true) }}</span>
                
                                            </label>
                
                                            {{-- Description --}}
                                            <p class="text-gray-600 dark:text-zinc-300 leading-relaxed mt-2">
                                                {{ __('messages.t_bidding_plan_' . $plan->plan_type . '_subtitle') }}
                                            </p>
                                            
                                        </div>
                                    </div>
                                @endif

                                {{-- Sealed --}}
                                @if ($plan->plan_type === 'sealed' && !$bid->is_sealed)
                                    <div class="relative flex items-center w-full py-4">
                                        <div class="flex items-center h-5">
                                            <input id="bid-promotion-plan-{{ $plan->uid }}" name="bidding_selected_plans" wire:model.defer="bid_{{ $plan->plan_type }}" value="{{ $plan->uid }}" type="checkbox" class="focus:ring-transparent focus:outline-none ring-offset-0 focus:shadow-none h-5 w-5 text-primary-600 border-gray-300 border-2 rounded-sm cursor-pointer dark:bg-transparent dark:border-zinc-600 dark:text-zinc-500 dark:focus:ring-offset-zinc-500">
                                        </div>
                                        <div class="ltr:ml-4 rtl:mr-4 text-sm w-full">
                                            <label for="bid-promotion-plan-{{ $plan->uid }}" class="font-medium text-gray-700 flex items-center justify-between">
                
                                                {{-- Badge --}}
                                                <div class="inline-flex px-2 py-1 rounded-full text-xs font-medium tracking-widest uppercase min-w-[120px] justify-center" style="color: {{ $plan->badge_text_color }};background-color: {{ $plan->badge_bg_color }};">
                                                    @lang('messages.t_' . $plan->plan_type)
                                                </div>
                                                
                                                {{-- Price --}}
                                                <span class="text-sm font-semibold text-zinc-700 bg-gray-100 rounded-md px-3 py-2 dark:bg-zinc-900 dark:text-zinc-200">{{ money($plan->price, settings('currency')->code, true) }}</span>
                
                                            </label>
                
                                            {{-- Description --}}
                                            <p class="text-gray-600 dark:text-zinc-300 leading-relaxed mt-2">
                                                {{ __('messages.t_bidding_plan_' . $plan->plan_type . '_subtitle') }}
                                            </p>
                                            
                                        </div>
                                    </div>
                                @endif

                                {{-- Highlighted --}}
                                @if ($plan->plan_type === 'highlight' && !$bid->is_highlight)
                                    <div class="relative flex items-center w-full py-4">
                                        <div class="flex items-center h-5">
                                            <input id="bid-promotion-plan-{{ $plan->uid }}" name="bidding_selected_plans" wire:model.defer="bid_{{ $plan->plan_type }}" value="{{ $plan->uid }}" type="checkbox" class="focus:ring-transparent focus:outline-none ring-offset-0 focus:shadow-none h-5 w-5 text-primary-600 border-gray-300 border-2 rounded-sm cursor-pointer dark:bg-transparent dark:border-zinc-600 dark:text-zinc-500 dark:focus:ring-offset-zinc-500">
                                        </div>
                                        <div class="ltr:ml-4 rtl:mr-4 text-sm w-full">
                                            <label for="bid-promotion-plan-{{ $plan->uid }}" class="font-medium text-gray-700 flex items-center justify-between">
                
                                                {{-- Badge --}}
                                                <div class="inline-flex px-2 py-1 rounded-full text-xs font-medium tracking-widest uppercase min-w-[120px] justify-center" style="color: {{ $plan->badge_text_color }};background-color: {{ $plan->badge_bg_color }};">
                                                    @lang('messages.t_' . $plan->plan_type)
                                                </div>
                                                
                                                {{-- Price --}}
                                                <span class="text-sm font-semibold text-zinc-700 bg-gray-100 rounded-md px-3 py-2 dark:bg-zinc-900 dark:text-zinc-200">{{ money($plan->price, settings('currency')->code, true) }}</span>
                
                                            </label>
                
                                            {{-- Description --}}
                                            <p class="text-gray-600 dark:text-zinc-300 leading-relaxed mt-2">
                                                {{ __('messages.t_bidding_plan_' . $plan->plan_type . '_subtitle') }}
                                            </p>
                                            
                                        </div>
                                    </div>
                                @endif

                            @endforeach
                        </div>
                        
                    </fieldset>
                </div>
            @endif

        </div>
    </div>

</div>

@push('scripts')
    <script>

        // Get bid amount element
        const target_bid_amount      = document.getElementById('text-input-component-id-bid_amount');

        // Get bid amount paid
        const target_bid_amount_paid = document.getElementById('text-input-component-id-bid_amount_paid');

        // Calculate net profit
        const calculateProfit = function(e) {

            // Get amount
            const amount     = e.target.value;

            // Set type
            const type       = "{{ settings('projects')->commission_type }}";

            // Set commission
            const commission = {{ settings('projects')->commission_from_freelancer }};

            // Check if number
            if (!isNaN(amount)) {
                
                // Check fixed
                if (type === 'fixed') {
                    
                    // Get value
                    const value = amount - commission;

                    // Check value
                    if (value % 1 != 0) {
                        
                        // Set value
                        target_bid_amount_paid.value = (Math.round(value * 100) / 100).toFixed(2);
                        
                    } else {
                        
                        // Set value
                        target_bid_amount_paid.value = value;

                    }

                }

                // Check percentage
                if (type === 'percentage') {
                
                    // Get value
                    const value = (amount * commission) / 100;

                    // Check value
                    if ((amount - value) % 1 != 0) {
                        
                        // Set value
                        target_bid_amount_paid.value = (Math.round((amount - value) * 100) / 100).toFixed(2);
                        
                    } else {
                        
                        // Set value
                        target_bid_amount_paid.value = amount - value;
                        
                    }

                }

            }

        }

        // Fire event
        target_bid_amount.addEventListener('input', calculateProfit);

    </script>
@endpush