<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24"
     x-data="window.oZcfXWmBuWfxbIo" x-init="initialize()">


    {{-- Check if user unavailable --}}

    @if ($gig->owner->availability)

        <div class="rounded-md bg-amber-100 p-4 mb-6">

            <div class="flex">

                <div class="flex-shrink-0">

                    <svg class="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                         fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clip-rule="evenodd"/>
                    </svg>

                </div>

                <div class="ltr:ml-3 rtl:mr-3">

                    <h3 class="text-sm font-bold text-amber-800">{{ __('messages.t_attention_needed') }}</h3>

                    <div class="mt-2 text-xs font-normal text-amber-700">

                        <p>

                            {!! __('messages.t_seller_wont_be_able_to_receive_orders_date', ['date' => format_date($gig->owner->availability->expected_available_date, config('carbon-formats.F_j,_Y'))]) !!}

                        </p>

                        <p class="border-l-4 pl-2 border-amber-500 mt-4">

                            {{ $gig->owner->availability->message }}

                        </p>

                    </div>

                </div>

            </div>

        </div>

    @endif



    {{-- Check status of this gig --}}

    @if ($gig->status === 'pending')

        <div class="bg-yellow-100 ltr:border-l-4 rtl:border-r-4 border-yellow-400 p-4 mb-6">

            <div class="flex">

                <div class="flex-shrink-0">

                    <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                         fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clip-rule="evenodd"/>
                    </svg>

                </div>

                <div class="ltr:ml-3 rtl:mr-3">

                    <p class="text-sm text-yellow-700 font-medium">

                        {{ __('messages.t_this_gig_not_activated_yet') }}

                    </p>

                </div>

            </div>

        </div>

    @endif



    {{-- Gig content --}}

    <div class="bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-gray-100 dark:ring-zinc-700 border border-gray-50 dark:border-zinc-700 rounded-xl px-4 py-4 lg:px-12 lg:py-12">


        {{-- Title / Price / Stats --}}

        <div class="w-full mb-0 md:mb-12">


            {{-- Breadcrumbs / Share / Flag / Favorite --}}

            <div class="md:flex items-center justify-between mb-0 md:mb-6">


                {{-- Breadcrumbs --}}

                <nav class="hidden md:flex" aria-label="Breadcrumb">

                    <ol role="list" class="md:flex items-center space-x-2 rtl:space-x-reverse">


                        {{-- Home --}}

                        <li>

                            <div>

                                <a href="{{ url('/') }}" class="text-gray-400 hover:text-gray-600">

                                    <svg class="flex-shrink-0 h-5 w-5 -mt-[3px]" xmlns="http://www.w3.org/2000/svg"
                                         viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                                    </svg>

                                    <span class="sr-only">Home</span>

                                </a>

                            </div>

                        </li>


                        {{-- Category --}}

                        <li>

                            <div class="flex items-center">


                                <svg class="hidden ltr:block flex-shrink-0 h-4 w-4 text-gray-300"
                                     xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                                     aria-hidden="true">
                                    <path fill-rule="evenodd"
                                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                          clip-rule="evenodd"/>
                                </svg>


                                <svg xmlns="http://www.w3.org/2000/svg"
                                     class="hidden rtl:block flex-shrink-0 h-4 w-4 text-gray-300" viewBox="0 0 20 20"
                                     fill="currentColor">
                                    <path fill-rule="evenodd"
                                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                          clip-rule="evenodd"/>
                                </svg>


                                <a href="{{ url('categories', $gig->category->slug) }}"
                                   class="ltr:ml-2 rtl:mr-2 text-sm font-medium text-gray-400 hover:text-gray-600">{{ $gig->category->name }}</a>

                            </div>

                        </li>


                        {{-- Subcategory --}}

                        <li>

                            <div class="flex items-center">


                                <svg class="hidden ltr:block flex-shrink-0 h-4 w-4 text-gray-300"
                                     xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                                     aria-hidden="true">
                                    <path fill-rule="evenodd"
                                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                          clip-rule="evenodd"/>
                                </svg>


                                <svg xmlns="http://www.w3.org/2000/svg"
                                     class="hidden rtl:block flex-shrink-0 h-4 w-4 text-gray-300" viewBox="0 0 20 20"
                                     fill="currentColor">
                                    <path fill-rule="evenodd"
                                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                          clip-rule="evenodd"/>
                                </svg>


                                <a href="{{ url('categories/' . utf8_decode(urldecode($gig->category->slug . '/' . $gig->subcategory->slug))) }}"
                                   class="ltr:ml-2 rtl:mr-2 text-sm font-medium text-gray-400 hover:text-gray-600"
                                   aria-current="page">{{ $gig->subcategory->name }}</a>

                            </div>

                        </li>


                        {{-- Childcategory --}}

                        @if ($gig->childcategory)

                            <li>

                                <div class="flex items-center">


                                    <svg class="hidden ltr:block flex-shrink-0 h-4 w-4 text-gray-300"
                                         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                                         aria-hidden="true">
                                        <path fill-rule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              clip-rule="evenodd"/>
                                    </svg>


                                    <svg xmlns="http://www.w3.org/2000/svg"
                                         class="hidden rtl:block flex-shrink-0 h-4 w-4 text-gray-300"
                                         viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd"
                                              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                              clip-rule="evenodd"/>
                                    </svg>


                                    <a href="{{ url('categories/' . utf8_decode(urldecode($gig->category->slug . '/' . $gig->subcategory->slug . '/' . $gig->childcategory->slug))) }}"
                                       class="ltr:ml-2 rtl:mr-2 text-sm font-medium text-gray-400 hover:text-gray-600"
                                       aria-current="page">{{ $gig->childcategory->name }}</a>

                                </div>

                            </li>

                        @endif


                    </ol>

                </nav>


                {{-- Price --}}

                <div class="hidden items-center md:!grid">

                    <span class="uppercase text-[10px] text-gray-400 dark:text-gray-300 mb-1 tracking-widest">{{ __('messages.t_starting_at') }}</span>

                    <span class="text-black dark:text-white text-2xl tracking-wide font-black">{{ money($gig->price, settings('currency')->code, true) }}</span>

                </div>


            </div>


        </div>


        {{-- Gig --}}

        <div class="lg:grid lg:grid-rows-1 lg:grid-cols-7 lg:gap-x-8 lg:gap-y-10 xl:gap-x-16">


            {{-- Gig carousel --}}

            <div class="lg:row-end-1 lg:col-span-4">

                <div class="rounded-xl overflow-hidden">

                    <div wire:ignore>

                        {{-- Main --}}

                        <section id="main-carousel" class="splide rounded-xl">

                            <div class="splide__track">

                                <ul class="splide__list">


                                    {{-- Check if gig has video --}}

                                    @if ($gig->video_id)

                                        <li class="splide__slide dark:bg-zinc-700 bg-gray-200 object-contain"
                                            data-splide-youtube="https://www.youtube.com/watch?v={{ $gig->video_id }}">

                                            <img src="{{ src($gig->imageLarge) }}" alt="{{ $gig->title }}"
                                                 class=" object-contain">

                                        </li>

                                    @endif



                                    {{-- List of images --}}

                                    @foreach ($gig->images as $image)

                                        <li class="splide__slide dark:bg-zinc-700 bg-gray-200 object-contain">

                                            <img src="{{ src($image->large) }}" alt="{{ $gig->title }}"
                                                 class="object-contain ">

                                        </li>

                                    @endforeach


                                </ul>

                            </div>

                        </section>


                        {{-- Thumbnails --}}

                        <section id="thumbnail-carousel" class="splide">

                            <div class="splide__track">

                                <ul class="splide__list">


                                    {{-- Check if gig has video --}}

                                    @if ($gig->video_link)

                                        <li class="splide__slide !sr-only" data-splide-youtube="{{ $gig->video_link }}">

                                            <img src="{{ src($gig->thumbnail) }}" alt="{{ $gig->title }}"
                                                 class=" object-cover">

                                        </li>

                                    @endif



                                    {{-- List of images --}}

                                    @foreach ($gig->images as $image)

                                        <li class="splide__slide">

                                            <img src="{{ src($image->small) }}" alt="{{ $gig->title }}"
                                                 class=" object-cover shadow">

                                        </li>

                                    @endforeach

                                </ul>

                            </div>

                        </section>

                    </div>

                </div>

            </div>


            {{-- Gig details --}}

            <div class="max-w-2xl mx-auto mt-6 md:mt-14 sm:mt-16 lg:max-w-none lg:mt-0 lg:row-end-2 lg:row-span-2 lg:col-span-3">


                {{-- Price (Mobile) --}}

                <div class="grid items-center md:!hidden md:mb-0 mb-4">

                    <span class="uppercase text-[10px] text-gray-400 dark:text-gray-300 mb-1 tracking-widest">{{ __('messages.t_starting_at') }}</span>

                    <span class="text-black dark:text-white text-2xl tracking-wide font-black">{{ money($gig->price, settings('currency')->code, true) }}</span>

                </div>


                {{-- Title && Rating --}}

                <div class="flex flex-col-reverse">


                    <div class="mt-4">


                        {{-- Title --}}

                        <h1 class="text-xl font-extrabold tracking-wide leading-8 text-black dark:text-white sm:text-2xl">

                            {{ $gig->title }}

                        </h1>


                        {{-- Seller && Orders in queue && Delivery date --}}

                        <div class="w-full mt-4 grid md:!flex justify-between items-center border-b border-gray-50 dark:border-zinc-700 pb-9 space-y-3 md:space-y-0 space-x-2 rtl:space-x-reverse">


                            {{-- Seller --}}

                            <a href="{{ url('profile', $gig->owner->username) }}" target="_blank"
                               class="flex-shrink-0 group block">

                                <div class="flex items-center">

                                    <span class="inline-block relative">

                                        <img class="h-6 w-6 rounded-full object-cover lazy"
                                             src="{{ placeholder_img() }}" data-src="{{ src($gig->owner->avatar) }}"
                                             alt="{{ $gig->owner->username }}">

                                    </span>

                                    <div class="ltr:ml-3 rtl:mr-3">

                                        <div class="text-gray-500 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 flex items-center">

                                            <span class="font-extrabold tracking-wide text-[13px]">{{ $gig->owner->username }}</span>

                                            @if ($gig->owner->status === 'verified')

                                                <img data-tooltip-target="tooltip-account-verified-{{ $gig->uid }}"
                                                     class="ltr:ml-0.5 rtl:mr-0.5 h-4 w-4 -mt-0.5"
                                                     src="{{ url('img/auth/verified-badge.svg') }}"
                                                     alt="{{ __('messages.t_account_verified') }}">

                                                <div id="tooltip-account-verified-{{ $gig->uid }}" role="tooltip"
                                                     class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">

                                                    {{ __('messages.t_account_verified') }}

                                                </div>

                                            @endif

                                        </div>

                                    </div>

                                </div>

                            </a>


                            <span class="h-4 w-px bg-gray-200 dark:bg-zinc-700 hidden md:!inline"
                                  aria-hidden="true"></span>


                            {{-- Orders in queue --}}

                            <div class="text-sm font-normal text-gray-500 dark:text-gray-400">

                                @if ($gig->total_orders_in_queue() == 1 || $gig->total_orders_in_queue() == 0)

                                    {{ __('messages.t_number_order_in_queue', ['number' => $gig->total_orders_in_queue()]) }}

                                @else

                                    {{ __('messages.t_number_orders_in_queue', ['number' => $gig->total_orders_in_queue()]) }}

                                @endif

                            </div>


                            <span class="h-4 w-px bg-gray-200 dark:bg-zinc-700 hidden md:!inline"
                                  aria-hidden="true"></span>


                            {{-- Expected delivery date --}}

                            <p class="text-sm text-gray-500 dark:text-gray-400">

                                @switch($gig->delivery_time)

                                    @case(1)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_1_day')]) !!}

                                        @break

                                    @case(2)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_2_days')]) !!}

                                        @break

                                    @case(3)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_3_days')]) !!}

                                        @break

                                    @case(4)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_4_days')]) !!}

                                        @break

                                    @case(5)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_5_days')]) !!}

                                        @break

                                    @case(6)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_6_days')]) !!}

                                        @break

                                    @case(7)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_1_week')]) !!}

                                        @break

                                    @case(14)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_2_weeks')]) !!}

                                        @break

                                    @case(21)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_3_weeks')]) !!}

                                        @break

                                    @case(30)

                                        {!! __('messages.t_expected_delivery_date_time', ['date' => __('messages.t_1_month')]) !!}

                                        @break

                                    @default

                                @endswitch

                            </p>


                        </div>


                    </div>


                    {{-- Rating  --}}

                    <div class="flex items-center">

                        <div class="flex items-center" wire:ignore>

                            <div class="-mt-1">

                                {!! render_star_rating($gig->rating, "1rem", "1rem", "#d0d0d0") !!}

                            </div>

                            @if ($gig->rating == 0)

                                <div class="text-[13px] font-black  text-gray-500 ltr:ml-2 rtl:mr-2">{{ __('messages.t_n_a') }}</div>

                            @else

                                <div class="text-[13px] font-black  text-amber-500 ltr:ml-2 rtl:mr-2">{{ $gig->rating }}</div>

                            @endif

                            <div class="text-[13px] text-gray-400 font-normal ltr:ml-2 rtl:mr-2">
                                ( {{ __('messages.t_number_reviews', ['number' => $gig->counter_reviews]) }} )
                            </div>

                        </div>

                    </div>


                </div>


                {{-- Upgrades --}}

                @if ($gig->upgrades()->count())

                    <div class="mt-6">

                        @foreach ($gig->upgrades as $key => $upgrade)

                            <label class="relative block py-4 cursor-pointer sm:flex sm:justify-between focus:outline-none bg-transparent"
                                   wire:key="add-to-cart-upgrades-{{ $key }}">

                                <div class="flex items-center">

                                    <input type="checkbox" value="{{ $upgrade->uid }}" wire:model.defer="upgrades"
                                           class="w-4 h-4 text-primary-600 bg-transparent cursor-pointer rounded-sm ltr:mr-4 rtl:ml-4 border-2 border-gray-300 focus:ring-primary-600">

                                    <div class="text-sm">

                                        <p id="server-size-0-label"
                                           class="font-medium text-gray-600 dark:text-gray-300 text-sm">{{ $upgrade->title }}</p>

                                        <div class="text-gray-400">

                                            @if ($upgrade->extra_days)

                                                <p class="sm:inline text-xs">{{ __('messages.t_delivery_time_will_be_increased_by_extra', ['time' => delivery_time_trans($upgrade->extra_days)]) }}</p>

                                            @else

                                                <p class="sm:inline text-xs">{{ __('messages.t_no_changes_delivery_time') }}</p>

                                            @endif

                                        </div>

                                    </div>

                                </div>

                                <div class="mt-2 flex text-sm sm:mt-0 ltr:sm:ml-4 rtl:sm:mr-4 sm:text-right items-center justify-center">

                                    <div class="font-bold text-xs text-black dark:text-gray-200"><span
                                                class="pr-1 font-normal text-gray-500">+</span>{{ money($upgrade->price, settings('currency')->code, true) }}
                                    </div>

                                </div>

                                <div class="absolute -inset-px rounded-lg pointer-events-none" aria-hidden="true"></div>

                            </label>

                        @endforeach

                    </div>

                @endif



                {{-- Actions --}}

                <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">


                    {{-- Add to cart --}}

                    <button

                            wire:click="addToCart"

                            wire:loading.class="bg-gray-200 hover:bg-gray-300 text-gray cursor-not-allowed"

                            wire:loading.class.remove="bg-primary-600 hover:bg-primary-700 text-white cursor-pointer"

                            wire:loading.attr="disabled"

                            class="w-full text-[13px] font-medium flex justify-center bg-primary-600 hover:bg-primary-700 text-white py-4 px-8 rounded tracking-wide focus:outline-none focus:shadow-outline cursor-pointer"

                    >


                        {{-- Loading indicator --}}

                        <div wire:loading wire:target="addToCart">

                            <svg role="status" class="inline w-4 h-4 text-gray-700 animate-spin" viewBox="0 0 100 101"
                                 fill="none" xmlns="http://www.w3.org/2000/svg">

                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                      fill="#E5E7EB"/>

                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                      fill="currentColor"/>

                            </svg>

                        </div>


                        {{-- Button text --}}

                        <div wire:loading.remove wire:target="addToCart">

                            {{ __('messages.t_add_to_cart') }}

                        </div>

                    </button>


                    {{-- Contact seller --}}

                    <a href="{{ url('messages/new', $gig->owner->username) }}" target="_blank"
                       class="w-full bg-gray-100 border border-transparent rounded-md py-4 px-8 flex items-center justify-center text-[13px] font-medium text-gray-600 hover:bg-gray-200 focus:outline-none dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-300 dark:hover:text-zinc-200">{{ __('messages.t_contact_seller') }}</a>


                </div>


                {{-- Documents --}}

                @if ($gig->documents()->count())

                    <!-- This section is hidden from search engines -->
                    <div class="border-t border-gray-200 dark:border-zinc-700 mt-10 pt-10" data-nosnippet>
                        <meta name="robots" content="noindex, nofollow, nosnippet">

                        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-300">{{ __('messages.t_documents') }}</h3>

                        <div class="mt-4 text-gray-500">

                            <ul role="list">

                                @foreach ($gig->documents as $document)

                                    <li class="py-2 flex items-center justify-between text-sm">

                                        <div class="w-0 flex-1 flex items-center">

                                            <svg class="flex-shrink-0 h-5 w-5 text-gray-400"
                                                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                                 fill="currentColor" aria-hidden="true">
                                                <path fill-rule="evenodd"
                                                      d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                                      clip-rule="evenodd"/>
                                            </svg>

                                            <span class="ltr:ml-2 rtl:mr-2 flex-1 w-0 truncate"> {{ $document->name }} </span>

                                        </div>

                                        <div class="ltr:ml-4 rtl:mr-4 flex-shrink-0">

                                            <a href="{{ url('uploads/documents', $document->uid) }}" target="_blank"
                                               class="font-medium text-blue-600 hover:text-blue-500 text-xs hover:underline"> {{ __('messages.t_download') }} </a>

                                        </div>

                                    </li>

                                @endforeach

                            </ul>

                        </div>

                    </div>

                @endif



                {{-- Share && Report && Add to favorite --}}

                <div class="border-t border-gray-200 dark:border-zinc-700 mt-10 pt-10">

                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-300">{{ __('messages.t_actions') }}</h3>

                    <div class="mt-4 text-gray-500">

                        <ul role="list" class="flex items-center space-x-6 mt-4 rtl:space-x-reverse">


                            {{-- Share --}}

                            <div class="flex items-center group cursor-pointer" id="modals-share-btn">

                                <div class="w-6 h-6 bg-white dark:bg-zinc-700 border drop-shadow-sm border-gray-100 dark:border-zinc-700 rounded-full md:ltr:mr-2 md:rtl:ml-2 flex items-center justify-center group-hover:bg-gray-800 dark:group-hover:bg-zinc-600 group-hover:border-transparent">

                                    <svg class="w-3 h-3 text-gray-600 dark:text-gray-200 dark:group-hover:text-gray-100 group-hover:text-gray-50"
                                         stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
                                    </svg>

                                </div>

                                <span class="text-sm font-medium text-gray-600 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-200 hidden md:block">{{ __('messages.t_share') }}</span>

                            </div>


                            {{-- Flag --}}

                            @auth

                                @if (auth()->id() === $gig->user_id)

                                    <div class="flex items-center group cursor-pointer" @click="youCantReport">

                                        @else

                                            <div class="flex items-center group cursor-pointer" id="modals-report-btn">

                                                @endif

                                                @endauth



                                                @guest

                                                    <div class="flex items-center group cursor-pointer"
                                                         @click="loginToReport">

                                                        @endguest

                                                        <div class="w-6 h-6 bg-white dark:bg-zinc-700 border drop-shadow-sm border-gray-100 dark:border-zinc-700 rounded-full md:ltr:mr-2 md:rtl:ml-2 flex items-center justify-center dark:group-hover:bg-zinc-600 group-hover:bg-red-500 group-hover:border-transparent">

                                                            <svg class="w-3.5 h-3.5 text-gray-600 dark:text-gray-200 dark:group-hover:text-gray-100 group-hover:text-gray-50"
                                                                 stroke="currentColor" fill="currentColor"
                                                                 stroke-width="0" viewBox="0 0 20 20"
                                                                 xmlns="http://www.w3.org/2000/svg">
                                                                <path fill-rule="evenodd"
                                                                      d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                                                                      clip-rule="evenodd"></path>
                                                            </svg>

                                                        </div>

                                                        <span class="text-sm font-medium text-gray-600 dark:text-gray-300 dark:group-hover:text-gray-200 group-hover:text-red-600 hidden md:block">{{ __('messages.t_report') }}</span>

                                                    </div>



                                                    {{-- Add to favorite --}}

                                                    @auth

                                                        @if (auth()->id() !== $gig->user_id)



                                                            {{-- In favorite --}}

                                                            @if ($inFavorite)

                                                                <div class="flex items-center group cursor-pointer"
                                                                     wire:click="removeFromFavorite">

                                                                    <div class="w-6 h-6 border drop-shadow-sm rounded-full md:ltr:mr-2 md:rtl:ml-2 flex items-center justify-center bg-primary-600 border-transparent">


                                                                        {{-- Loading indicator --}}

                                                                        <div wire:loading
                                                                             wire:target="removeFromFavorite">

                                                                            <svg role="status"
                                                                                 class="inline w-3 h-3 animate-spin text-white"
                                                                                 viewBox="0 0 100 101" fill="none"
                                                                                 xmlns="http://www.w3.org/2000/svg">

                                                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                                                      fill="#E5E7EB"/>

                                                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                                                      fill="currentColor"/>

                                                                            </svg>

                                                                        </div>


                                                                        {{-- Icon --}}

                                                                        <svg wire:loading.remove
                                                                             wire:target="removeFromFavorite"
                                                                             class="w-3.5 h-3.5 text-white"
                                                                             stroke="currentColor" fill="currentColor"
                                                                             stroke-width="0" viewBox="0 0 20 20"
                                                                             height="1em" width="1em"
                                                                             xmlns="http://www.w3.org/2000/svg">
                                                                            <path fill-rule="evenodd"
                                                                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                                  clip-rule="evenodd"></path>
                                                                        </svg>


                                                                    </div>

                                                                    <span class="text-sm font-medium text-primary-600 hidden md:block">{{ __('messages.t_remove_from_favorite') }}</span>

                                                                </div>

                                                            @else

                                                                <div class="flex items-center group cursor-pointer"
                                                                     wire:click="addToFavorite">

                                                                    <div class="w-6 h-6 bg-white dark:bg-zinc-700 border drop-shadow-sm border-gray-100 dark:border-zinc-700 rounded-full md:ltr:mr-2 md:rtl:ml-2 flex items-center justify-center group-hover:bg-primary-600 group-hover:border-transparent dark:group-hover:bg-zinc-600">


                                                                        {{-- Loading indicator --}}

                                                                        <div wire:loading wire:target="addToFavorite">

                                                                            <svg role="status"
                                                                                 class="inline w-3 h-3 text-gray-600 dark:text-gray-200 dark:group-hover:text-gray-100 animate-spin group-hover:text-white"
                                                                                 viewBox="0 0 100 101" fill="none"
                                                                                 xmlns="http://www.w3.org/2000/svg">

                                                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                                                                      fill="#E5E7EB"/>

                                                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                                                                      fill="currentColor"/>

                                                                            </svg>

                                                                        </div>


                                                                        {{-- Icon --}}

                                                                        <svg wire:loading.remove
                                                                             wire:target="addToFavorite"
                                                                             class="w-3.5 h-3.5 text-gray-600 dark:text-gray-200 dark:group-hover:text-gray-100 group-hover:text-gray-50"
                                                                             stroke="currentColor" fill="currentColor"
                                                                             stroke-width="0" viewBox="0 0 20 20"
                                                                             height="1em" width="1em"
                                                                             xmlns="http://www.w3.org/2000/svg">
                                                                            <path fill-rule="evenodd"
                                                                                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                                                                  clip-rule="evenodd"></path>
                                                                        </svg>


                                                                    </div>

                                                                    <span class="text-sm font-medium text-gray-600 dark:text-gray-300 dark:group-hover:text-gray-200 group-hover:text-primary-600 hidden md:block">{{ __('messages.t_add_to_favorite') }}</span>

                                                                </div>

                                @endif

                            @endif

                            @endauth


                        </ul>

                    </div>

                </div>


            </div>


            {{-- Tabs --}}

            <div class="w-full max-w-2xl mx-auto mt-16 lg:max-w-none lg:mt-0 lg:col-span-4">

                <div x-data="Components.tabs()" @tab-click.window="onTabClick" @tab-keydown.window="onTabKeydown">


                    {{-- Tabs menu --}}

                    <div class="border-b border-gray-200 dark:border-zinc-700">

                        <div class="-mb-px flex space-x-8 rtl:space-x-reverse" aria-orientation="horizontal"
                             role="tablist">


                            {{-- Description --}}

                            <button id="tab-reviews"
                                    class="whitespace-nowrap py-6 border-b-2 font-medium text-sm border-primary-600 text-primary-600 focus:outline-none"
                                    x-state:on="Selected" x-state:off="Not Selected"
                                    :class="{ 'border-primary-600 text-primary-600': selected, 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-zinc-600': !(selected) }"
                                    x-data="Components.tab(0)" aria-controls="tab-panel-reviews" role="tab"
                                    x-init="init()" @click="onClick" @keydown="onKeydown"
                                    @tab-select.window="onTabSelect" :tabindex="selected ? 0 : -1"
                                    :aria-selected="selected ? 'true' : 'false'" type="button" tabindex="0"
                                    aria-selected="true">

                                {{ __('messages.t_description') }}

                            </button>


                            {{-- FAQ --}}

                            {{--                            <button id="tab-faq" class="focus:outline-none border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-zinc-600 whitespace-nowrap py-6 border-b-2 font-medium text-sm" :class="{ 'border-primary-600 text-primary-600': selected, 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-zinc-600': !(selected) }" x-data="Components.tab(0)" aria-controls="tab-panel-faq" role="tab" x-init="init()" @click="onClick" @keydown="onKeydown" @tab-select.window="onTabSelect" :tabindex="selected ? 0 : -1" :aria-selected="selected ? 'true' : 'false'" type="button" tabindex="-1" aria-selected="false">--}}

                            {{--                                {{ __('messages.t_faq') }}--}}

                            {{--                            </button>--}}



                            {{-- Reviews --}}

                            <button id="tab-license"
                                    class="focus:outline-none border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-zinc-600 whitespace-nowrap py-6 border-b-2 font-medium text-sm"
                                    :class="{ 'border-primary-600 text-primary-600': selected, 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-zinc-600': !(selected) }"
                                    x-data="Components.tab(0)" aria-controls="tab-panel-license" role="tab"
                                    x-init="init()" @click="onClick" @keydown="onKeydown"
                                    @tab-select.window="onTabSelect" :tabindex="selected ? 0 : -1"
                                    :aria-selected="selected ? 'true' : 'false'" type="button" tabindex="-1"
                                    aria-selected="false">

                                {{ __('messages.t_reviews') }}

                            </button>


                        </div>

                    </div>


                    {{-- Description tab --}}

                    <div id="tab-panel-reviews" class="-mb-10" x-data="Components.tabPanel(0)"
                         aria-labelledby="tab-reviews" x-init="init()" x-show="selected"
                         @tab-select.window="onTabSelect" role="tabpanel" tabindex="0">


                        {{-- Description --}}

                        <div class="pt-6 dark:text-zinc-200 quill-container text-base" style="word-break: break-word;">

                            {!! $gig->description !!}

                        </div>


                        {{-- Tags --}}

                        <div class="py-6">

                            @foreach ($gig->tags as $tag)

                                @if ($tag)

                                    <a href="{{ url('search?q=' . $tag->name) }}"
                                       class="mb-3 text-xs font-semibold inline-block py-2 px-4 rounded text-slate-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 dark:hover:bg-zinc-600 hover:bg-gray-200 last:mr-0 ltr:mr-1 rtl:ml-1">

                                        {{ $tag->name }}

                                    </a>

                                @endif

                            @endforeach

                        </div>


                    </div>


                    {{-- FAQ --}}

                    {{--                    <div id="tab-panel-faq" class="text-sm text-gray-500" x-data="Components.tabPanel(0)"--}}
                    {{--                         aria-labelledby="tab-faq" x-init="init()" x-show="selected" @tab-select.window="onTabSelect"--}}
                    {{--                         role="tabpanel" tabindex="0" style="display: none;">--}}

                    {{--                        <div class="pt-6">--}}

                    {{--                            @foreach ($gig->faqs as $faq)--}}

                    {{--                                <details class="rounded-lg group relative mb-3 last:mb-0 bg-gray-50 dark:bg-zinc-700">--}}

                    {{--                                    <summary--}}
                    {{--                                            class="flex items-center justify-between cursor-pointer focus:outline-none">--}}


                    {{--                                        --}}{{-- Question --}}

                    {{--                                        <h5 class="text-sm font-medium text-gray-900 dark:text-gray-300 focus:outline-none flex items-center px-6 py-4">--}}

                    {{--                                            {{ $faq->question }}--}}

                    {{--                                        </h5>--}}


                    {{--                                        <span class="relative flex-shrink-0 ltr:ml-1.5 rtl:mr-1.5 w-5 h-5 ltr:mr-6 rtl:ml-6">--}}

                    {{--                                            <svg xmlns="http://www.w3.org/2000/svg"--}}
                    {{--                                                 class="absolute inset-0 w-5 h-5 opacity-100 group-open:opacity-0"--}}
                    {{--                                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path--}}
                    {{--                                                        stroke-linecap="round" stroke-linejoin="round"--}}
                    {{--                                                        d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/> </svg>--}}



                    {{--                                            <svg xmlns="http://www.w3.org/2000/svg"--}}
                    {{--                                                 class="absolute inset-0 w-5 h-5 opacity-0 group-open:opacity-100"--}}
                    {{--                                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path--}}
                    {{--                                                        stroke-linecap="round" stroke-linejoin="round"--}}
                    {{--                                                        d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/> </svg>--}}

                    {{--                                        </span>--}}

                    {{--                                    </summary>--}}


                    {{--                                    <p class="mt-4 leading-relaxed text-gray-600 dark:text-gray-200 text-sm px-6 pb-4">--}}

                    {{--                                        {{ $faq->answer }}--}}

                    {{--                                    </p>--}}

                    {{--                                </details>--}}

                    {{--                            @endforeach--}}

                    {{--                        </div>--}}

                    {{--                    </div>--}}


                    {{-- Reviews --}}

                    <div id="tab-panel-license" class="pt-10" x-data="Components.tabPanel(0)"
                         aria-labelledby="tab-license" x-init="init()" x-show="selected"
                         @tab-select.window="onTabSelect" role="tabpanel" tabindex="0" style="display: none;">


                        {{-- Has reviews --}}

                        @if ($gig->counter_reviews)

                            <div class="flow-root pt-6">

                                <div class="-my-6 divide-y divide-gray-100 dark:divide-zinc-700">


                                    @foreach ($gig->reviews()->orderByRaw('RAND()')->take(10)->get() as $review)

                                        <div class="py-6">

                                            <div class="flex items-center">

                                                <a href="{{ url('profile', $review->user->username) }}" target="_blank">

                                                    <img src="{{ placeholder_img() }}"
                                                         data-src="{{ src($review->user->avatar) }}"
                                                         alt="{{ $review->user->username }}"
                                                         class="lazy h-8 w-8 rounded-full">

                                                </a>

                                                <div class="ltr:ml-4 rtl:mr-4 group">

                                                    <a href="{{ url('profile', $review->user->username) }}"
                                                       target="_blank"
                                                       class="text-sm font-bold text-gray-900 dark:text-gray-200 flex items-center group-hover:text-primary-600">

                                                        {{ $review->user->username }}

                                                        @if ($review->user->status === 'verified')

                                                            <img data-tooltip-target="account-verified-badge-{{ $review->uid }}"
                                                                 class="ltr:ml-0.5 rtl:mr-0.5 h-4 w-4 -mt-0.5"
                                                                 src="{{ url('img/auth/verified-badge.svg') }}"
                                                                 alt="{{ __('messages.t_account_verified') }}">

                                                            <div id="account-verified-badge-{{ $review->uid }}"
                                                                 role="tooltip"
                                                                 class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">

                                                                {{ __('messages.t_account_verified') }}

                                                            </div>

                                                        @endif



                                                        {{-- Country --}}

                                                        @if ($review->user->country)

                                                            <div class="ltr:ml-2 rtl:mr-2">

                                                                <img src="{{ placeholder_img() }}"
                                                                     data-src="{{ countryFlag($review->user->country?->code) }}"
                                                                     alt="{{ $review->user->country?->name }}"
                                                                     class="lazy h-4 -mt-px rounded-sm">

                                                            </div>

                                                        @endif


                                                    </a>

                                                    <div class="mt-1 flex items-start">

                                                        {!! render_star_rating($review->rating, "0.85rem", "0.85rem", "#d0d0d0") !!}

                                                        <span class="ltr:ml-2 rtl:mr-2 text-[11px] font-normal text-gray-400"><span
                                                                    class="ltr:pr-2 rtl:pl-2 text-gray-300">•</span> {{ format_date($review->created_at, 'ago') }}</span>

                                                    </div>

                                                </div>

                                            </div>


                                            {{-- Message --}}

                                            @if ($review->message)

                                                <div class="mt-4 space-y-6 text-sm italic text-gray-600 dark:text-gray-400">

                                                    <p>{{ $review->message }}</p>

                                                </div>

                                            @endif


                                        </div>

                                    @endforeach


                                </div>

                            </div>

                        @else

                            <div class="text-center block text-sm font-normal text-gray-500 dark:text-gray-300">{{ __('messages.t_no_data_to_show_now') }}</div>

                        @endif

                    </div>

                </div>

            </div>


        </div>


    </div>


    {{-- Related gigs --}}

    @if ($related_gigs)

        <div class="mt-12 sm:mt-24" wire:ignore>


            {{-- Section title --}}

            <div class="flex justify-between mb-6">


                <div class="ltr:border-l-8 rtl:border-r-8 border-primary-600 ltr:pl-4 rtl:pr-4">

                    <span class="font-extrabold text-base text-gray-900 dark:text-gray-100 pb-1 tracking-wide block">{{ __('messages.t_you_may_also_like') }}</span>

                    <p class="text-sm text-gray-500 dark:text-gray-300">{{ __('messages.t_u_may_also_like_the_following_gigs') }}</p>

                </div>


                <div class="hidden md:block">


                    {{-- Direction --}}

                    @if (config()->get('direction') === 'ltr')

                        {{-- Prev Btn --}}

                        <button id="related-gigs-prev-btn"
                                class="h-8 w-8 rounded-tl-md rounded-bl-md bg-primary-600 hover:bg-primary-600 text-white">

                            <svg class="h-4.5 w-4.5 inline-block" stroke="currentColor" fill="currentColor"
                                 stroke-width="0" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd"
                                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                      clip-rule="evenodd"></path>
                            </svg>

                        </button>



                        {{-- Next Btn --}}

                        <button id="related-gigs-next-btn"
                                class="h-8 w-8 rounded-tr-md rounded-br-md bg-primary-600 hover:bg-primary-600 text-white">

                            <svg class="h-4.5 w-4.5 inline-block" stroke="currentColor" fill="currentColor"
                                 stroke-width="0" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd"
                                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                      clip-rule="evenodd"></path>
                            </svg>

                        </button>

                    @else

                        {{-- Prev Btn --}}

                        <button id="related-gigs-prev-btn"
                                class="h-8 w-8 rounded-tr-md rounded-br-md bg-primary-600 hover:bg-primary-600 text-white">

                            <svg class="h-4.5 w-4.5 inline-block" stroke="currentColor" fill="currentColor"
                                 stroke-width="0" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd"
                                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                      clip-rule="evenodd"></path>
                            </svg>

                        </button>



                        {{-- Next Btn --}}

                        <button id="related-gigs-next-btn"
                                class="h-8 w-8 rounded-tl-md rounded-bl-md bg-primary-600 hover:bg-primary-600 text-white">

                            <svg class="h-4.5 w-4.5 inline-block" stroke="currentColor" fill="currentColor"
                                 stroke-width="0" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd"
                                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                      clip-rule="evenodd"></path>
                            </svg>

                        </button>

                    @endif


                </div>


            </div>


            {{-- List of gigs --}}

            <div id="slick-related-gigs" class="-mx-3" wire:ignore>

                @foreach ($related_gigs as $gig)

                    {{-- Gig item --}}

                    <div class="mx-3">

                        @livewire('main.cards.gig', ['gig' => $gig], key("related-gigs-item-" . $gig->uid))

                    </div>

                @endforeach

            </div>


        </div>

    @endif



    {{-- Modals (Report gig) --}}

    @auth

        @if (auth()->id() !== $gig->user_id)

            <x-forms.modal id="modals-report-container" target="modals-report-btn" uid="modal_{{ uid() }}"
                           placement="center-center" size="max-w-md">


                {{-- Header --}}

                <x-slot name="title">{{ __('messages.t_report_this_gig') }}</x-slot>


                {{-- Content --}}

                <x-slot name="content">

                    <div class="grid grid-cols-12 md:gap-x-6 gap-y-6">


                        {{-- Reason --}}

                        <div class="col-span-12">

                            <x-forms.textarea

                                    :label="__('messages.t_reason')"

                                    :placeholder="__('messages.t_let_us_know_why_u_report_this_gig')"

                                    model="reason"

                                    icon="folder-question"

                                    maxlength="500"/>

                        </div>


                    </div>

                </x-slot>


                {{-- Footer --}}

                <x-slot name="footer">

                    <x-forms.button action="report" text="{{ __('messages.t_report') }}"/>

                </x-slot>


            </x-forms.modal>

        @endif

    @endauth



    {{-- Modals (Share gig) --}}

    <x-forms.modal id="modals-share-container" target="modals-share-btn" uid="modal_{{ uid() }}"
                   placement="center-center" size="max-w-2xl">


        {{-- Header --}}

        <x-slot name="title">{{ __('messages.t_share_this_gig') }}</x-slot>


        {{-- Content --}}

        <x-slot name="content">

            <div class="items-center justify-center md:flex md:space-y-0 space-y-4">


                {{-- Facebook --}}

                <div class="grid items-center justify-center mx-4">

                    <a href="https://www.facebook.com/share.php?u={{ url('service', $gig->slug) }}&t={{ $gig->title }}"
                       target="_blank"
                       class="inline-flex justify-center items-center h-12 w-12 border border-transparent rounded-full bg-[#3b5998] focus:outline-none focus:ring-0 mx-auto">

                        <svg class="h-5 w-5 fill-white" version="1.1" viewBox="0 0 512 512" width="100%"
                             xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/"
                             xmlns:xlink="http://www.w3.org/1999/xlink"><path
                                    d="M374.244,285.825l14.105,-91.961l-88.233,0l0,-59.677c0,-25.159 12.325,-49.682 51.845,-49.682l40.116,0l0,-78.291c0,0 -36.407,-6.214 -71.213,-6.214c-72.67,0 -120.165,44.042 -120.165,123.775l0,70.089l-80.777,0l0,91.961l80.777,0l0,222.31c16.197,2.541 32.798,3.865 49.709,3.865c16.911,0 33.511,-1.324 49.708,-3.865l0,-222.31l74.128,0Z"/></svg>

                    </a>

                    <span class="uppercase font-normal text-xs text-gray-500 mt-4 tracking-widest">{{ __('messages.t_facebook') }}</span>

                </div>


                {{-- Twitter --}}

                <div class="grid items-center justify-center mx-4">

                    <a
                        href="https://x.com/intent/tweet?text={{ $gig->title }}%20-%20{{ url('service', $gig->slug) }}%20"
                        target="_blank"
                        rel="noopener"
                        aria-label="Share on X (formerly Twitter)"
                        class="inline-flex justify-center items-center h-12 w-12 border border-transparent rounded-full bg-black focus:outline-none focus:ring-0 mx-auto"
                    >

                        <svg class="h-5 w-5" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" fill="white"/>
                        </svg>
                    </a>

                    <span class="uppercase font-normal text-xs text-gray-500 mt-4 tracking-widest">{{ __('messages.t_twitter') }}</span>

                </div>


                {{-- Linkedin --}}

                <div class="grid items-center justify-center mx-4">

                    <a href="https://www.linkedin.com/shareArticle?mini=true&url={{ url('service', $gig->slug) }}&title={{ $gig->title }}&summary={{ $gig->title }}"
                       target="_blank"
                       class="inline-flex justify-center items-center h-12 w-12 border border-transparent rounded-full bg-[#0a66c2] focus:outline-none focus:ring-0 mx-auto">

                        <svg class="h-5 w-5 fill-white" version="1.1" viewBox="0 0 512 512" width="100%"
                             xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/"
                             xmlns:xlink="http://www.w3.org/1999/xlink"><path
                                    d="M473.305,-1.353c20.88,0 37.885,16.533 37.885,36.926l0,438.251c0,20.393 -17.005,36.954 -37.885,36.954l-436.459,0c-20.839,0 -37.773,-16.561 -37.773,-36.954l0,-438.251c0,-20.393 16.934,-36.926 37.773,-36.926l436.459,0Zm-37.829,436.389l0,-134.034c0,-65.822 -14.212,-116.427 -91.12,-116.427c-36.955,0 -61.739,20.263 -71.867,39.476l-1.04,0l0,-33.411l-72.811,0l0,244.396l75.866,0l0,-120.878c0,-31.883 6.031,-62.773 45.554,-62.773c38.981,0 39.468,36.461 39.468,64.802l0,118.849l75.95,0Zm-284.489,-244.396l-76.034,0l0,244.396l76.034,0l0,-244.396Zm-37.997,-121.489c-24.395,0 -44.066,19.735 -44.066,44.047c0,24.318 19.671,44.052 44.066,44.052c24.299,0 44.026,-19.734 44.026,-44.052c0,-24.312 -19.727,-44.047 -44.026,-44.047Z"
                                    style="fill-rule:nonzero;"/></svg>

                    </a>

                    <span class="uppercase font-normal text-xs text-gray-500 mt-4 tracking-widest">{{ __('messages.t_linkedin') }}</span>

                </div>


                {{-- Whatsapp --}}

                <div class="grid items-center justify-center mx-4">

                    <a href="https://api.whatsapp.com/send?text={{ $gig->title }}%20{{ url('service', $gig->slug) }}"
                       target="_blank"
                       class="inline-flex justify-center items-center h-12 w-12 border border-transparent rounded-full bg-[#25d366] focus:outline-none focus:ring-0 mx-auto">

                        <svg class="h-5 w-5 fill-white" version="1.1" viewBox="0 0 512 512" width="100%"
                             xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/"
                             xmlns:xlink="http://www.w3.org/1999/xlink"><path
                                    d="M373.295,307.064c-6.37,-3.188 -37.687,-18.596 -43.526,-20.724c-5.838,-2.126 -10.084,-3.187 -14.331,3.188c-4.246,6.376 -16.454,20.725 -20.17,24.976c-3.715,4.251 -7.431,4.785 -13.8,1.594c-6.37,-3.187 -26.895,-9.913 -51.225,-31.616c-18.935,-16.89 -31.72,-37.749 -35.435,-44.126c-3.716,-6.377 -0.397,-9.824 2.792,-13c2.867,-2.854 6.371,-7.44 9.555,-11.16c3.186,-3.718 4.247,-6.377 6.37,-10.626c2.123,-4.252 1.062,-7.971 -0.532,-11.159c-1.591,-3.188 -14.33,-34.542 -19.638,-47.298c-5.171,-12.419 -10.422,-10.737 -14.332,-10.934c-3.711,-0.184 -7.963,-0.223 -12.208,-0.223c-4.246,0 -11.148,1.594 -16.987,7.969c-5.838,6.377 -22.293,21.789 -22.293,53.14c0,31.355 22.824,61.642 26.009,65.894c3.185,4.252 44.916,68.59 108.816,96.181c15.196,6.564 27.062,10.483 36.312,13.418c15.259,4.849 29.145,4.165 40.121,2.524c12.238,-1.827 37.686,-15.408 42.995,-30.286c5.307,-14.882 5.307,-27.635 3.715,-30.292c-1.592,-2.657 -5.838,-4.251 -12.208,-7.44m-116.224,158.693l-0.086,0c-38.022,-0.015 -75.313,-10.23 -107.845,-29.535l-7.738,-4.592l-80.194,21.037l21.405,-78.19l-5.037,-8.017c-21.211,-33.735 -32.414,-72.726 -32.397,-112.763c0.047,-116.825 95.1,-211.87 211.976,-211.87c56.595,0.019 109.795,22.088 149.801,62.139c40.005,40.05 62.023,93.286 62.001,149.902c-0.048,116.834 -95.1,211.889 -211.886,211.889m180.332,-392.224c-48.131,-48.186 -112.138,-74.735 -180.335,-74.763c-140.514,0 -254.875,114.354 -254.932,254.911c-0.018,44.932 11.72,88.786 34.03,127.448l-36.166,132.102l135.141,-35.45c37.236,20.31 79.159,31.015 121.826,31.029l0.105,0c140.499,0 254.87,-114.366 254.928,-254.925c0.026,-68.117 -26.467,-132.166 -74.597,-180.352"
                                    id="WhatsApp-Logo"/></svg>

                    </a>

                    <span class="uppercase font-normal text-xs text-gray-500 mt-4 tracking-widest">{{ __('messages.t_whatsapp') }}</span>

                </div>


                {{-- Copy link --}}

                <div class="grid items-center justify-center mx-4">

                    <button type="button" x-on:click="copy"
                            class="inline-flex justify-center items-center h-12 w-12 border border-transparent rounded-full bg-gray-400 focus:outline-none focus:ring-0 mx-auto">

                        <svg class="h-5 w-5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title/>
                            <path d="M17.3,13.35a1,1,0,0,1-.7-.29,1,1,0,0,1,0-1.41l2.12-2.12a2,2,0,0,0,0-2.83L17.3,5.28a2.06,2.06,0,0,0-2.83,0L12.35,7.4A1,1,0,0,1,10.94,6l2.12-2.12a4.1,4.1,0,0,1,5.66,0l1.41,1.41a4,4,0,0,1,0,5.66L18,13.06A1,1,0,0,1,17.3,13.35Z"/>
                            <path d="M8.11,21.3a4,4,0,0,1-2.83-1.17L3.87,18.72a4,4,0,0,1,0-5.66L6,10.94A1,1,0,0,1,7.4,12.35L5.28,14.47a2,2,0,0,0,0,2.83L6.7,18.72a2.06,2.06,0,0,0,2.83,0l2.12-2.12A1,1,0,1,1,13.06,18l-2.12,2.12A4,4,0,0,1,8.11,21.3Z"/>
                            <path d="M8.82,16.18a1,1,0,0,1-.71-.29,1,1,0,0,1,0-1.42l6.37-6.36a1,1,0,0,1,1.41,0,1,1,0,0,1,0,1.42L9.52,15.89A1,1,0,0,1,8.82,16.18Z"/>
                        </svg>

                    </button>

                    <template x-if="!isCopied">

                        <span class="uppercase font-normal text-xs text-gray-500 mt-4 tracking-widest">{{ __('messages.t_copy_link') }}</span>

                    </template>

                    <template x-if="isCopied">

                        <span class="uppercase font-normal text-xs text-green-500 mt-4 tracking-widest">{{ __('messages.t_copied') }}</span>

                    </template>

                </div>


            </div>

        </x-slot>


    </x-forms.modal>


</div>


{{-- Inject Js --}}

@push('scripts')

    {{-- Slick Plugin --}}

    <script defer type="text/javascript" src="{{ asset('js/plugins/slick/slick.min.js') }}"></script>



    {{-- Splide Plugin --}}

    <script defer src="{{ asset('js/plugins/splidejs/js/splide.min.js') }}"></script>

    <script defer src="{{ asset('js/plugins/splidejs/js/splide-extension-video.min.js') }}"></script>



    {{-- Componennts --}}

    <script src="{{ url('js/components.js') }}"></script>



    {{-- AlpineJs --}}

    <script>

        function oZcfXWmBuWfxbIo() {

            return {


                cart: [],

                isCopied: false,


                // Initialize main carousel

                initMainCarousel() {

                    var main = new Splide('#main-carousel', {

                        type: 'loop',

                        cover: false,

                        autoplay: true,

                        pauseOnHover: true,

                        heightRatio: 0.3,

                        height: this.$width < 600 ? 250 : 530,

                        rewind: true,

                        pagination: true,

                        arrows: true,

                        video: {

                            loop: true,

                            mute: false

                        },

                    });


                    var thumbnails = new Splide('#thumbnail-carousel', {

                        fixedWidth: 100,

                        fixedHeight: 60,

                        gap: 10,

                        rewind: true,

                        pagination: false,

                        isNavigation: true,

                        breakpoints: {

                            600: {

                                fixedWidth: 60,

                                fixedHeight: 44,

                            },

                        },

                    });


                    main.sync(thumbnails);

                    main.mount(window.splide.Extensions);

                    thumbnails.mount();

                },


                initRelatedCarousel() {

                    $('#slick-related-gigs').slick({

                        dots: false,

                        infinite: true,

                        speed: 300,

                        slidesToShow: 4,

                        slidesToScroll: 1,

                        prevArrow: $('#related-gigs-prev-btn'),

                        nextArrow: $('#related-gigs-next-btn'),

                        responsive: [

                            {

                                breakpoint: 1024,

                                settings: {

                                    slidesToShow: 3,

                                    slidesToScroll: 3

                                }

                            },

                            {

                                breakpoint: 600,

                                settings: {

                                    slidesToShow: 2,

                                    slidesToScroll: 2

                                }

                            },

                            {

                                breakpoint: 480,

                                settings: {

                                    slidesToShow: 1,

                                    slidesToScroll: 1

                                }

                            }

                        ]

                    });

                },


                // Copy link

                copy() {


                    // Set gig link

                    const url = "{{ url()->current() }}";


                    var _this = this;

                    navigator.clipboard.writeText(url).then(function () {

                        _this.isCopied = true;

                        setTimeout(() => {

                            _this.isCopied = false

                        }, 2000);

                    }, function (err) {

                    });


                },


                // Splide Sliders

                splides() {

                    var splides = document.getElementsByClassName('splide');


                    for (var i = 0, len = splides.length; i < len; i++) {

                        if (splides[i].id !== 'main-carousel' && splides[i].id !== 'thumbnail-carousel') {

                            new Splide(splides[i], {

                                type: 'loop',

                                cover: true,

                                autoplay: false,

                                pauseOnHover: true,

                                heightRatio: 0.3,

                                height: 200,

                                rewind: true,

                                pagination: false,

                                arrows: true,

                                video: {

                                    loop: true,

                                    mute: true

                                },

                            }).mount(window.splide.Extensions);

                        }

                    }

                },


                // Init alpinejs

                initialize() {

                    var _this = this;


                    // Wait until page loaded

                    document.addEventListener('DOMContentLoaded', function () {


                        // Initialize carousel

                        _this.initMainCarousel();


                        // Initialize related gigs carousel

                        _this.initRelatedCarousel();


                        // Splide Plugin

                        _this.splides();


                    });

                },


                youCantReport() {

                    window.$wireui.notify({

                        title: "{{ __('messages.t_info') }}",

                        description: "{{ __('messages.t_u_cant_report_this_gig') }}",

                        icon: 'info'

                    });

                },


                loginToReport() {

                    window.$wireui.notify({

                        title: "{{ __('messages.t_info') }}",

                        description: "{{ __('messages.t_pls_login_or_register_to_report_this_gig') }}",

                        icon: 'info'

                    });

                },


                scrollToReviews() {

                    document.querySelector('#reviews-container').scrollIntoView({

                        behavior: 'smooth'

                    });

                }


            }

        }

        window.oZcfXWmBuWfxbIo = oZcfXWmBuWfxbIo();

    </script>

@endpush



{{-- Inject css --}}

@push('styles')

    {{-- Splide Plugin --}}

    <link rel="stylesheet" href="{{ asset('js/plugins/splidejs/css/splide.min.css') }}">

    <link rel="stylesheet" href="{{ asset('js/plugins/splidejs/css/splide-core.min.css') }}">

    <link rel="stylesheet" href="{{ asset('js/plugins/splidejs/css/themes/splide-default.min.css') }}">

    <link rel="stylesheet" href="{{ asset('js/plugins/splidejs/css/splide-extension-video.min.css') }}">



    {{-- Slick Plugin --}}

    <link rel="stylesheet" type="text/css" href="{{ asset('js/plugins/slick/slick.css') }}"/>

@endpush
