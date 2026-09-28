<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 lg:pb-24">

    <div class="px-4 sm:px-6 lg:px-8">

        <div class="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">

            <div
                class="divide-y divide-gray-200 dark:divide-zinc-700 lg:grid lg:grid-cols-12 lg:divide-y-0 lg:divide-x rtl:divide-x-reverse">

                {{-- Section content --}}

                <div class="divide-y divide-gray-200 dark:divide-zinc-700 col-span-12">


                    {{-- Form --}}

                    <div class="py-6 px-4 sm:p-6 lg:pb-8 h-[calc(100%-80px)]">


                        {{-- Section header --}}

                        <div class="mb-14">

                            <h2 class="text-base leading-6 font-bold text-gray-900 dark:text-gray-100">{{ __('messages.t_orders_history') }}</h2>


                        </div>


                        {{-- Section content --}}

                        <div class="w-full mb-6">

                            @forelse ($orders as $order)

                                {{-- List of orders --}}

                                <div
                                    class="bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-md mb-10"
                                    wire:key="orders-{{ $order->uid }}">

                                    <div
                                        class="bg-gray-50 dark:bg-zinc-600 border-b sm:rounded-t-md flex items-center p-4 sm:p-6 sm:grid sm:grid-cols-4 sm:gap-x-6 dark:border-zinc-600">


                                        {{-- Order quick stats --}}

                                        <dl class="flex-1 grid grid-cols-2 gap-x-6 text-sm sm:col-span-3 sm:grid-cols-2 lg:col-span-2">


                                            {{-- Date placed --}}

                                            <div>

                                                <dt class="font-medium text-gray-900 dark:text-gray-200">{{ __('messages.t_date_placed') }}</dt>

                                                <dd class="mt-2 text-gray-500 dark:text-gray-50 text-xs">{{ format_date($order->placed_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}</dd>

                                            </div>


                                            {{-- Total amount --}}

                                            <div>

                                                <dt class="font-medium text-gray-900 dark:text-gray-200">{{ __('messages.t_total_amount') }}</dt>

                                                <dd class="mt-1 font-medium text-gray-900 dark:text-white">{{ money($order->total_value, settings('currency')->code, true) }}</dd>

                                            </div>


                                        </dl>


                                    </div>
                                    @if (!$order->items->first()->order_details && $order->items->first()->status === 'pending')
                                        <div
                                            class="bg-yellow-50 p-4 dark:bg-yellow-800 border-b border-yellow-200 dark:border-yellow-800 sm:p-6"
                                            wire:key="warning-{{ $order->uid }}">
                                            <div class="flex lg:flex-row flex-col gap-2 lg:gap-0 items-center justify-between">
                                                <div class="flex gap-2 lg:gap-0 lg:flex-row flex-col items-center">
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
                                                            {{ __('messages.t_order_details_warning') }}
                                                        </p>
                                                    </div>
                                                </div>

                                                <a href="{{ url('messages/new', $order->items->first()->owner?->username) }}"
                                                   target="_blank"
                                                   class="rounded border border-yellow-500 flex items-center px-4 py-2 hover:bg-yellow-100 dark:hover:bg-zinc-700 rounded-t">

                                                    <svg class="ltr:mr-3 rtl:ml-3 text-gray-500 w-5 h-5"
                                                         stroke="currentColor"
                                                         fill="currentColor"
                                                         stroke-width="0"
                                                         viewBox="0 0 24 24" height="1em"
                                                         width="1em"
                                                         xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M7 7h10v2H7zm0 4h7v2H7z"></path>
                                                        <path
                                                            d="M20 2H4c-1.103 0-2 .897-2 2v18l5.333-4H20c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm0 14H6.667L4 18V4h16v12z"></path>
                                                    </svg>

                                                    <span
                                                        class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_contact_seller') }}</span>

                                                </a>

                                            </div>
                                        </div>
                                    @endif

                                    {{-- List of gigs in this order --}}

                                    <ul role="list" class="divide-y divide-gray-200 dark:divide-zinc-600">


                                        @foreach ($order->items as $item)

                                            <li class="p-4 sm:p-6">

                                                <div class="flex items-center sm:items-start">


                                                    {{-- Gig thumbnail --}}

                                                    <div
                                                        class="flex-shrink-0 w-24 h-24 bg-gray-200 dark:bg-zinc-600 rounded-lg overflow-hidden hidden md:block">

                                                        <img
                                                            loading="lazy"
                                                            src="{{ $item->gig && $item->gig->thumbnail ? src($item->gig->thumbnail) : placeholder_img() }}"
                                                            data-src="{{ $item->gig && $item->gig->thumbnail ? src($item->gig->thumbnail) : placeholder_img() }}"
                                                            alt="{{ $item->gig->title ?? 'Deleted Gig' }}"
                                                            class="w-full h-full object-center object-cover">
                                                    </div>


                                                    {{-- Gig title  / Upgrades --}}

                                                    <div class="flex-1 ltr:md:ml-6 rtl:md:mr-6 text-sm">

                                                        <div
                                                            class="md:flex md:items-center md:justify-between md:space-x-4 rtl:space-x-reverse xl:pb-4">

                                                            <div>


                                                                {{-- Item title --}}

                                                                <h1 class="text-base font-bold text-gray-900 hover:text-primary-600 mb-2 dark:text-white">

                                                                    @if($item->gig)
                                                                        <a href="{{ url('service', $item->gig->slug) }}"
                                                                           target="_blank">{{ $item->gig->title }}</a>
                                                                    @else
                                                                        <span class="text-gray-500">{{ __('messages.t_gig_deleted') }}</span>
                                                                    @endif

                                                                </h1>


                                                                {{-- Item quick stats --}}

                                                                <div
                                                                    class="inline-block md:!flex text-gray-500 dark:text-gray-300 text-xs space-y-4 md:space-y-0 md:space-x-6 lg:space-x-12 rtl:space-x-reverse">


                                                                    {{-- Item total price --}}

                                                                    <span class="flex">

                                                                        <div class="md:text-center">

                                                                            <p class="text-[10px] tracking-widest text-gray-400 dark:text-gray-300 uppercase">{{ __('messages.t_total') }}</p>

                                                                            <p class="mt-2 text-[11px] text-gray-600 dark:text-gray-200 font-medium">

                                                                                {{ money($item->total_value, settings('currency')->code, true) }}

                                                                            </p>

                                                                        </div>

                                                                    </span>


                                                                    {{-- Item quantity --}}

                                                                    <span class="flex">

                                                                        <div class="md:text-center">

                                                                            <p class="text-[10px] tracking-widest text-gray-400 dark:text-gray-300 uppercase">{{ __('messages.t_quantity') }}</p>

                                                                            <p class="mt-2 text-[11px] text-gray-600 dark:text-gray-200 font-medium">

                                                                                {{ $item->quantity }}

                                                                            </p>

                                                                        </div>

                                                                    </span>


                                                                    {{-- Expected delivery date --}}

                                                                    <span class="flex">

                                                                        <div class="md:text-center">

                                                                            <p class="text-[10px] tracking-widest text-gray-400 dark:text-gray-300 uppercase">{{ __('messages.t_expected_delivery_date') }}</p>

                                                                            <p class="mt-2 text-[11px] text-gray-600 dark:text-gray-200 font-medium">

                                                                                @if ($item->expected_delivery_date)

                                                                                    {{ format_date($item->expected_delivery_date, config('carbon-formats.d_m_Y_H_i')) }}

                                                                                @else

                                                                                    —

                                                                                @endif

                                                                            </p>

                                                                        </div>

                                                                    </span>


                                                                    {{-- Status --}}
                                                                    <span class="flex">

                                                                        <div class="md:text-center">

                                                                            <p class="text-[10px] tracking-widest text-gray-400 dark:text-gray-300 uppercase">{{ __('messages.t_status') }}</p>


                                                                            {{-- Has refund opened --}}

                                                                            @if ($item->refund && $item->refund->status === 'pending')

                                                                                <p class="mt-2 text-[11px] text-red-500 font-medium">

                                                                                    {{ __('messages.t_dispute_opened') }}

                                                                                </p>

                                                                            @elseif ($item->order->invoice && $item->order->invoice->status === 'pending')

                                                                                <p class="mt-2 text-[11px] text-amber-500 font-medium">

                                                                                    {{ __('messages.t_pending_payment') }}

                                                                                </p>

                                                                            @elseif ($item->order->invoice && $item->order->invoice->status === 'paid' && $item->status == 'pending')

                                                                                <p class="mt-2 text-[11px] text-amber-500 font-medium">

                                                                                {{ __('messages.t_payment_received') }}

                                                                            </p>

                                                                            @elseif ($item->status === 'delivered' && $item->is_finished)

                                                                                <p class="mt-2 text-[11px] text-purple-500 font-medium">

                                                                                    {{ __('messages.t_completed') }}

                                                                                </p>

                                                                            @else

                                                                                @switch($item->status)

                                                                                    {{-- Pending --}}

                                                                                    @case('pending')

                                                                                        <p class="mt-2 text-[11px] text-amber-500 font-medium">

                                                                                            {{ __('messages.t_pending') }}

                                                                                        </p>

                                                                                        @break



                                                                                        {{-- In progress --}}

                                                                                    @case('proceeded')

                                                                                        <p data-tooltip-target="orders-{{ $order->uid }}-item-{{ $item->id }}-status-proceeded"
                                                                                           class="mt-2 text-[11px] text-blue-500 font-medium cursor-pointer">

                                                                                            {{ __('messages.t_in_the_process') }}

                                                                                        </p>

                                                                                        <div
                                                                                            id="orders-{{ $order->uid }}-item-{{ $item->id }}-status-proceeded"
                                                                                            role="tooltip"
                                                                                            class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">

                                                                                            {{ format_date($item->proceeded_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}

                                                                                        </div>

                                                                                        @break



                                                                                        {{-- Delivered --}}

                                                                                    @case('delivered')

                                                                                        <p data-tooltip-target="orders-{{ $order->uid }}-item-{{ $item->id }}-status-delivered"
                                                                                           class="mt-2 text-[11px] text-green-500 font-medium cursor-pointer">

                                                                                            {{ __('messages.t_delivered') }}

                                                                                        </p>

                                                                                        <div
                                                                                            id="orders-{{ $order->uid }}-item-{{ $item->id }}-status-delivered"
                                                                                            role="tooltip"
                                                                                            class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">

                                                                                            {{ format_date($item->delivered_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}

                                                                                        </div>

                                                                                        @break



                                                                                        {{-- Canceled --}}

                                                                                    @case('canceled')

                                                                                        <p data-tooltip-target="orders-{{ $order->uid }}-item-{{ $item->id }}-status-canceled"
                                                                                           class="mt-2 text-[11px] text-gray-500 font-medium cursor-pointer">

                                                                                            {{ __('messages.t_canceled') }}

                                                                                        </p>

                                                                                        <div
                                                                                            id="orders-{{ $order->uid }}-item-{{ $item->id }}-status-canceled"
                                                                                            role="tooltip"
                                                                                            class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">

                                                                                            {{ format_date($item->canceled_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}

                                                                                        </div>

                                                                                        @break



                                                                                        {{-- Refunded --}}

                                                                                    @case('refunded')

                                                                                        <p data-tooltip-target="orders-{{ $order->uid }}-item-{{ $item->id }}-status-refunded"
                                                                                           class="mt-2 text-[11px] text-red-500 font-medium cursor-pointer">

                                                                                            {{ __('messages.t_refunded') }}

                                                                                        </p>

                                                                                        <div
                                                                                            id="orders-{{ $order->uid }}-item-{{ $item->id }}-status-refunded"
                                                                                            role="tooltip"
                                                                                            class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">

                                                                                            {{ format_date($item->refunded_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}

                                                                                        </div>

                                                                                        @break

                                                                                    @default

                                                                                @endswitch

                                                                            @endif





                                                                        </div>

                                                                    </span>

                                                                </div>


                                                            </div>


                                                            {{-- Item actions --}}

                                                            <div class="mt-4 flex space-x-3 md:mt-0">

                                                                <button type="button"
                                                                        data-dropdown-toggle="orders-{{ $order->uid }}-item-{{ $item->id }}-actions-dropdown"
                                                                        data-dropdown-placement="left-start"
                                                                        class="inline-flex justify-center px-2 py-2 border border-gray-200 dark:border-zinc-700 shadow-sm text-xs font-medium rounded-full text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 focus:outline-none focus:ring-0">

                                                                    <svg xmlns="http://www.w3.org/2000/svg"
                                                                         class="h-5 w-5 text-gray-400" fill="none"
                                                                         viewBox="0 0 24 24" stroke="currentColor"
                                                                         stroke-width="2">
                                                                        <path stroke-linecap="round"
                                                                              stroke-linejoin="round"
                                                                              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/>
                                                                    </svg>

                                                                </button>

                                                                <div
                                                                    id="orders-{{ $order->uid }}-item-{{ $item->id }}-actions-dropdown"
                                                                    class="z-10 hidden bg-white divide-y divide-gray-100 rounded shadow w-48 dark:bg-zinc-800">

                                                                    <ul class="text-sm text-gray-700 dark:text-gray-200"
                                                                        aria-labelledby="dropdownDefault">


                                                                        {{-- Contact seller --}}

                                                                        <li>

                                                                            <a href="{{ url('messages/new', $item->owner?->username) }}"
                                                                               target="_blank"
                                                                               class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-t">

                                                                                <svg
                                                                                    class="ltr:mr-3 rtl:ml-3 text-gray-500 w-5 h-5"
                                                                                    stroke="currentColor"
                                                                                    fill="currentColor"
                                                                                    stroke-width="0"
                                                                                    viewBox="0 0 24 24" height="1em"
                                                                                    width="1em"
                                                                                    xmlns="http://www.w3.org/2000/svg">
                                                                                    <path
                                                                                        d="M7 7h10v2H7zm0 4h7v2H7z"></path>
                                                                                    <path
                                                                                        d="M20 2H4c-1.103 0-2 .897-2 2v18l5.333-4H20c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm0 14H6.667L4 18V4h16v12z"></path>
                                                                                </svg>

                                                                                <span
                                                                                    class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_contact_seller') }}</span>

                                                                            </a>

                                                                        </li>


                                                                        {{-- Pay and Delete buttons for pending payment orders --}}

                                                                        @if ($item->order->invoice && $item->order->invoice->status === 'pending')

                                                                            {{-- Pay button --}}

                                                                            <li>

                                                                                <button type="button"
                                                                                        wire:click="pay('{{ $order->uid }}')"
                                                                                        wire:loading.attr="disabled"
                                                                                        wire:target="pay('{{ $order->uid }}')"
                                                                                        class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 w-full">

                                                                                    {{-- Loading indicator --}}

                                                                                    <div wire:loading
                                                                                         wire:target="pay('{{ $order->uid }}')">

                                                                                        <svg role="status"
                                                                                             class="ltr:mr-3 rtl:ml-3 inline w-5 h-5 text-gray-500 animate-spin"
                                                                                             viewBox="0 0 100 101"
                                                                                             fill="none"
                                                                                             xmlns="http://www.w3.org/2000/svg">

                                                                                            <path
                                                                                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                                                                fill="#E5E7EB"/>

                                                                                            <path
                                                                                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                                                                fill="currentColor"/>

                                                                                        </svg>

                                                                                    </div>


                                                                                    {{-- Icon --}}

                                                                                    <div wire:loading.remove
                                                                                         wire:target="pay('{{ $order->uid }}')">

                                                                                        <svg
                                                                                            class="ltr:mr-3 rtl:ml-3 text-gray-500 w-5 h-5"
                                                                                            stroke="currentColor"
                                                                                            fill="currentColor"
                                                                                            stroke-width="0"
                                                                                            viewBox="0 0 24 24"
                                                                                            height="1em"
                                                                                            width="1em"
                                                                                            xmlns="http://www.w3.org/2000/svg">
                                                                                            <path
                                                                                                d="M20 7V5c0-1.103-.897-2-2-2H5C3.346 3 2 4.346 2 6v12c0 2.201 1.794 3 3 3h15c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2zM5 5h13v2H5a1.001 1.001 0 0 1 0-2zm15 14H5.012C4.55 18.988 4 18.805 4 18V8.815c.314.113.647.185 1 .185h15v10z"></path>
                                                                                        </svg>

                                                                                    </div>


                                                                                    <span
                                                                                        class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_pay') }}</span>


                                                                                </button>

                                                                            </li>


                                                                            {{-- Delete button --}}

                                                                            <li>

                                                                                <button type="button"
                                                                                        x-on:click="confirm('{{ __('messages.t_are_u_sure_u_want_to_delete_pending_order') }}') ? $wire.deletePendingOrder('{{ $order->uid }}') : ''"
                                                                                        wire:loading.attr="disabled"
                                                                                        wire:target="deletePendingOrder('{{ $order->uid }}')"
                                                                                        class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 w-full">


                                                                                    {{-- Loading indicator --}}

                                                                                    <div wire:loading
                                                                                         wire:target="deletePendingOrder('{{ $order->uid }}')">

                                                                                        <svg role="status"
                                                                                             class="ltr:mr-3 rtl:ml-3 inline w-5 h-5 text-gray-500 animate-spin"
                                                                                             viewBox="0 0 100 101"
                                                                                             fill="none"
                                                                                             xmlns="http://www.w3.org/2000/svg">

                                                                                            <path
                                                                                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                                                                fill="#E5E7EB"/>

                                                                                            <path
                                                                                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                                                                fill="currentColor"/>

                                                                                        </svg>

                                                                                    </div>


                                                                                    {{-- Icon --}}

                                                                                    <div wire:loading.remove
                                                                                         wire:target="deletePendingOrder('{{ $order->uid }}')">

                                                                                        <svg
                                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                                            class="ltr:mr-3 rtl:ml-3 h-5 w-5 text-gray-500 group-hover:text-gray-600"
                                                                                            fill="none"
                                                                                            viewBox="0 0 24 24"
                                                                                            stroke="currentColor"
                                                                                            stroke-width="2">
                                                                                            <path stroke-linecap="round"
                                                                                                  stroke-linejoin="round"
                                                                                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                                                        </svg>

                                                                                    </div>


                                                                                    <span
                                                                                        class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_delete') }}</span>


                                                                                </button>

                                                                            </li>

                                                                        @endif


                                                                        @php



                                                                            // Check expected delivery date

                                                                            if ($item->expected_delivery_date && !$item->is_finished) {



                                                                                // Parse expected delivery date

                                                                                $parsed = \Carbon\Carbon::parse($item->expected_delivery_date);



                                                                                // Check if date is past

                                                                                if ($parsed->isPast()) {



                                                                                    // Date in past, check item status

                                                                                    if (in_array($item->status, ['delivered', 'proceeded', 'pending'])) {



                                                                                        // Can request refund

                                                                                        $can_refund = true;



                                                                                    } else {



                                                                                        // Cannot request refund

                                                                                        $can_refund = false;



                                                                                    }



                                                                                } else if ($item->status === 'delivered' && !$item->is_finished) {



                                                                                    // Can refund

                                                                                    $can_refund = true;



                                                                                } else {



                                                                                    // Cannot request refund

                                                                                    $can_refund = false;



                                                                                }



                                                                            } else {



                                                                                $can_refund = false;



                                                                            }



                                                                        @endphp



                                                                        {{-- View refund --}}

                                                                        @if ($item->refund)

                                                                            <li>

                                                                                <a href="{{ url('account/refunds/details', $item->refund->uid) }}"
                                                                                   target="_blank"
                                                                                   class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700">

                                                                                    <svg
                                                                                        class="ltr:mr-3 rtl:ml-3 text-gray-500 w-5 h-5"
                                                                                        stroke="currentColor"
                                                                                        fill="currentColor"
                                                                                        stroke-width="0"
                                                                                        viewBox="0 0 24 24"
                                                                                        height="1em" width="1em"
                                                                                        xmlns="http://www.w3.org/2000/svg">
                                                                                        <path d="M16 12h2v4h-2z"></path>
                                                                                        <path
                                                                                            d="M20 7V5c0-1.103-.897-2-2-2H5C3.346 3 2 4.346 2 6v12c0 2.201 1.794 3 3 3h15c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2zM5 5h13v2H5a1.001 1.001 0 0 1 0-2zm15 14H5.012C4.55 18.988 4 18.805 4 18V8.815c.314.113.647.185 1 .185h15v10z"></path>
                                                                                    </svg>

                                                                                    <span
                                                                                        class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_refund_details') }}</span>

                                                                                </a>

                                                                            </li>

                                                                        @else

                                                                            {{-- Request refund --}}

                                                                            @if ($can_refund)

                                                                                <li>

                                                                                    <a href="{{ url('account/refunds/request', $item->uid) }}"
                                                                                       target="_blank"
                                                                                       class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700">

                                                                                        <svg
                                                                                            class="ltr:mr-3 rtl:ml-3 text-gray-500 w-5 h-5"
                                                                                            stroke="currentColor"
                                                                                            fill="currentColor"
                                                                                            stroke-width="0"
                                                                                            viewBox="0 0 24 24"
                                                                                            height="1em" width="1em"
                                                                                            xmlns="http://www.w3.org/2000/svg">
                                                                                            <path
                                                                                                d="M16 12h2v4h-2z"></path>
                                                                                            <path
                                                                                                d="M20 7V5c0-1.103-.897-2-2-2H5C3.346 3 2 4.346 2 6v12c0 2.201 1.794 3 3 3h15c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2zM5 5h13v2H5a1.001 1.001 0 0 1 0-2zm15 14H5.012C4.55 18.988 4 18.805 4 18V8.815c.314.113.647.185 1 .185h15v10z"></path>
                                                                                        </svg>

                                                                                        <span
                                                                                            class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_request_refund') }}</span>

                                                                                    </a>

                                                                                </li>

                                                                            @endif

                                                                        @endif



                                                                        {{-- Delivered work --}}

                                                                        @if (in_array($item->status, ['proceeded', 'delivered']))

                                                                            <li>

                                                                                <a href="{{ url('account/orders/files?orderId=' . $order->uid . '&itemId=' . $item->uid) }}"
                                                                                   class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700">

                                                                                    <svg
                                                                                        class="w-5 h-5 ltr:mr-3 rtl:ml-3 text-gray-500"
                                                                                        stroke="currentColor"
                                                                                        fill="currentColor"
                                                                                        stroke-width="0"
                                                                                        viewBox="0 0 24 24"
                                                                                        xmlns="http://www.w3.org/2000/svg">
                                                                                        <path
                                                                                            d="M2.165 19.551c.186.28.499.449.835.449h15c.4 0 .762-.238.919-.606l3-7A.998.998 0 0 0 21 11h-1V7c0-1.103-.897-2-2-2h-6.1L9.616 3.213A.997.997 0 0 0 9 3H4c-1.103 0-2 .897-2 2v14h.007a1 1 0 0 0 .158.551zM17.341 18H4.517l2.143-5h12.824l-2.143 5zM18 7v4H6c-.4 0-.762.238-.919.606L4 14.129V7h14z"></path>
                                                                                    </svg>

                                                                                    <span
                                                                                        class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_delivered_work') }}</span>

                                                                                </a>

                                                                            </li>

                                                                        @endif



                                                                        {{-- Cancel service --}}

                                                                        @if ($item->status === 'pending' && $item->order->invoice && $item->order->invoice->status === 'paid')

                                                                            <li>

                                                                                <button type="button"
                                                                                        x-on:click="confirm('{{ __('messages.t_are_u_sure_u_want_to_cancel_service') }}') ? $wire.cancel('{{ $item->uid }}') : ''"
                                                                                        wire:loading.attr="disabled"
                                                                                        wire:target="cancel('{{ $item->uid }}')"
                                                                                        class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 w-full">


                                                                                    {{-- Loading indicator --}}

                                                                                    <div wire:loading
                                                                                         wire:target="cancel('{{ $item->uid }}')">

                                                                                        <svg role="status"
                                                                                             class="ltr:mr-3 rtl:ml-3 inline w-5 h-5 text-gray-500 animate-spin"
                                                                                             viewBox="0 0 100 101"
                                                                                             fill="none"
                                                                                             xmlns="http://www.w3.org/2000/svg">

                                                                                            <path
                                                                                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                                                                fill="#E5E7EB"/>

                                                                                            <path
                                                                                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                                                                fill="currentColor"/>

                                                                                        </svg>

                                                                                    </div>


                                                                                    {{-- Icon --}}

                                                                                    <div wire:loading.remove
                                                                                         wire:target="cancel('{{ $item->uid }}')">

                                                                                        <svg
                                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                                            class="ltr:mr-3 rtl:ml-3 h-5 w-5 text-gray-500 group-hover:text-gray-600"
                                                                                            fill="none"
                                                                                            viewBox="0 0 24 24"
                                                                                            stroke="currentColor"
                                                                                            stroke-width="2">
                                                                                            <path stroke-linecap="round"
                                                                                                  stroke-linejoin="round"
                                                                                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                                                                        </svg>

                                                                                    </div>


                                                                                    <span
                                                                                        class="text-xs font-medium">{{ __('messages.t_cancel_service') }}</span>


                                                                                </button>

                                                                            </li>

                                                                        @endif


                                                                        {{-- Make review --}}

                                                                        @if ( $item->status === 'delivered' && $item->is_finished )

                                                                            <li>

                                                                                <a href="{{ url('account/reviews/create/' . $item->uid) }}"
                                                                                   class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-b">

                                                                                    <svg
                                                                                        class="ltr:mr-3 rtl:ml-3 text-gray-500 w-5 h-5"
                                                                                        stroke="currentColor"
                                                                                        fill="currentColor"
                                                                                        stroke-width="0"
                                                                                        viewBox="0 0 24 24"
                                                                                        xmlns="http://www.w3.org/2000/svg">
                                                                                        <path
                                                                                            d="m6.516 14.323-1.49 6.452a.998.998 0 0 0 1.529 1.057L12 18.202l5.445 3.63a1.001 1.001 0 0 0 1.517-1.106l-1.829-6.4 4.536-4.082a1 1 0 0 0-.59-1.74l-5.701-.454-2.467-5.461a.998.998 0 0 0-1.822 0L8.622 8.05l-5.701.453a1 1 0 0 0-.619 1.713l4.214 4.107zm2.853-4.326a.998.998 0 0 0 .832-.586L12 5.43l1.799 3.981a.998.998 0 0 0 .832.586l3.972.315-3.271 2.944c-.284.256-.397.65-.293 1.018l1.253 4.385-3.736-2.491a.995.995 0 0 0-1.109 0l-3.904 2.603 1.05-4.546a1 1 0 0 0-.276-.94l-3.038-2.962 4.09-.326z"></path>
                                                                                    </svg>

                                                                                    <span
                                                                                        class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ __('messages.t_make_a_review') }}</span>

                                                                                </a>

                                                                            </li>

                                                                        @endif


                                                                    </ul>

                                                                </div>

                                                            </div>

                                                        </div>

                                                        {{-- Upgrades --}}

                                                        @if ($item->has('upgrades'))

                                                            <div class="mt-4">

                                                                <fieldset class="space-y-5">

                                                                    @foreach ($item->upgrades as $upgrade)

                                                                        <div class="relative flex items-start">

                                                                            <div class="flex items-center h-5">

                                                                                <input type="checkbox"
                                                                                       class="h-4 w-4 text-gray-300 dark:text-gray-400 border-gray-200 dark:border-zinc-600 dark:disabled:bg-zinc-600 border-2 rounded-sm cursor-not-allowed pointer-events-none"
                                                                                       checked disabled>

                                                                            </div>

                                                                            <div
                                                                                class="ltr:ml-3 rtl:mr-3 text-sm mt-[-3px]">

                                                                                <label
                                                                                    class="font-medium text-gray-500 dark:text-gray-100 text-xs">

                                                                                    {{ $upgrade->title }}

                                                                                </label>

                                                                                <p class="font-normal text-gray-400">

                                                                                <div class="mt-1 flex text-sm">

                                                                                    <p class="text-gray-400 dark:text-gray-300 text-xs">
                                                                                        + {{ money($upgrade->price, settings('currency')->code, true) }}</p>


                                                                                    @if ($upgrade->extra_days)

                                                                                        <p class="ltr:ml-4 rtl:mr-4 ltr:pl-4 rtl:pr-4 ltr:border-l rtl:border-r border-gray-200 dark:border-zinc-600 text-gray-400 dark:text-gray-300 text-xs">

                                                                                            {{ __('messages.t_extra_days_delivery_time_short', ['time' => delivery_time_trans($upgrade->extra_days)]) }}

                                                                                        </p>

                                                                                    @else

                                                                                        <p class="ltr:ml-4 rtl:mr-4 ltr:pl-4 rtl:pr-4 ltr:border-l rtl:border-r border-gray-200 dark:border-zinc-600 text-gray-400 dark:text-gray-300 text-xs">

                                                                                            {{ __('messages.t_no_changes_delivery_time') }}

                                                                                        </p>

                                                                                    @endif

                                                                                </div>


                                                                            </div>

                                                                        </div>

                                                                    @endforeach


                                                                </fieldset>

                                                            </div>

                                                        @endif


                                                    </div>


                                                </div>


                                                <div class="mt-6 sm:flex sm:justify-between">

                                                    <div class="flex items-center"></div>

                                                    {{-- Footer actions --}}

                                                    <div
                                                        class="gap-4 md:gap-0 mt-6 border-t border-gray-200 pt-4 flex flex-col items-start md:flex-row md:items-center md:space-x-4 md:divide-x md:divide-gray-200 md:dark:divide-zinc-600 md:rtl:divide-x-reverse text-sm font-medium sm:mt-0 sm:ltr:ml-4 sm:rtl:mr-4 sm:border-none sm:pt-0 rtl:space-x-reverse">

                                                        {{-- View gig --}}

                                                        <div class="flex-1 flex justify-center">

                                                            <a href="{{ url('service', $item->gig->slug) }}"
                                                               target="_blank"
                                                               class="text-primary-600 whitespace-nowrap hover:text-primary-600">{{ __('messages.t_view_gig') }}</a>

                                                        </div>

                                                        {{-- Send order details --}}
                                                        @if ($item->order->invoice && $item->order->invoice->status === 'paid' && $item->status === 'pending' )
                                                            <div class="flex-1 flex justify-start md:justify-center md:pl-4 border-t w-full pt-2 md:border-t-0 md:w-auto md:pt-0">
                                                                <button type="button"
                                                                        class="text-primary-600 whitespace-nowrap hover:text-primary-600 text-left md:text-center"
                                                                        wire:click="openDetailsModal('{{ $item->uid }}')">
                                                                    {{ __('messages.t_send_details') }}
                                                                </button>
                                                            </div>
                                                        @endif

                                                    </div>

                                                </div>

                                            </li>

                                        @endforeach


                                    </ul>


                                </div>

                            @empty

                                {{-- No orders yet --}}

                                <div class="rounded-md bg-blue-50 p-4">

                                    <div class="flex">

                                        <div class="flex-shrink-0">

                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400"
                                                 viewBox="0 0 20 20" fill="currentColor">
                                                <path
                                                    d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                                            </svg>

                                        </div>

                                        <div class="ltr:ml-3 rtl:mr-3 flex-1 md:flex md:justify-between">

                                            <p class="text-sm text-blue-700 font-medium">

                                                {{ __('messages.t_ur_orders_history_is_empty_right_now') }}

                                            </p>

                                            <p class="mt-3 text-sm md:mt-0 md:ltr:ml-6 md:rtl:mr-6">

                                                <a href="{{ url('/') }}"
                                                   class="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600">{{ __('messages.t_go_shopping') }}
                                                    <span aria-hidden="true">&rarr;</span></a>

                                            </p>

                                        </div>

                                    </div>

                                </div>

                            @endforelse


                            {{-- Pages --}}

                            @if ($orders->hasPages())

                                <div
                                    class="bg-white border-t border-b border-gray-200 shadow-sm sm:rounded-lg sm:border px-4 py-5 sm:px-6 flex justify-center">

                                    {!! $orders->links('pagination::tailwind') !!}

                                </div>

                            @endif


                        </div>


                    </div>


                </div>


            </div>

        </div>

    </div>

<x-forms.modal
    id="order-details-modal"
    target="dummy-target"
    size="max-w-3xl"
    aria-hidden="true"
    uid="order_details_modal"
    placement="center"
    wire:key="order-details-modal-{{ $currentItemId ?? 'default' }}">

    <x-slot name="title">
        {{ __('messages.t_send_details') }}
    </x-slot>

    <x-slot name="content">
        <x-forms.ckeditor1
            label="{{ __('messages.t_order_details') }}"
            placeholder="{{ __('messages.t_type_ur_message_here') }}"
            model="orderDetailsText"
            :quillId="'order-details-editor'"
            :old="$orderDetailsText"
            target="save-order-details-btn"
            wire:key="order-details-editor-{{ $currentItemId ?? 'default' }}"
        />

        <div class="mt-4">
            <div class="py-2.5 px-3 rounded text-amber-700 bg-amber-50">
                <div class="flex items-center gap-x-3">
                    <svg class="inline-block w-5 h-5 flex-none text-amber-500" fill="currentColor" viewBox="0 0 20 20"
                         xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clip-rule="evenodd"></path>
                    </svg>
                    <h3 class="font-semibold grow text-xs leading-5">
                        {{ __('messages.t_info_sent_details') }}
                    </h3>
                </div>
            </div>
        </div>
    </x-slot>

    <x-slot name="footer">
        <button id="save-order-details-btn" type="button"
                class="px-4 py-2 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-sm"
                wire:click="saveOrderDetails">
            {{ __('messages.t_save') }}
        </button>
    </x-slot>
</x-forms.modal>

@push('scripts')
    <script>
        if (!window.orderDetailsModalInitialized) {
            window.orderDetailsModalInitialized = true;

            window.addEventListener('order-details:open', (e) => {
                if (window.editor1) {
                    const htmlContent = e.detail[0].html;
                    if (htmlContent.trim() !== '') {
                        editor1.root.innerHTML = htmlContent;
                        window.content = editor1.root.innerHTML;
                        editor1.focus();
                        editor1.blur();
                    } else {
                        editor1.root.innerHTML = '';
                        window.content = '';
                    }
                }
            });

            let dropdownStates = new Map();
            let isInitialized = false;

            function ensureModalButtonsWork() {
                const modalButtons = document.querySelectorAll('[wire\\:click*="openDetailsModal"]');
                modalButtons.forEach(function (button) {
                    button.style.pointerEvents = 'auto';
                    button.style.cursor = 'pointer';
                });
            }

            function hideAllDropdowns() {
                document.querySelectorAll('[data-dropdown-toggle]').forEach(toggle => {
                    const targetId = toggle.getAttribute('data-dropdown-toggle');
                    const dropdown = document.getElementById(targetId);
                    if (dropdown) {
                        dropdown.classList.add('hidden');
                        dropdownStates.set(targetId, false);
                    }
                });
            }

            function initializeCustomDropdowns() {
                document.querySelectorAll('[data-dropdown-toggle]').forEach(toggle => {
                    const targetId = toggle.getAttribute('data-dropdown-toggle');
                    const dropdown = document.getElementById(targetId);

                    if (dropdown && !toggle.hasAttribute('data-custom-initialized')) {
                        toggle.setAttribute('data-custom-initialized', 'true');

                        dropdownStates.set(targetId, dropdown.classList.contains('hidden'));

                        toggle.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();

                            hideAllDropdowns();

                            const isHidden = dropdown.classList.contains('hidden');
                            if (isHidden) {
                                dropdown.classList.remove('hidden');
                                dropdownStates.set(targetId, false);
                            } else {
                                dropdown.classList.add('hidden');
                                dropdownStates.set(targetId, true);
                            }
                        });
                    }
                });

                if (!isInitialized) {
                    document.addEventListener('click', function(e) {
                        if (!e.target.closest('[data-dropdown-toggle]') && !e.target.closest('[id*="actions-dropdown"]')) {
                            hideAllDropdowns();
                        }
                    });
                    isInitialized = true;
                }
            }

            function initializeComponents() {
                ensureModalButtonsWork();

                try {
                    if (typeof window.initFlowbite === 'function') {
                        window.initFlowbite();
                    } else if (typeof initFlowbite === 'function') {
                        initFlowbite();
                    } else {
                        initializeCustomDropdowns();
                    }
                } catch (error) {
                    console.warn('Flowbite failed, using custom dropdowns:', error);
                    initializeCustomDropdowns();
                }
            }

            initializeComponents();

            const observer = new MutationObserver(function(mutations) {
                let shouldReinit = false;
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1) { // Element node
                                if (node.querySelector && node.querySelector('[data-dropdown-toggle]')) {
                                    shouldReinit = true;
                                }
                            }
                        });
                    }
                });

                if (shouldReinit) {
                    setTimeout(initializeComponents, 100);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            document.addEventListener('livewire:update', function() {
                setTimeout(initializeComponents, 150);
            });

            document.addEventListener('livewire:navigated', function() {
                setTimeout(initializeComponents, 150);
            });
        }
    </script>
@endpush
