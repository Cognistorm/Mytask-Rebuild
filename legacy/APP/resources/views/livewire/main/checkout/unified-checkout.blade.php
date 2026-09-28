<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24"
     x-data="window.LjqGJmYrwJSjIHT">

    {{-- Loading --}}
    <x-forms.loading/>

    {{-- Empty state --}}
    <div class="max-w-4xl mx-auto mb-16">
        <div class="text-center">

            {{-- Texts --}}
            <h2 class="mt-4 text-base font-bold text-gray-700 dark:text-gray-100">{{ __('messages.t_checkout') }}</h2>
            @if(session()->has('message'))
                <h2 class="mt-4 text-base font-bold text-red-800 dark:text-red-800">{{ session('message') }}</h2>
            @endif

            {{-- Go back link based on type --}}
            @if($type === 'project')
                <a rel="nofollow"
                   class="text-[13px] font-medium mt-4 text-primary-600 hover:underline dark:text-primary-500"
                   href="{{ url('/account/projects/payments/' . $project->uid) }}">
                    @lang('messages.t_back_to_projects')
                </a>
            @elseif($type === 'offer')
                <a rel="nofollow"
                   class="text-[13px] font-medium mt-4 text-primary-600 hover:underline dark:text-primary-500"
                   href="{{ url('/account/offers') }}">
                    @lang('messages.t_back_to_offers')
                </a>
            @endif
        </div>
    </div>

    {{-- Form --}}
    <div class="grid grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto lg:divide-x lg:divide-gray-200 lg:dark:divide-zinc-700 rtl:divide-x-reverse space-y-10 lg:space-y-0"
         x-data="{
             selected_method: '',
             subtotal: {{ $subtotal }},
             tax: {{ $tax }},

             get feeAmount() {
                 if (this.selected_method === 'bog') {
                     return this.subtotal * 0.025; // 2.5% for BOG
                 }
                 return 0;
             },

             get feeText() {
                 if (this.selected_method === 'bog') {
                     return '2.5%';
                 }
                 return '-';
             },

             get totalAmount() {
                 return this.subtotal + this.tax + this.feeAmount;
             },

             // Format money display
             formatMoney(amount) {
                 return new Intl.NumberFormat('{{ app()->getLocale() }}', {
                     style: 'currency',
                     currency: '{{ settings('currency')->code }}',
                     minimumFractionDigits: 2
                 }).format(amount);
             }
         }">

        {{-- Available payment methods --}}
        <div class="space-y-6 lg:pr-10">

            <div class="flex items-center lg:justify-center rtl:space-x-reverse space-x-2 mb-10">

                <svg class="h-6 w-6 -mt-px dark:text-gray-200" stroke="currentColor" fill="currentColor"
                     stroke-width="0" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <path d="M216,48V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z"
                          opacity="0.2"></path>
                    <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208ZM140,80v96a8,8,0,0,1-16,0V95l-11.56,7.71a8,8,0,1,1-8.88-13.32l24-16A8,8,0,0,1,140,80Z"></path>
                </svg>

                <span class="text-base font-bold text-slate-500 tracking-wide dark:text-zinc-300">
                    @lang('messages.t_choose_ur_prefered_payment_method')
                </span>

            </div>

            <div class="space-y-4">

                {{-- Wallet Payment Option --}}
                @if(auth()->user()->balance_available > 0)
                    <div class="relative">
                        <input wire:model="selectedMethod"
                               x-model="selected_method"
                               class="sr-only peer"
                               type="radio"
                               value="wallet"
                               name="payment_method"
                               id="payment_method_wallet">

                        <label class="flex p-5 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 dark:hover:bg-zinc-700 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary-600 peer-checked:border-transparent"
                               for="payment_method_wallet">

                            <div class="ltr:ml-3 rtl:mr-3 text-sm">
                                <div class="font-medium text-gray-900 dark:text-gray-100">
                                    {{ __('messages.t_wallet') }}
                                </div>
                                <div class="text-gray-500 dark:text-gray-400">
                                    {{ __('messages.t_available_balance') }}: {{ money(auth()->user()->balance_available, settings('currency')->code, true) }}
                                </div>
                            </div>
                        </label>
                    </div>
                @endif

                {{-- Payment Methods --}}
                @foreach($payment_methods as $method)
                    <div class="relative">
                        <input wire:model="selectedMethod"
                               x-model="selected_method"
                               class="sr-only peer"
                               type="radio"
                               value="{{ $method->slug }}"
                               name="payment_method"
                               id="payment_method_{{ $method->slug }}">

                        <label class="flex p-5 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 dark:hover:bg-zinc-700 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary-600 peer-checked:border-transparent"
                               for="payment_method_{{ $method->slug }}">

                            <div class="ltr:ml-3 rtl:mr-3 text-sm">
                                <div class="font-medium text-gray-900 dark:text-gray-100">
                                    {{ $method->name }}
                                </div>
                                @if($method->description)
                                    <div class="text-gray-500 dark:text-gray-400">
                                        {{ $method->description }}
                                    </div>
                                @endif
                            </div>

                            @if($method->logo)
                                <div class="ltr:ml-auto rtl:mr-auto">
                                    <img src="{{ src($method->logo) }}" alt="{{ $method->name }}" class="h-8 w-auto">
                                </div>
                            @endif
                        </label>
                    </div>
                @endforeach

            </div>

        </div>

        {{-- Order summary --}}
        <div class="lg:pl-10">

            <div class="bg-gray-50 dark:bg-zinc-900 rounded-lg px-6 py-8">

                <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                        {{ __('messages.t_order_summary') }}
                </h2>

                <div class="space-y-4">

                    {{-- Item details --}}
                    @if($type === 'project' && $project)
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600 dark:text-gray-400">{{ __('messages.t_project') }}:</span>
                            <span class="font-medium text-gray-900 dark:text-gray-100">{{ Str::limit($project->title, 30) }}</span>
                        </div>
                    @elseif($type === 'offer' && $customOffer)
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600 dark:text-gray-400">{{ __('messages.t_offer') }}:</span>
                            <span class="font-medium text-gray-900 dark:text-gray-100">{{ Str::limit($customOffer->message, 30) }}</span>
                        </div>
                    @endif

                    {{-- Subtotal --}}
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 dark:text-gray-400">{{ __('messages.t_project_subtotal') }}:</span>
                        <span class="font-medium text-gray-900 dark:text-gray-100" x-text="formatMoney(subtotal)">{{ money($subtotal, settings('currency')->code, true) }}</span>
                    </div>

                    {{-- Tax --}}
                    @if($tax > 0)
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600 dark:text-gray-400">{{ __('messages.t_tax') }}:</span>
                            <span class="font-medium text-gray-900 dark:text-gray-100" x-text="formatMoney(tax)">{{ money($tax, settings('currency')->code, true) }}</span>
                        </div>
                    @endif

                    {{-- Fee --}}
                    <div class="flex justify-between text-sm" x-show="feeAmount > 0">
                        <span class="text-gray-600 dark:text-gray-400">
                            {{ __('messages.t_fee') }}
                            <span x-show="feeText !== '-'" x-text="'(' + feeText + ')'"></span>
                        </span>
                        <span class="font-medium text-gray-900 dark:text-gray-100" x-text="formatMoney(feeAmount)"></span>
                    </div>

                    {{-- Total --}}
                    <div class="border-t border-gray-200 dark:border-zinc-700 pt-4 mt-4">
                        <div class="flex justify-between text-base font-medium">
                            <span class="text-gray-900 dark:text-gray-100">{{ __('messages.t_total') }}:</span>
                            <span class="text-gray-900 dark:text-gray-100" x-text="formatMoney(totalAmount)">{{ money($total, settings('currency')->code, true) }}</span>
                        </div>
                    </div>

                </div>

                {{-- Pay button --}}
                <div class="mt-8">
                    <button type="button"
                            wire:click="confirm"
                            :disabled="!selected_method"
                            class="w-full bg-primary-600 border border-transparent rounded-lg py-3 px-4 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {{ __('messages.t_approve') }}
                    </button>
                </div>

            </div>

        </div>

    </div>

</div>
