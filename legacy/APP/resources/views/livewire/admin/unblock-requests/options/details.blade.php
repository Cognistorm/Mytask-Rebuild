<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Content --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div class="max-w-4xl mx-auto">

            {{-- Header --}}
            <div class="bg-white dark:bg-zinc-800 shadow rounded-lg mb-6">
                <div class="px-6 py-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                                @lang('messages.t_unblock_request_details')
                            </h2>
                            <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                                @lang('messages.t_request_id'): {{ $request->uid }}
                            </p>
                        </div>
                        <div class="flex space-x-3">
                            @if($request->status->value === 'pending')
                                {{-- Approve Button --}}
                                <button
                                    wire:click="approve"
                                    wire:loading.attr="disabled"
                                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span wire:loading.remove wire:target="approve">
                                        <svg class="w-4 h-4 ltr:mr-2 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                        </svg>
                                        @lang('messages.t_approve')
                                    </span>
                                    <span wire:loading wire:target="approve">
                                        @lang('messages.t_please_wait')...
                                    </span>
                                </button>

                                {{-- Decline Button --}}
                                <button
                                    wire:click="decline"
                                    wire:loading.attr="disabled"
                                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span wire:loading.remove wire:target="decline">
                                        <svg class="w-4 h-4 ltr:mr-2 rtl:ml-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                        </svg>
                                        @lang('messages.t_decline')
                                    </span>
                                    <span wire:loading wire:target="decline">
                                        @lang('messages.t_please_wait')...
                                    </span>
                                </button>
                            @endif
                        </div>
                    </div>
                </div>
            </div>

            {{-- Request Information --}}
            <div class="bg-white dark:bg-zinc-800 shadow rounded-lg mb-6">
                <div class="px-6 py-6">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        @lang('messages.t_request_information')
                    </h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {{-- Status --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_status')
                            </label>
                            <div>
                                @switch($request->status->value)
                                    @case('pending')
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                                            {{ $request->status->label() }}
                                        </span>
                                        @break
                                    @case('approved')
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                            {{ $request->status->label() }}
                                        </span>
                                        @break
                                    @case('rejected')
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                                            {{ $request->status->label() }}
                                        </span>
                                        @break
                                    @default
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                                            {{ $request->status->label() }}
                                        </span>
                                @endswitch
                            </div>
                        </div>

                        {{-- Amount --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_amount')
                            </label>
                            <div class="text-lg font-semibold text-gray-900 dark:text-white">
                                {{ money($request->amount, settings('currency')->code, true) }}
                            </div>
                        </div>

                        {{-- Date Submitted --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_date_submitted')
                            </label>
                            <div class="text-sm text-gray-500 dark:text-zinc-400">
                                {{ format_date($request->created_at, 'M j, Y \a\t h:i A') }}
                            </div>
                        </div>

                        {{-- Request ID --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_request_id')
                            </label>
                            <div class="text-sm text-gray-500 dark:text-zinc-400 font-mono">
                                {{ $request->uid }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Freelancer Information --}}
            <div class="bg-white dark:bg-zinc-800 shadow rounded-lg mb-6">
                <div class="px-6 py-6">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        @lang('messages.t_freelancer_information')
                    </h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {{-- Username --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_username')
                            </label>
                            <div class="text-sm text-gray-900 dark:text-white">
                                {{ $request->freelancer->username }}
                            </div>
                        </div>

                        {{-- Email --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_email')
                            </label>
                            <div class="text-sm text-gray-900 dark:text-white">
                                {{ $request->freelancer->email }}
                            </div>
                        </div>

                        {{-- Available Balance --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_available_balance')
                            </label>
                            <div class="text-sm text-gray-900 dark:text-white">
                                {{ money($request->freelancer->balance_available, settings('currency')->code, true) }}
                            </div>
                        </div>

                        {{-- Pending Balance --}}
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                @lang('messages.t_pending_balance')
                            </label>
                            <div class="text-sm text-gray-900 dark:text-white">
                                {{ money($request->freelancer->balance_pending, settings('currency')->code, true) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Request Reason --}}
            <div class="bg-white dark:bg-zinc-800 shadow rounded-lg mb-6">
                <div class="px-6 py-6">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        @lang('messages.t_request_reason')
                    </h3>

                    <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
                        <p class="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{{ $request->reason }}</p>
                    </div>
                </div>
            </div>

            {{-- Actions (for completed requests) --}}
            @if(in_array($request->status->value, ['approved', 'rejected']))
                <div class="bg-white dark:bg-zinc-800 shadow rounded-lg">
                    <div class="px-6 py-6">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            @lang('messages.t_request_completed')
                        </h3>

                        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-blue-700 dark:text-blue-300">
                                        @if($request->status->value === 'approved')
                                            @lang('messages.t_this_request_has_been_approved_money_added_to_freelancer_balance')
                                        @else
                                            @lang('messages.t_this_request_has_been_rejected_no_money_was_transferred')
                                        @endif
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            @endif

        </div>
    </div>

</div>
