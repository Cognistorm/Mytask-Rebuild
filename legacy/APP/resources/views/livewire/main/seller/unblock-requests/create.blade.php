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
                        @lang('messages.t_create_unblock_request')
                    </h2>

                    {{-- Breadcrumbs --}}
                    <div class="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6 rtl:space-x-reverse">
                        <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">

                            {{-- Main home --}}
                            <li>
                                <div class="flex items-center">
                                    <a href="{{ url('/') }}"
                                       class="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-zinc-300 dark:hover:text-white">
                                        @lang('messages.t_home')
                                    </a>
                                </div>
                            </li>

                            {{-- My dashboard --}}
                            <li aria-current="page">
                                <div class="flex items-center">
                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180"
                                         fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              clip-rule="evenodd"></path>
                                    </svg>
                                    <a href="{{ url('seller/home') }}"
                                       class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                                        @lang('messages.t_my_dashboard')
                                    </a>
                                </div>
                            </li>

                            {{-- Unblock Requests --}}
                            <li aria-current="page">
                                <div class="flex items-center">
                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180"
                                         fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              clip-rule="evenodd"></path>
                                    </svg>
                                    <a href="{{ url('seller/unblock-requests') }}"
                                       class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                                        @lang('messages.t_unblock_money_requests')
                                    </a>
                                </div>
                            </li>

                            {{-- Create --}}
                            <li aria-current="page">
                                <div class="flex items-center">
                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180"
                                         fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              clip-rule="evenodd"></path>
                                    </svg>
                                    <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">
                                        @lang('messages.t_create')
                                    </span>
                                </div>
                            </li>

                        </ol>
                    </div>

                </div>

                {{-- Actions --}}
                <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4">
                    <span class="block ltr:mr-3 rtl:ml-3">
                        <a href="{{ $type === 'order' ? url('seller/orders') : url('seller/projects') }}"
                           class="inline-flex items-center rounded-sm border border-gray-300 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus:ring-offset-zinc-900 dark:focus:ring-zinc-900">
                            @if($type === 'order')
                                @lang('messages.t_back_to_orders')
                            @else
                                @lang('messages.t_back_to_awarded_projects')
                            @endif
                        </a>
                    </span>
                </div>
            </div>
        </div>
    </div>

    {{-- Content --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div class="max-w-3xl mx-auto">

            {{-- Form --}}
            <div class="bg-white dark:bg-zinc-800 shadow rounded-lg">
                <div class="px-6 py-6">

                    {{-- Order/Project Information --}}
                    <div class="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                        <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                            @if($type === 'order')
                                @lang('messages.t_place_order')
                            @else
                                @lang('messages.t_project_details')
                            @endif
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="font-medium text-blue-700 dark:text-blue-300">
                                    @if($type === 'order')
                                        @lang('messages.t_gig'):
                                    @else
                                        @lang('messages.t_project'):
                                    @endif
                                </span>
                                <span class="text-blue-600 dark:text-blue-400">
                                    @if($type === 'order')
                                        {{ $requestable->gig->title }}
                                    @else
                                        {{ $requestable->title }}
                                    @endif
                                </span>
                            </div>
                            <div>
                                <span class="font-medium text-blue-700 dark:text-blue-300">@lang('messages.t_price'):</span>
                                <span class="text-blue-600 dark:text-blue-400">
                                    @if($type === 'order')
                                        {{ money($requestable->profit_value, settings('currency')->code, true) }}
                                    @else
                                        {{ money($requestable->awarded_bid->amount, settings('currency')->code, true) }}
                                    @endif
                                </span>
                            </div>
                            <div>
                                <span class="font-medium text-blue-700 dark:text-blue-300">@lang('messages.t_status'):</span>
                                <span class="text-blue-600 dark:text-blue-400">
                                    @if($type === 'order')
                                        @lang('messages.t_delivered')
                                    @else
                                        @lang('messages.t_completed')
                                    @endif
                                </span>
                            </div>
                            <div>
                                <span class="font-medium text-blue-700 dark:text-blue-300">
                                        @lang('messages.t_buyer'):
                                </span>
                                <span class="text-blue-600 dark:text-blue-400">
                                    @if($type === 'order')
                                        {{ $requestable->order->buyer->username }}
                                    @else
                                        {{ $requestable->client->username }}
                                    @endif
                                </span>
                            </div>
                        </div>
                    </div>

                    <form wire:submit.prevent="submit">

                        {{-- Reason --}}
                        <div class="mb-6">
                            <label for="reason" class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_description') <span class="text-red-500">*</span>
                            </label>
                            <textarea
                                    id="reason"
                                    wire:model.defer="reason"
                                    rows="4"
                                    class="block w-full rounded-md border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm @error('reason') @enderror"
                            ></textarea>
                            @error('reason')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                            @enderror
                            <p class="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                                @lang('messages.t_minimum_10_characters_required')
                            </p>
                        </div>

                        {{-- Info box --}}
                        <div class="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                              clip-rule="evenodd"></path>
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        @lang('messages.t_important_note')
                                    </h3>
                                    <div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                        <p>@lang('messages.t_unblock_request_will_be_reviewed_by_admin')</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {{-- Submit button --}}
                        <div class="flex justify-end items-center">
                            @if(!$this->canSubmitUnblockRequest())
                                <div class="mr-4 flex items-center">
                                    <div class="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-md px-3 py-2">
                                        <div class="flex items-center">
                                            <svg class="h-8 w-8 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                                            </svg>
                                            <span class="text-sm text-amber-700 dark:text-amber-300">
                                                @lang('messages.t_unblock_request_72_hour_wait', ['time' => $this->remainingTime])
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            @endif

                            <button
                                    type="submit"
                                    class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    wire:loading.attr="disabled"
                                    @if(!$this->canSubmitUnblockRequest()) disabled @endif
                            >
                                <span wire:loading.remove>
                                    @lang('messages.t_submit_request')
                                </span>
                                <span wire:loading>
                                    @lang('messages.t_please_wait')...
                                </span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>

        </div>
    </div>

</div>
