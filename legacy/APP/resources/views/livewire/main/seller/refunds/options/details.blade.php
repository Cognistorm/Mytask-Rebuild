<div class="w-full">


    {{-- Loading --}}

    <x-forms.loading/>


    {{-- Header --}}

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mb-10">

        <nav
            class="justify-between px-4 py-3 text-gray-700 border border-gray-100 rounded-lg shadow-sm sm:flex sm:px-5 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-none"
            aria-label="Breadcrumb">


            {{-- Menu --}}

            <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">


                {{-- Main home --}}

                <li>

                    <div class="flex items-center">

                        <a href="{{ url('/') }}"
                           class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">

                            @lang('messages.t_home')

                        </a>

                    </div>

                </li>


                {{-- My dashboard --}}

                <li aria-current="page">

                    <div class="flex items-center">

                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor"
                             viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
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


                {{-- Refunds --}}

                <li aria-current="page">

                    <div class="flex items-center">

                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor"
                             viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                  clip-rule="evenodd"></path>
                        </svg>

                        <a href="{{ url('seller/refunds') }}"
                           class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">

                            @lang('messages.t_refunds')

                        </a>

                    </div>

                </li>


                {{-- Refund details --}}

                <li aria-current="page">

                    <div class="flex items-center">

                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor"
                             viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                  clip-rule="evenodd"></path>
                        </svg>

                        <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">

                            @lang('messages.t_refund_details')

                        </span>

                    </div>

                </li>


            </ol>


            {{-- Options --}}

            <div>

                @if ($isPending) {{-- conversation removed --}}

                    {{-- Give refund --}}

                    <span class="ltr:ml-3 rtl:mr-3">

                        <button
                            x-on:click="confirm('{{ __('messages.t_are_u_sure_u_want_to_give_refund') }}') ? $wire.accept() : ''"
                            wire:loading.attr="disabled" wire:target="accept()" type="button"
                            class="inline-flex items-center px-4 py-3 border border-transparent text-xs leading-4 font-bold tracking-wide rounded-sm text-green-700 bg-green-200 hover:bg-green-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">

                            {{ __('messages.t_give_refund') }}

                        </button>

                    </span>



                    {{-- Decline refund --}}

                    <span class="ltr:ml-3 rtl:mr-3">

                        <button
                            x-on:click="confirm('{{ __('messages.t_are_u_sure_u_want_to_decline_refund') }}') ? $wire.decline() : ''"
                            wire:loading.attr="disabled" wire:target="decline()" type="button"
                            class="inline-flex items-center px-4 py-3 border border-transparent text-xs leading-4 font-bold tracking-wide rounded-sm text-red-700 bg-red-200 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">

                            {{ __('messages.t_decline_refund') }}

                        </button>

                    </span>

                @endif

            </div>


        </nav>

    </div>


    {{-- Content --}}

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">

        <div class="grid grid-cols-12 md:gap-x-6 gap-y-6">


            {{-- Conversation (removed) --}}
            @if(false)
            <div class="col-span-12 lg:col-span-8">

                <div
                    class="bg-white dark:bg-zinc-800 dark:border-zinc-700 shadow-sm rounded-md overflow-hidden border border-gray-100">

                    <div class="divide-y divide-gray-200 dark:divide-zinc-700">

                        <div class="px-4 py-5 sm:px-6">

                            <h2 class="text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-100">{{ __('messages.t_conversation') }}</h2>

                        </div>

                        <div class="px-4 py-6 sm:px-6">

                            <ul role="list" class="space-y-8">


                                @if(false) {{-- conversation removed --}}

                                    <li>

                                        <div class="relative pb-8">

                                            @if ($msg->author_id === auth()->id())
                                                {{-- Seller/Freelancer messages (right side) --}}
                                                <div class="relative flex items-start justify-end space-x-3 rtl:space-x-reverse">

                                                    <div class="min-w-0 flex-1 text-right">

                                                        <div>

                                                            <div class="text-sm">
                                                                @if ($refundType === 'gig')
                                                                    <a href="{{ url('profile', $msg->seller->username) }}"
                                                                       target="_blank"
                                                                       class="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600">{{ $msg->seller->username }}</a>
                                                                @else
                                                                    <a href="{{ url('profile', $msg->freelancer->username) }}"
                                                                       target="_blank"
                                                                       class="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600">{{ $msg->freelancer->username }}</a>
                                                                @endif
                                                            </div>

                                                            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">

                                                                {{ format_date($msg->created_at, 'ago') }}

                                                            </p>

                                                        </div>

                                                        <div class="mt-2 text-sm text-gray-700 dark:text-gray-200">

                                                            <div class="inline-block bg-primary-100 dark:bg-primary-900 rounded-lg px-3 py-2 max-w-xs">

                                                                {{ $msg->message }}

                                                            </div>

                                                        </div>

                                                    </div>

                                                    <div class="relative" wire:ignore>
                                                        @if ($refundType === 'gig')
                                                            <img
                                                                class="h-10 w-10 rounded-full bg-gray-400 dark:bg-zinc-700 flex items-center justify-center ring-8 ring-white dark:ring-transparent object-cover"
                                                                src="{{ src($msg->seller->avatar) }}"
                                                                alt="{{ $msg->seller->username }}"
                                                                loading="lazy">
                                                        @else
                                                            <img
                                                                class="h-10 w-10 rounded-full bg-gray-400 dark:bg-zinc-700 flex items-center justify-center ring-8 ring-white dark:ring-transparent object-cover"
                                                                src="{{ src($msg->freelancer->avatar) }}"
                                                                alt="{{ $msg->freelancer->username }}"
                                                                loading="lazy">
                                                        @endif
                                                    </div>

                                                </div>
                                            @else
                                                {{-- Buyer/Client messages (left side) --}}
                                                <div class="relative flex items-start space-x-3 rtl:space-x-reverse">

                                                    <div class="relative" wire:ignore>
                                                        @if ($refundType === 'gig')
                                                            <img
                                                                class="h-10 w-10 rounded-full bg-gray-400 dark:bg-zinc-700 flex items-center justify-center ring-8 ring-white dark:ring-transparent object-cover"
                                                                src="{{ src($msg->buyer->avatar) }}"
                                                                alt="{{ $msg->buyer->username }}"
                                                                loading="lazy">
                                                        @else
                                                            <img
                                                                class="h-10 w-10 rounded-full bg-gray-400 dark:bg-zinc-700 flex items-center justify-center ring-8 ring-white dark:ring-transparent object-cover"
                                                                src="{{ src($msg->client->avatar) }}"
                                                                alt="{{ $msg->client->username }}"
                                                                loading="lazy">
                                                        @endif
                                                    </div>

                                                    <div class="min-w-0 flex-1">

                                                        <div>

                                                            <div class="text-sm">
                                                                @if ($refundType === 'gig')
                                                                    <a href="{{ url('profile', $msg->buyer->username) }}"
                                                                       target="_blank"
                                                                       class="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600">{{ $msg->buyer->username }}</a>
                                                                @else
                                                                    <a href="{{ url('profile', $msg->client->username) }}"
                                                                       target="_blank"
                                                                       class="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600">{{ $msg->client->username }}</a>
                                                                @endif
                                                            </div>

                                                            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">

                                                                {{ format_date($msg->created_at, 'ago') }}

                                                            </p>

                                                        </div>

                                                        <div class="mt-2 text-sm text-gray-700 dark:text-gray-200">

                                                            <div class="inline-block bg-gray-100 dark:bg-zinc-700 rounded-lg px-3 py-2 max-w-xs">

                                                                {{ $msg->message }}

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>
                                            @endif

                                        </div>

                                    </li>

                                @endif

                                    {{-- Conversation removed --}}




                            </ul>

                        </div>

                    </div>

                    @if (false) {{-- conversation removed --}}

                        <div class="bg-white dark:bg-zinc-800 px-4 py-6 sm:px-6 border-t dark:border-zinc-700">

                            <div class="mt-6">

                                <div class="flex space-x-3 rtl:space-x-reverse">

                                    <div class="flex-shrink-0">

                                        <div class="relative">

                                            <img
                                                class="h-10 w-10 rounded-full bg-gray-400 dark:bg-zinc-700 flex items-center justify-center object-cover"
                                                src="{{ src(auth()->user()->avatar) }}"
                                                alt="{{ auth()->user()->username }}"
                                                loading="lazy">

                                        </div>

                                    </div>

                                    <div class="min-w-0 flex-1">

                                        <div>

                                            <textarea wire:model.defer="message" rows="4"
                                                      class="shadow-sm block w-full focus:ring-gray-900 focus:border-gray-900 sm:text-sm border border-gray-300 dark:bg-transparent dark:border-zinc-600 dark:focus:bg-primary-600 dark:focus:ring-primary-600 dark:text-gray-300 rounded-md resize-none"
                                                      placeholder="{{ __('messages.t_enter_your_message') }}"
                                                      maxlength="500"></textarea>

                                        </div>

                                        <div class="mt-6 flex items-center justify-end space-x-4 rtl:space-x-reverse">


                                            <x-forms.button action="send" :text="__('messages.t_send')" :block="false"/>


                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    @endif

                </div>

            </div>
            @endif


            {{-- Refund details --}}

            <div class="col-span-12">

                <div class="max-w-3xl mx-auto bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 p-6 space-y-6">


                    {{-- Item details --}}

                    <div class="mb-6">

                        @if($refundType === 'gig')
                            {{-- Gig details --}}
                            <div class="w-full overflow-hidden rounded-md bg-gray-100 dark:bg-zinc-700" wire:ignore>

                                <img src="{{ src($refund->item->gig->thumbnail) }}"
                                     alt="{{ $refund->item->gig->title }}" class="w-full h-80 object-cover" loading="lazy">

                            </div>

                            <div class="mt-3">

                                <div>

                                    <a href="{{ url('service', $refund->item->gig->slug) }}" target="_blank"
                                       class="text-base font-bold tracking-wide text-gray-900 dark:text-gray-200 hover:text-primary-600">

                                        {{ $refund->item->gig->title }}

                                    </a>

                                </div>

                            </div>
                        @else
                            <div>

                                <div>

                                    <a href="{{ url('project/' . $refund->project->pid . '/' . $refund->project->slug) }}"
                                       target="_blank"
                                       class="text-base font-bold tracking-wide text-gray-900 dark:text-gray-200 hover:text-primary-600">

                                        {{ $refund->project->title }}

                                    </a>

                                </div>

                            </div>
                        @endif

                    </div>


                    {{-- Item details --}}

                    <div>

                        <h3 class="text-gray-900 dark:text-gray-300 text-sm font-bold tracking-wide">{{ __('messages.t_details') }}</h3>

                        <dl class="mt-2 divide-y divide-gray-200 border-t border-b border-gray-200 dark:divide-zinc-600 dark:border-zinc-600">


                            {{-- Status --}}

                            <div class="flex justify-between py-3 text-sm font-medium">

                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_refund_status') }}</dt>

                                <dd class="text-gray-900 dark:text-gray-200">

                                    @switch($statusDisplay)

                                        {{-- Pending --}}

                                        @case('pending')

                                            <span
                                                class="text-amber-600 text-sm font-medium">{{ __('messages.t_in_progress') }}</span>

                                            @break



                                            {{-- Rejected by seller --}}

                                        @case('rejected_by_seller')

                                            <span
                                                class="text-red-600 text-sm font-medium">{{ __('messages.t_declined_by_seller') }}</span>

                                            @break



                                            {{-- Rejected by admin --}}

                                        @case('rejected_by_admin')

                                            <span
                                                class="text-red-600 text-sm font-medium">{{ __('messages.t_declined_by_admin', ['app_name' => config('app.name')]) }}</span>

                                            @break



                                            {{-- Approved by seller --}}

                                        @case('accepted_by_seller')

                                            <span
                                                class="text-green-600 text-sm font-medium">{{ __('messages.t_approved_by_seller') }}</span>

                                            @break



                                            {{-- Approved by admin --}}

                                        @case('accepted_by_admin')

                                            <span
                                                class="text-green-600 text-sm font-medium">{{ __('messages.t_approved_by_admin', ['app_name' => config('app.name')]) }}</span>

                                            @break




                                            {{-- Closed --}}

                                        @case('closed')

                                            <span
                                                class="text-gray-600 text-sm font-medium">{{ __('messages.t_closed') }}</span>

                                            @break

                                    @endswitch

                                </dd>

                            </div>


                            {{-- Amount --}}

                            <div class="flex justify-between py-3 text-sm font-medium">

                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_amount') }}</dt>

                                @if ($refundType === 'gig')

                                    <dd class="text-gray-900 dark:text-gray-200  font-extrabold">{{ money($refund->item->profit_value, settings('currency')->code, true) }}</dd>

                                @else
                                    <dd class="text-gray-900 dark:text-gray-200  font-extrabold">{{ money($refund->project->awarded_bid->amount, settings('currency')->code, true) }}</dd>

                                @endif

                            </div>


                            {{-- Refund date --}}

                            <div class="flex justify-between py-3 text-sm font-medium">

                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_refund_date') }}</dt>

                                <dd class="text-gray-900 dark:text-gray-200">{{ $refund->created_at->format('d.m.Y') }}</dd>

                            </div>


                            {{-- Buyer --}}

                            <div class="flex justify-between py-3 text-sm font-medium">

                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_buyer') }}</dt>

                                <dd class="text-primary-700">
                                    @if ($refundType === 'gig')

                                        <a href="{{ url('profile', $refund->buyer->username) }}"
                                           target="_blank">{{ $refund->buyer->username }}</a>

                                    @else
                                        <a href="{{ url('profile', $refund->client->username) }}"
                                           target="_blank">{{ $refund->client->username }}</a>

                                    @endif
                                </dd>


                            </div>


                        </dl>

                    </div>


                    {{-- Reason --}}

                    <div>

                        <h3 class="text-gray-900 dark:text-gray-300 text-sm font-bold tracking-wide">{{ __('messages.t_refund_reason') }}</h3>

                        <div class="mt-2">

                            <p class="text-sm italic text-gray-500 dark:text-gray-200">

                                {{ $refund->reason }}

                            </p>

                        </div>

                    </div>


                </div>

            </div>


        </div>

    </div>


</div>

