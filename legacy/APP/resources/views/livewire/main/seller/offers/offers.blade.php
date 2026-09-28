<div class="w-full">


    {{-- Loading --}}

    <x-forms.loading/>


    {{-- Heading --}}

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mb-16">

        <div class="mx-auto max-w-7xl">

            <div class="lg:flex lg:items-center lg:justify-between">


                <div class="min-w-0 flex-1">


                    {{-- Section heading --}}

                    <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">

                        @lang('messages.t_received_offers')

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


                            {{-- Offers --}}

                            <li aria-current="page">

                                <div class="flex items-center">

                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180"
                                         fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              clip-rule="evenodd"></path>
                                    </svg>

                                    <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">

                                        @lang('messages.t_received_offers')

                                    </span>

                                </div>

                            </li>


                        </ol>

                    </div>


                </div>




            </div>

        </div>

    </div>


    {{-- Content --}}

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">

        <div class="mt-8 overflow-x-auto overflow-y-hidden sm:mt-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-zinc-800 dark:scrollbar-track-zinc-600">

            <table class="w-full text-left border-spacing-y-[10px] border-separate sm:mt-2">

                <thead class="">

                <tr class="bg-slate-200 dark:bg-zinc-600">


                    {{-- Employer --}}

                    <th class="font-bold tracking-wider text-gray-600 px-5 py-4.5 border-b-0 whitespace-nowrap text-xs uppercase dark:text-zinc-300 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md rtl:text-right">@lang('messages.t_employer')</th>


                    {{-- Budget --}}

                    <th class="font-bold tracking-wider text-gray-600 px-5 py-4.5 text-center border-b-0 whitespace-nowrap text-xs uppercase dark:text-zinc-300 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md">@lang('messages.t_budget')</th>


                    {{-- Offer status --}}

                    <th class="font-bold tracking-wider text-gray-600 px-5 py-4.5 text-center border-b-0 whitespace-nowrap text-xs uppercase dark:text-zinc-300 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md">@lang('messages.t_offer_status')</th>


                    {{-- Payment status --}}

                    <th class="font-bold tracking-wider text-gray-600 px-5 py-4.5 text-center border-b-0 whitespace-nowrap text-xs uppercase dark:text-zinc-300 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md">@lang('messages.t_payment_status')</th>


                    {{-- Options --}}

                    <th class="font-bold tracking-wider text-gray-600 px-5 py-4.5 text-center border-b-0 whitespace-nowrap text-xs uppercase dark:text-zinc-300 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md">@lang('messages.t_options')</th>


                </tr>

                </thead>

                <thead>

                @forelse ($offers as $offer)

                    <tr class="intro-x shadow-sm bg-white dark:bg-zinc-800 rounded-md h-16"
                        wire:key="freelancer-dashboard-offers-{{ $offer->uid }}">


                        {{-- Employer --}}

                        <td class="px-5 py-3 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md w-52 rtl:text-right">

                            <div class="flex items-center space-x-2 rtl:space-x-reverse">


                                {{-- Avatar --}}

                                <img src="{{ placeholder_img() }}" data-src="{{ src($offer->buyer?->avatar) }}"
                                     alt="{{ $offer->buyer?->username }}"
                                     class="w-7 h-7 rounded-full object-cover lazy">


                                {{-- Name --}}

                                <div class="flex items-center">

                                    <a href="{{ url('profile', $offer->buyer?->username) }}" target="_blank"
                                       class="font-bold whitespace-nowrap truncate block max-w-[240px] hover:text-zinc-900 dark:text-white text-sm text-zinc-700"
                                       title="{{ $offer->buyer?->username }}">

                                        {{ $offer->buyer?->fullname ? $offer->buyer->fullname : $offer->buyer?->username }}

                                    </a>

                                </div>


                            </div>

                        </td>


                        {{-- Budget --}}

                        <td class="px-5 py-3 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md text-center">

                            <div class="text-gray-900 dark:text-gray-100 text-sm font-black">{{ money($offer->budget_amount, settings('currency')->code, true) }}</div>

                            <div class="text-xs text-gray-400 tracking-wide font-normal mt-1 whitespace-nowrap">{{ __('messages.t_number_days_for_delivery', ['number' => $offer->delivery_time]) }}</div>

                        </td>


                        {{-- Offer status --}}

                        <td class="px-5 py-3 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md text-center">

                            @switch($offer->freelancer_status)

                                {{-- Pending --}}

                                @case('pending')

                                    <div class="flex items-center flex-col">

                                        <div class="bg-yellow-100 text-yellow-600 px-4 leading-9 h-9 rounded-3xl font-medium text-xs flex items-center space-x-3 rtl:space-x-reverse dark:bg-yellow-900 dark:text-yellow-400">

                                            <span class="whitespace-nowrap">@lang('messages.t_pending')</span>

                                            <div class="flex items-center space-x-1 rtl:space-x-reverse">


                                                {{-- Approve --}}

                                                <div>


                                                    {{-- Button --}}

                                                    <button type="button"
                                                            data-tooltip-target="tooltip-actions-approve-{{ $offer->uid }}"
                                                            id="modal-approve-offer-button-{{ $offer->uid }}"
                                                            class="flex items-center justify-center h-6 w-6 rounded-full border border-transparent bg-yellow-50 text-yellow-600 hover:bg-transparent hover:border-yellow-600 dark:bg-yellow-600 dark:text-yellow-300 dark:hover:bg-transparent">

                                                        <svg class="w-4 h-4" stroke="currentColor" fill="currentColor"
                                                             stroke-width="0" viewBox="0 0 24 24"
                                                             xmlns="http://www.w3.org/2000/svg">
                                                            <g>
                                                                <path fill="none" d="M0 0h24v24H0z"></path>
                                                                <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                                                            </g>
                                                        </svg>

                                                    </button>


                                                    {{-- Tooltip --}}

                                                    <x-forms.tooltip id="tooltip-actions-approve-{{ $offer->uid }}"
                                                                     :text="__('messages.t_approve')"/>


                                                </div>


                                                {{-- Reject --}}

                                                <div>


                                                    {{-- Button --}}

                                                    <button type="button"
                                                            data-tooltip-target="tooltip-actions-reject-{{ $offer->uid }}"
                                                            id="modal-reject-offer-button-{{ $offer->uid }}"
                                                            class="flex items-center justify-center h-6 w-6 rounded-full border border-transparent bg-yellow-50 text-yellow-600 hover:bg-transparent hover:border-yellow-600 dark:bg-yellow-600 dark:text-yellow-300 dark:hover:bg-transparent">

                                                        <svg class="w-4 h-4" stroke="currentColor" fill="currentColor"
                                                             stroke-width="0" viewBox="0 0 24 24"
                                                             xmlns="http://www.w3.org/2000/svg">
                                                            <g>
                                                                <path fill="none" d="M0 0h24v24H0z"></path>
                                                                <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"></path>
                                                            </g>
                                                        </svg>

                                                    </button>


                                                    {{-- Tooltip --}}

                                                    <x-forms.tooltip id="tooltip-actions-reject-{{ $offer->uid }}"
                                                                     :text="__('messages.t_reject')"/>


                                                </div>


                                            </div>

                                        </div>

                                    </div>

                                    @break



                                    {{-- Rejected --}}

                                @case('rejected')

                                    <span class="bg-red-100 text-red-600 px-4 inline-block leading-9 h-9 rounded-3xl font-medium text-xs whitespace-nowrap dark:bg-red-900 dark:text-red-400">

                                            @lang('messages.t_rejected')

                                        </span>

                                    @break



                                    {{-- Approved --}}

                                @case('approved')

                                    <span class="bg-blue-100 text-blue-600 px-4 inline-block leading-9 h-9 rounded-3xl font-medium text-xs whitespace-nowrap dark:bg-blue-900 dark:text-blue-500">

                                            @lang('messages.t_accepted')

                                        </span>

                                    @break



                                    {{-- Completed --}}

                                @case('completed')

                                    <span class="bg-green-100 text-green-600 px-4 inline-block leading-9 h-9 rounded-3xl font-medium text-xs whitespace-nowrap dark:bg-green-900 dark:text-green-500">

                                            @lang('messages.t_completed')

                                        </span>

                                    @break



                                    {{-- Canceled --}}

                                @case('canceled')

                                    <span class="bg-zinc-100 text-zinc-600 px-4 inline-block leading-9 h-9 rounded-3xl font-medium text-xs whitespace-nowrap dark:bg-zinc-700 dark:text-zinc-400">

                                            @lang('messages.t_canceled')

                                        </span>

                                    @break

                                @default

                            @endswitch

                        </td>


                        {{-- Payment status --}}

                        <td class="px-5 py-3 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md text-center">

                            @switch($offer->payment_status)

                                {{-- Pending --}}

                                @case('pending')

                                    <span class="bg-amber-100 text-amber-600 px-4 inline-block leading-9 h-9 rounded-3xl font-medium text-xs whitespace-nowrap dark:bg-amber-900 dark:text-amber-500">

                                            @lang('messages.t_pending')

                                        </span>

                                    @break



                                    {{-- Funded --}}

                                @case('funded')

                                    <span class="bg-violet-100 text-violet-600 px-4 inline-block leading-9 h-9 rounded-3xl font-medium text-xs whitespace-nowrap dark:bg-violet-900 dark:text-violet-400">

                                            @lang('messages.t_funded')

                                        </span>

                                    @break



                                    {{-- Released --}}

                                @case('released')

                                    <span class="bg-green-100 text-green-600 px-4 inline-block leading-9 h-9 rounded-3xl font-medium text-xs whitespace-nowrap dark:bg-green-900 dark:text-green-500">

                                            @lang('messages.t_released')

                                        </span>

                                    @break

                                @default

                            @endswitch

                        </td>


                        {{-- Options --}}

                        <td class="px-5 py-3 first:ltr:rounded-l-md last:ltr:rounded-r-md first:rtl:rounded-r-md last:rtl:rounded-l-md text-center">

                            <div class="flex justify-center items-center space-x-2 rtl:space-x-reverse">


                                {{-- Offer details --}}

                                <div>

                                    <button type="button" id="modal-offer-details-button-{{ $offer->uid }}"
                                            data-tooltip-target="tooltip-actions-details-{{ $offer->uid }}"
                                            class="inline-flex justify-center items-center border font-semibold focus:outline-none w-8 h-8 leading-5 text-sm rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:border-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">

                                        <svg class="w-4 h-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.165 19.551c.186.28.499.449.835.449h15c.4 0 .762-.238.919-.606l3-7A.998.998 0 0 0 21 11h-1V7c0-1.103-.897-2-2-2h-6.1L9.616 3.213A.997.997 0 0 0 9 3H4c-1.103 0-2 .897-2 2v14h.007a1 1 0 0 0 .158.551zM17.341 18H4.517l2.143-5h12.824l-2.143 5zM18 7v4H6c-.4 0-.762.238-.919.606L4 14.129V7h14z"></path>
                                        </svg>

                                    </button>

                                    <x-forms.tooltip id="tooltip-actions-details-{{ $offer->uid }}"
                                                     :text="__('messages.t_offer_details')"/>

                                </div>


                                {{-- Chat --}}

                                <div>

                                    <a href="{{ url('messages/new', $offer->buyer?->username) }}" target="_blank"
                                       data-tooltip-target="tooltip-actions-chat-{{ $offer->uid }}"
                                       class="inline-flex justify-center items-center border font-semibold focus:outline-none w-8 h-8 leading-5 text-sm rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:border-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">

                                        <svg class="w-4 h-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M16 2H8C4.691 2 2 4.691 2 8v13a1 1 0 0 0 1 1h13c3.309 0 6-2.691 6-6V8c0-3.309-2.691-6-6-6zm4 14c0 2.206-1.794 4-4 4H4V8c0-2.206 1.794-4 4-4h8c2.206 0 4 1.794 4 4v8z"></path>
                                            <path d="M7 9h10v2H7zm0 4h7v2H7z"></path>
                                        </svg>

                                    </a>

                                    <x-forms.tooltip id="tooltip-actions-chat-{{ $offer->uid }}"
                                                     :text="__('messages.t_chat_now')"/>

                                </div>


                                {{-- Deliver work --}}

                                @if ( in_array($offer->freelancer_status, ['completed', 'approved']) && in_array($offer->payment_status, ['funded', 'released']) )

                                    <div>

                                        <button type="button" id="modal-offer-work-button-{{ $offer->uid }}"
                                                data-tooltip-target="tooltip-actions-deliver-{{ $offer->uid }}"
                                                class="inline-flex justify-center items-center border font-semibold focus:outline-none w-8 h-8 leading-5 text-sm rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:border-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">

                                            <svg class="w-4 h-4" stroke="currentColor" fill="currentColor"
                                                 stroke-width="0" viewBox="0 0 24 24"
                                                 xmlns="http://www.w3.org/2000/svg">
                                                <path d="M11 15h2V9h3l-4-5-4 5h3z"></path>
                                                <path d="M20 18H4v-7H2v7c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2v-7h-2v7z"></path>
                                            </svg>

                                        </button>

                                        <x-forms.tooltip id="tooltip-actions-deliver-{{ $offer->uid }}"
                                                         :text="__('messages.t_send_a_file')"/>

                                    </div>

                                @endif



                                {{-- Cancel order --}}

                                @if ( $offer->freelancer_status === 'approved' && !$offer->isDelivered() && in_array($offer->payment_status, ['pending', 'funded']) )

                                    <div>

                                        <button type="button" wire:click="confirmCancel('{{ $offer->uid }}')"
                                                data-tooltip-target="tooltip-actions-cancel-{{ $offer->uid }}"
                                                class="inline-flex justify-center items-center border font-semibold focus:outline-none w-8 h-8 leading-5 text-sm rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:border-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">

                                            <svg class="w-4 h-4" stroke="currentColor" fill="currentColor"
                                                 stroke-width="0" viewBox="0 0 24 24"
                                                 xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM4 12c0-1.846.634-3.542 1.688-4.897l11.209 11.209A7.946 7.946 0 0 1 12 20c-4.411 0-8-3.589-8-8zm14.312 4.897L7.103 5.688A7.948 7.948 0 0 1 12 4c4.411 0 8 3.589 8 8a7.954 7.954 0 0 1-1.688 4.897z"></path>
                                            </svg>

                                        </button>

                                        <x-forms.tooltip id="tooltip-actions-cancel-{{ $offer->uid }}"
                                                         :text="__('messages.t_cancel_order')"/>

                                    </div>

                                @endif


                            </div>

                        </td>


                    </tr>



                    {{-- Approve modal --}}

                    @if ($offer->freelancer_status === 'pending')

                        <x-forms.modal id="modal-approve-offer-container-{{ $offer->uid }}"
                                       target="modal-approve-offer-button-{{ $offer->uid }}"
                                       uid="modal_approve_offer_{{ $offer->uid }}" placement="center-center"
                                       size="max-w-md">


                            {{-- Modal heading --}}

                            <x-slot name="title">{{ __('messages.t_accept_offer') }}</x-slot>


                            {{-- Modal content --}}

                            <x-slot name="content">

                                <div class="flex text-gray-500 font-normal text-sm dark:text-zinc-300">@lang('messages.t_are_u_sure_accept_this_offer_freelancer')</div>

                                <div class="flex text-gray-500 font-normal text-sm dark:text-zinc-300">

                                    @lang('messages.t_once_employer_adds_funds_start_working_on_his_order')

                                </div>

                            </x-slot>


                            {{-- Footer --}}

                            <x-slot name="footer">

                                <div class="flex justify-between items-center w-full">


                                    {{-- Cancel --}}

                                    <button x-on:click="close" type="button"
                                            class="inline-flex justify-center items-center space-x-2 rounded border font-semibold focus:outline-none px-3 py-2 leading-5 text-xs tracking-wide border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-600">

                                        @lang('messages.t_cancel')

                                    </button>


                                    {{-- Accept --}}

                                    <button

                                            type="button"

                                            wire:click="accept('{{ $offer->uid }}')"

                                            wire:loading.attr="disabled"

                                            class="inline-flex justify-center items-center rounded border font-semibold focus:outline-none px-3 py-2 leading-5 text-xs tracking-wide border-transparent bg-green-500 text-white hover:bg-green-600 focus:ring focus:ring-green-500 focus:ring-opacity-25 disabled:bg-gray-200 disabled:hover:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">


                                        {{-- Loading indicator --}}

                                        <div wire:loading wire:target="accept('{{ $offer->uid }}')">

                                            <svg role="status" class="inline w-4 h-4 text-gray-700 animate-spin"
                                                 viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">

                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                      fill="#E5E7EB"/>

                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                      fill="currentColor"/>

                                            </svg>

                                        </div>


                                        {{-- Button text --}}

                                        <div wire:loading.remove wire:target="accept('{{ $offer->uid }}')">

                                            @lang('messages.t_accept_offer')

                                        </div>


                                    </button>


                                </div>

                            </x-slot>


                        </x-forms.modal>

                    @endif



                    {{-- Reject modal --}}

                    @if ($offer->freelancer_status === 'pending')

                        <x-forms.modal id="modal-reject-offer-container-{{ $offer->uid }}"
                                       target="modal-reject-offer-button-{{ $offer->uid }}"
                                       uid="modal_reject_offer_{{ $offer->uid }}" placement="center-center"
                                       size="max-w-md">


                            {{-- Modal heading --}}

                            <x-slot name="title">{{ __('messages.t_reject_offer') }}</x-slot>


                            {{-- Modal content --}}

                            <x-slot name="content">


                                {{-- Rejection reason --}}

                                <div class="w-fill mb-6">

                                    {{-- Form control --}}

                                    <div class="relative w-full shadow-sm">


                                        {{-- Input --}}

                                        <textarea wire:model.defer="reject_reason" id="bid-report-description-input"
                                                  class="{{ $errors->first('reject_reason') ? 'focus:ring-red-600 focus:border-red-600 border-red-500' : 'focus:ring-primary-600 focus:border-primary-600 border-gray-300' }} border text-gray-900 text-sm rounded-lg font-medium block w-full ltr:pr-12 rtl:pl-12 p-4  dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500 placeholder:font-normal"
                                                  rows="8" placeholder="{{ __('messages.t_enter_rejection_reason') }}"
                                                  maxlength="1500"></textarea>


                                        {{-- Icon --}}

                                        <div class="absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center ltr:pr-3 rtl:pl-3 font-bold text-xs tracking-widest dark:text-gray-300 uppercase">

                                            <svg class="w-5 h-5 text-gray-500" stroke="currentColor" fill="currentColor"
                                                 stroke-width="0" viewBox="0 0 24 24"
                                                 xmlns="http://www.w3.org/2000/svg">
                                                <path d="M16 2H8C4.691 2 2 4.691 2 8v13a1 1 0 0 0 1 1h13c3.309 0 6-2.691 6-6V8c0-3.309-2.691-6-6-6zm4 14c0 2.206-1.794 4-4 4H4V8c0-2.206 1.794-4 4-4h8c2.206 0 4 1.794 4 4v8z"></path>
                                                <path d="M11 6h2v8h-2zm0 10h2v2h-2z"></path>
                                            </svg>

                                        </div>


                                    </div>


                                    {{-- Error --}}

                                    @error('reject_reason')

                                    <p class="mt-1.5 text-[13px] tracking-wide text-red-600 font-medium ltr:pl-1 rtl:pr-1">

                                        {{ $errors->first('reject_reason') }}

                                    </p>

                                    @enderror

                                </div>


                            </x-slot>


                            {{-- Footer --}}

                            <x-slot name="footer">

                                <div class="flex justify-between items-center w-full">


                                    {{-- Cancel --}}

                                    <button x-on:click="close" type="button"
                                            class="inline-flex justify-center items-center space-x-2 rounded border font-semibold focus:outline-none px-3 py-2 leading-5 text-xs tracking-wide border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-600">

                                        @lang('messages.t_cancel')

                                    </button>


                                    {{-- Reject --}}

                                    <button

                                            type="button"

                                            wire:click="reject('{{ $offer->uid }}')"

                                            wire:loading.attr="disabled"

                                            class="inline-flex justify-center items-center rounded border font-semibold focus:outline-none px-3 py-2 leading-5 text-xs tracking-wide border-transparent bg-red-500 text-white hover:bg-red-600 focus:ring focus:ring-red-500 focus:ring-opacity-25 disabled:bg-gray-200 disabled:hover:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">


                                        {{-- Loading indicator --}}

                                        <div wire:loading wire:target="reject('{{ $offer->uid }}')">

                                            <svg role="status" class="inline w-4 h-4 text-gray-700 animate-spin"
                                                 viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">

                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                      fill="#E5E7EB"/>

                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                      fill="currentColor"/>

                                            </svg>

                                        </div>


                                        {{-- Button text --}}

                                        <div wire:loading.remove wire:target="reject('{{ $offer->uid }}')">

                                            @lang('messages.t_reject_offer')

                                        </div>


                                    </button>


                                </div>

                            </x-slot>


                        </x-forms.modal>

                    @endif



                    {{-- Offer details --}}

                    <x-forms.modal id="modal-offer-details-container-{{ $offer->uid }}"
                                   target="modal-offer-details-button-{{ $offer->uid }}"
                                   uid="modal_offer_details_{{ $offer->uid }}" placement="center-center"
                                   size="max-w-xl">


                        {{-- Modal heading --}}

                        <x-slot name="title">{{ __('messages.t_offer_details') }}</x-slot>


                        {{-- Modal content --}}

                        <x-slot name="content">


                            {{-- Message --}}

                            <div class="text-gray-500 text-sm leading-relaxed dark:text-zinc-300 whitespace-pre-line">

                                {{ $offer->message }}

                            </div>


                            {{-- Attachments --}}

                            @if ($offer->attachments && $offer->attachments()->count())

                                {{-- Divider --}}

                                <div class="h-px bg-zinc-100 -mx-6 my-5 dark:bg-zinc-700"></div>



                                {{-- Files --}}

                                <ul role="list"
                                    class="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-zinc-700 dark:border-zinc-700">


                                    @foreach ($offer->attachments as $attachment)

                                        <li class="flex items-center justify-between py-3 ltr:pl-3 ltr:pr-4 rtl:pr-3 rtl:pl-4 text-sm">

                                            <div class="flex w-0 flex-1 items-center">

                                                <svg class="h-5 w-5 flex-shrink-0 text-gray-300 -mt-0.5"
                                                     stroke="currentColor" fill="currentColor" stroke-width="0"
                                                     viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="m12 16 4-5h-3V4h-2v7H8z"></path>
                                                    <path d="M20 18H4v-7H2v7c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2v-7h-2v7z"></path>
                                                </svg>

                                                <span class="ltr:ml-2 rtl:mr-2 w-0 flex-1 truncate text-[13px] text-gray-500 dark:text-gray-300">

                                                        {{ $attachment->uid }}.{{ $attachment->file_extension }}

                                                    </span>

                                            </div>

                                            <div class="ml-4 flex-shrink-0">

                                                <a href="{{ url('uploads/offers', $attachment->uid . '.' . $attachment->file_extension) }}"
                                                   class="font-medium text-blue-600 hover:text-blue-500">

                                                    @lang('messages.t_download')

                                                </a>

                                            </div>

                                        </li>

                                    @endforeach


                                </ul>

                            @endif


                        </x-slot>


                    </x-forms.modal>



                    {{-- Send a file --}}

                    @if ( in_array($offer->freelancer_status, ['completed', 'approved']) && in_array($offer->payment_status, ['funded', 'released']) )

                        <x-forms.modal id="modal-offer-work-container-{{ $offer->uid }}"
                                       target="modal-offer-work-button-{{ $offer->uid }}"
                                       uid="modal_offer_work_{{ $offer->uid }}" placement="center-center"
                                       size="max-w-xl">


                            {{-- Modal content --}}

                            <x-slot name="content">


                                {{-- Close button --}}

                                <button x-on:click="close" type="button"
                                        class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ltr:ml-auto rtl:mr-auto inline-flex items-center dark:hover:bg-zinc-600 dark:hover:text-white absolute ltr:right-5 rtl:left-5">

                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                              clip-rule="evenodd"></path>
                                    </svg>

                                </button>


                                {{-- Submit a file --}}

                                <div class="flex flex-col justify-center">


                                    {{-- Empty state --}}

                                    <div class="text-center mb-10">


                                        {{-- Icon --}}

                                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto dark:bg-zinc-700 dark:text-zinc-300">

                                            <svg class="w-8 h-8" stroke="currentColor" fill="currentColor"
                                                 stroke-width="0" viewBox="0 0 24 24"
                                                 xmlns="http://www.w3.org/2000/svg">
                                                <path fill="none" d="M0 0h24v24H0z"></path>
                                                <path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2zM7 9l1.41 1.41L11 7.83V16h2V7.83l2.59 2.58L17 9l-5-5-5 5z"></path>
                                            </svg>

                                        </div>


                                        {{-- Headline --}}

                                        <h1 class="dark:text-zinc-200 font-bold pt-3 text-gray-600 text-sm">

                                            @lang('messages.t_send_a_file')

                                        </h1>


                                        {{-- Subtitle --}}

                                        <p class="dark:text-zinc-400 font-normal max-w-sm mx-auto pt-1 text-[13px] text-gray-400 tracking-wide">

                                            @lang('messages.t_send_a_file_subtitle')

                                        </p>


                                    </div>


                                    {{-- Note --}}

                                    <div class="mb-4">

                                        <x-forms.text-input

                                                :placeholder="__('messages.t_type_notes')"

                                                model="notes"

                                                maxlength="500"

                                                svg_icon='<svg class="w-5 h-5 text-gray-400 dark:text-gray-300" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7-.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19 19H5V5h14v14z"></path><path d="M15.08 11.03l-2.12-2.12L7 14.86V17h2.1zM16.85 9.27c.2-.2.2-.51 0-.71l-1.41-1.41c-.2-.2-.51-.2-.71 0l-1.06 1.06 2.12 2.12 1.06-1.06z"></path></svg>'/>

                                    </div>


                                    {{-- Upload --}}

                                    <div class="w-full mb-6" wire:ignore>

                                        <x-forms.attachments-form

                                                :label="__('messages.t_drag_attachments_here')"

                                                model="file"

                                                id="uploader_attachments_{{ $offer->uid }}"

                                                :extensions="explode(',', settings('publish')->custom_offer_attachments_allowed_extensions)"

                                                size="{{ settings('publish')->custom_offer_attachment_max_size }}"

                                                max="1"/>

                                        <div class="mt-3 text-xs text-gray-400">

                                            @lang('messages.t_acceptable_file_types_are') &nbsp;
                                            <b>{{ str_replace(',', ' | ', settings('publish')->custom_offer_attachments_allowed_extensions) }}</b>

                                        </div>

                                        <div class="mt-1 text-xs text-gray-400">

                                            @lang('messages.t_the_max_allowable_file_size_is') &nbsp;
                                            <b>{{ settings('publish')->custom_offer_attachment_max_size }} @lang('messages.t_size_mb')</b>

                                        </div>

                                    </div>


                                    {{-- Upload errors --}}

                                    @if ($errors->has('file'))

                                        <div class="mb-5" wire:key='attachments-errors'>

                                            <div class="flex p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
                                                 role="alert">

                                                <svg aria-hidden="true"
                                                     class="flex-shrink-0 inline w-5 h-5 ltr:mr-3 rtl:ml-3"
                                                     fill="currentColor" viewBox="0 0 20 20"
                                                     xmlns="http://www.w3.org/2000/svg">
                                                    <path fill-rule="evenodd"
                                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                          clip-rule="evenodd"></path>
                                                </svg>

                                                <span class="sr-only">Error</span>

                                                <div>

                                                    <span class="font-medium">@lang('messages.t_attachments_errors')</span>

                                                    <ul class="mt-1.5 ltr:ml-4 rtl:mr-4 list-disc list-inside">

                                                        @foreach ($errors->get('file') as $key => $error)

                                                            <li wire:key="attachments-errors-item-{{ $key }}">{{ $error }}</li>

                                                        @endforeach

                                                    </ul>

                                                </div>

                                            </div>

                                        </div>

                                    @endif



                                    {{-- Work is finished --}}

                                    @if ($offer->freelancer_status !== 'completed')

                                        <label class="relative inline-flex items-center cursor-pointer mb-5">

                                            <input type="checkbox" wire:model.defer="is_completed" class="sr-only peer">

                                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>

                                            <span class="ltr:ml-3 rtl:mr-3 text-sm font-medium text-gray-600 dark:text-gray-300">

                                                    @lang('messages.t_this_order_completed_and_this_is_final_work')

                                                </span>

                                        </label>

                                    @endif



                                    {{-- Submit button --}}

                                    <div>

                                        <x-forms.button action="sendFile('{{ $offer->uid }}')"
                                                        text="{{ __('messages.t_submit') }}" :block="true"/>

                                    </div>


                                </div>


                                {{-- Divider --}}

                                <div class="h-px bg-zinc-100 -mx-6 !mb-10 dark:bg-zinc-700"></div>


                                {{-- Submitted files --}}

                                @if ($offer->work && $offer->work()->count())

                                    <div class="w-full">


                                        {{-- Label --}}

                                        <span class="block mb-3 font-semibold text-sm text-gray-700 tracking-wide dark:text-zinc-300">@lang('messages.t_submitted_files')</span>


                                        {{-- List of files --}}

                                        <div class="w-full space-y-3">

                                            @foreach ($offer->work as $file)

                                                <div class="border border-slate-200 dark:border-zinc-700 px-3 py-4 rounded-md">

                                                    <div class="flex items-center justify-between w-full"
                                                         wire:key="seller-submitted-offer-files-{{ $file->uid }}">

                                                        <div class="flex items-center">

                                                            <div class="fiv-sqo fiv-icon-{{ $file->file_extension }} text-4xl"></div>

                                                            <div class="ltr:pl-2 rtl:pr-2">

                                                                <p tabindex="0"
                                                                   class="focus:outline-none text-sm font-medium leading-none text-gray-800 dark:text-zinc-300">

                                                                    {{ $file->uid }}.{{ $file->file_extension }}

                                                                </p>

                                                                <p tabindex="0"
                                                                   class="focus:outline-none text-xs leading-3 text-gray-500 dark:text-zinc-400 mt-2.5">

                                                                    {{ $file->notes }}

                                                                </p>

                                                            </div>

                                                        </div>

                                                        <div class="flex items-center space-x-2 rtl:space-x-reverse">

                                                            <a href="{{ url('storage/offers-work', $file->uid . '.' . $file->file_extension) }}"
                                                               class="focus:outline-none">

                                                                <svg class="w-5 h-5 text-gray-400 hover:text-gray-700 dark:text-gray-300"
                                                                     stroke="currentColor" fill="currentColor"
                                                                     stroke-width="0" viewBox="0 0 24 24"
                                                                     xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="m12 16 4-5h-3V4h-2v7H8z"></path>
                                                                    <path d="M20 18H4v-7H2v7c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2v-7h-2v7z"></path>
                                                                </svg>

                                                            </a>

                                                            <button type="button"
                                                                    wire:click="deleteWork('{{ $offer->uid }}', '{{ $file->uid }}')"
                                                                    wire:loading.attr="disabled"
                                                                    wire:target="deleteWork('{{ $offer->uid }}', '{{ $file->uid }}')"
                                                                    class="focus:outline-none">

                                                                <svg class="w-5 h-5 text-gray-400 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
                                                                     stroke="currentColor" fill="currentColor"
                                                                     stroke-width="0" viewBox="0 0 24 24"
                                                                     xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M17 6V4c0-1.103-.897-2-2-2H9C7.897 2 7 2.897 7 4v2H3v2h2v12c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2V8h2V6h-4zm-8-2h6v2H9V4zm6 14h-2v-6h-2v6H9V8h6v10z"></path>
                                                                </svg>

                                                            </button>

                                                        </div>

                                                    </div>

                                                </div>

                                            @endforeach

                                        </div>

                                    </div>

                                @endif


                            </x-slot>


                        </x-forms.modal>

                    @endif

                @empty

                    <tr>

                        <td colspan="5"
                            class="py-4 font-light text-sm text-gray-400 dark:text-zinc-200 text-center tracking-wide shadow-sm bg-white dark:bg-zinc-800 rounded-md">

                            @lang('messages.no_results_found')

                        </td>

                    </tr>

                @endforelse

                </thead>

            </table>

        </div>

    </div>


    {{-- Pages --}}

    @if ($offers->hasPages())

        <div class="flex justify-center pt-12">

            {!! $offers->links('pagination::tailwind') !!}

        </div>

    @endif


</div>



@push('styles')

    <link rel="stylesheet" href="{{ url('js/plugins/file-icon-vectors/file-icon-vectors.min.css') }}"/>

@endpush
