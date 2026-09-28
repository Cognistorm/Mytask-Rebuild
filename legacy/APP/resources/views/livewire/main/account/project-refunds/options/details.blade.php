@php use App\Enums\ProjectRefundStatus; @endphp
<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 lg:pt-16 lg:pb-24">

    {{-- Loading --}}
    <x-forms.loading/>

    <div class="px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div
                class="divide-y divide-gray-200 dark:divide-zinc-700 lg:grid lg:grid-cols-12 lg:divide-y-0 lg:divide-x rtl:divide-x-reverse">

                {{-- Section content --}}
                <div class="divide-y divide-gray-200 dark:divide-zinc-700 col-span-12">

                    {{-- Header --}}
                    <div class="py-6 px-4 sm:p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-base leading-6 font-bold text-gray-900 dark:text-gray-100">
                                    {{ __('messages.t_refund_details') }}
                                </h2>
                            </div>
                            <div class="flex items-center space-x-2 rtl:space-x-reverse">
                                @switch($refund->status->value)
                                    @case('pending')
                                        <span
                                            class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                                            {{ __('messages.t_pending') }}
                                        </span>
                                        @break
                                    @case('accepted_by_seller')
                                        <span
                                            class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                            {{ __('messages.t_accepted') }}
                                        </span>
                                        @break
                                    @case('rejected_by_seller')
                                        <span
                                            class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                                            {{ __('messages.t_rejected') }}
                                        </span>
                                        @break
                                    @default
                                        <span
                                            class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                                            {{ $refund->status->label() }}
                                        </span>
                                @endswitch
                                @if (!$refund->request_admin_intervention && $refund->status !== ProjectRefundStatus::ACCEPTED_BY_SELLER)
                                        @php
                                            $expiresAt = $refund->created_at?->copy()->addHours(48);
                                            $showPendingTooltip = $refund && $refund->status === ProjectRefundStatus::PENDING && $expiresAt && $expiresAt->isFuture();
                                            $remainingHuman = $expiresAt ? $expiresAt->diffForHumans(now(), true, false, 2) : null;
                                        @endphp

                                        <button
                                        @if($showPendingTooltip)
                                            data-tooltip-target="tooltip-refund-disabled-{{ $refund->id }}"
                                        @endif
                                        @disabled($refund->status !== ProjectRefundStatus::REJECTED_BY_SELLER)
                                        x-on:click="confirm('{{ __('messages.t_are_u_sure_raise_dispute_refund', ['app_name' => config('app.name')]) }}') ? $wire.raise : ''"
                                        wire:loading.attr="disabled" wire:target="raise" type="button"
                                        class="disabled:opacity-50 inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-500 rounded-sm shadow-sm text-[13px] font-medium text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900 hover:bg-red-100 dark:hover:bg-red-800 focus:outline-none focus:ring-red-600">

                                        {{-- Loading indicator --}}
                                        <div wire:loading wire:target="raise">
                                            <svg role="status"
                                                 class="ltr:-ml-1 rtl:-mr-1 ltr:mr-2 rtl:ml-2 h-4 w-4 text-gray-700 animate-spin"
                                                 viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                    fill="#E5E7EB"/>
                                                <path
                                                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                    fill="currentColor"/>
                                            </svg>
                                        </div>

                                        {{-- Icon --}}
                                        <div wire:loading.remove wire:target="raise">
                                            <svg xmlns="http://www.w3.org/2000/svg"
                                                 class="ltr:-ml-1 rtl:-mr-1 ltr:mr-2 rtl:ml-2 h-4 w-4 text-gray-400"
                                                 viewBox="0 0 20 20" fill="#b91c1c">
                                                <path fill-rule="evenodd"
                                                      d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0710 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                                                      clip-rule="evenodd" fill="#dc2626"/>
                                            </svg>
                                        </div>

                                        <span class="text-xs font-medium">{{ __('messages.t_raise_a_dispute') }}</span>
                                    </button>

                                    @if($showPendingTooltip)
                                        <x-forms.tooltip
                                            id="tooltip-refund-disabled-{{ $refund->id }}"
                                            text="{{ __('messages.t_left') . ' ' . $remainingHuman }}"
                                        />
                                    @endif
                                @endif
                            </div>
                        </div>
                    </div>

                    {{-- Project Details --}}
                    <div class="py-6 px-4 sm:p-6">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            {{ __('messages.t_project_details') }}
                        </h3>
                        <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_project_title') }}</dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ $refund->project->title }}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_freelancer') }}</dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ $refund->freelancer->username ?? __('messages.t_n_a') }}</dd>
                                </div>
                                @if($refund->project->awarded_bid)
                                    <div>
                                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_budget') }}</dt>
                                        <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ money($refund->project->awarded_bid->amount, settings('currency')->code, true) }}</dd>
                                    </div>
                                @endif
                                <div>
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ __('messages.t_request_date') }}</dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ format_date($refund->created_at) }}</dd>
                                </div>
                            </div>
                        </div>
                    </div>

                    {{-- Refund Reason --}}
                    <div class="py-6 px-4 sm:p-6">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            {{ __('messages.t_refund_reason') }}
                        </h3>
                        <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
                            <p class="text-sm text-gray-900 dark:text-gray-100">{{ $refund->reason }}</p>
                        </div>
                    </div>


                    @php
                        $expiresAtNotice = $refund->created_at?->copy()->addHours(48);
                    @endphp

                    @if ($refund->status === ProjectRefundStatus::PENDING && $expiresAtNotice && $expiresAtNotice->isFuture())
                        <div class="mt-4 rounded-md bg-yellow-50 p-4 dark:bg-yellow-800">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-yellow-500"
                                         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                         fill="currentColor" aria-hidden="true">
                                        <path fill-rule="evenodd"
                                              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0010 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                                              clip-rule="evenodd"/>
                                    </svg>
                                </div>
                                <div class="ltr:ml-3 rtl:mr-3">
                                    <p class="text-sm font-medium text-yellow-800 dark:text-yellow-100">
                                        {{ __('messages.t_refund_request_warning') }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    @endif
                </div>

            </div>
        </div>
    </div>

</div>

{{-- Conversation scripts removed --}}
