<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24">

    <div class="px-4 sm:px-6 lg:px-8">

        <div class="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">

            <div
                class="divide-y divide-gray-200 dark:divide-zinc-700 lg:grid lg:grid-cols-12 lg:divide-y-0 lg:divide-x rtl:divide-x-reverse">

                {{-- Sidebar --}}
                <aside class="lg:col-span-3 py-6 hidden lg:block">
                    <livewire:main.account.sidebar-component />
                </aside>

                {{-- Main Content --}}
                <div class="lg:col-span-9 py-6 px-4 sm:px-6 lg:px-8">

                    {{-- Page Header --}}
                    <div class="mb-8">
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ __('messages.t_my_subscription') }}</h1>
                    </div>

                    {{-- Current Subscription Status --}}
                    <div
                        class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 p-6 mb-6">

                        @if(($subscriptionStatus === 'active' || $subscriptionStatus === 'canceled') && $currentSubscription)
                            {{-- Active or Canceled Subscription --}}
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center">
                                    @if($subscriptionStatus === 'canceled')
                                        <div class="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ __('messages.t_canceled_subscription') }}</h2>
                                    @else
                                        <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ __('messages.t_active_subscription') }}</h2>
                                    @endif
                                </div>
                            </div>

                            {{-- Plan Details --}}
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_plan_name') }}</h3>
                                    <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ $planDetails->name ?? 'N/A' }}</p>
                                </div>
                                <div>
                                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_price') }}</h3>
                                    <p class="mt-1 text-sm text-gray-900 dark:text-white">
                                        @if($planDetails && $planDetails->price > 0)
                                            ₾{{ number_format($planDetails->price, 2) }}
                                        @else
                                            {{ __('messages.t_free') }}
                                        @endif
                                    </p>
                                </div>
                                <div>
                                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_started_at') }}</h3>
                                    <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ $currentSubscription->starts_at->format('d/m/Y') }}</p>
                                </div>
                                <div>
                                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_expiration_date') }}</h3>
                                    <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ $currentSubscription->ends_at->format('d/m/Y') }}</p>
                                </div>
                            </div>

                            {{-- Actions --}}
                            <div class="flex flex-col sm:flex-row gap-3">
                                <a href="{{ route('main.subscription') }}"
                                   class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600">
                                    {{ __('messages.t_view_plans') }}
                                </a>
                                @if($subscriptionStatus === 'active')
                                    <button id="modal-cancel-subscription-button"
                                            class="inline-flex justify-center items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:text-gray-300 dark:border-red-700 dark:hover:bg-red-800">
                                        {{ __('messages.t_cancel_subscription') }}
                                    </button>
                                @endif
                            </div>

                        @else
                            <div class="text-center py-8">
                                <div class="w-12 h-12 mx-auto mb-4 text-gray-400">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">{{ __('messages.t_no_active_subscription') }}</h3>

                                <a href="{{ route('main.subscription') }}"
                                   class="inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                    {{ __('messages.t_view_plans') }}
                                </a>
                            </div>
                        @endif
                    </div>

                </div>

            </div>

        </div>
    </div>

    {{-- Cancel Subscription Confirmation Modal --}}
    @if($subscriptionStatus === 'active' && $currentSubscription)
        <x-forms.modal id="modal-cancel-subscription-container"
                       target="modal-cancel-subscription-button"
                       uid="modal_cancel_subscription_{{ uid() }}"
                       placement="center-center"
                       size="max-w-md">

            {{-- Header --}}
            <x-slot name="title">{{ __('messages.t_cancel_subscription') }}</x-slot>

            {{-- Content --}}
            <x-slot name="content">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                        <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {{ __('messages.t_are_you_sure_cancel_subscription') }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {{ __('messages.t_cancel_subscription_warning') }}
                    </p>
                    @if($planDetails)
                        <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 mb-4">
                            <p class="text-sm text-gray-700 dark:text-gray-300">
                                <strong>{{ __('messages.t_current_plan') }}:</strong> {{ $planDetails->name }}
                            </p>
                            <p class="text-sm text-gray-700 dark:text-gray-300">
                                <strong>{{ __('messages.t_expires_on') }}:</strong> {{ $currentSubscription->ends_at->format('d/m/Y') }}
                            </p>
                        </div>
                    @endif
                </div>
            </x-slot>

            {{-- Footer --}}
            <x-slot name="footer">
                <div class="flex justify-center space-x-4">
                    <button type="button"
                            x-on:click="close"
                            class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        {{ __('messages.t_cancel') }}
                    </button>
                    <button type="button"
                            wire:click="cancelSubscription"
                            x-on:click="close"
                            class="ml-3 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800">
                        {{ __('messages.t_approve') }}
                    </button>
                </div>
            </x-slot>

        </x-forms.modal>
    @endif
</div>
