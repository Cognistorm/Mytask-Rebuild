<div class="w-full">
    {{-- Hero section content --}}
    <div class="home-hero-section">

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center gap-20">

            <div class="w-full md:max-w-lg">

                {{-- Hero section title --}}

                <h1 class="text-center sm:ltr:text-left sm:rtl:text-right mt-4 text-xl tracking-tight font-extrabold text-white sm:mt-5 sm:text-3xl lg:mt-6 xl:text-3xl">

                    {{ __('messages.t_find_best') }}
                </h1>

                <div class="mt-8">

                    {{-- Search form --}}

                    <form class="flex items-center mb-4" action="{{ url('search') }}" accept="GET">

                        {{-- Input --}}

                        <div class="relative w-full">

                            <div
                                class="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-3 rtl:pr-3 pointer-events-none">

                                <svg aria-hidden="true" class="w-5 h-5 text-gray-500 dark:text-gray-400"
                                     fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd"
                                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                          clip-rule="evenodd"></path>
                                </svg>

                            </div>

                            <input type="search" name="q"
                                   class="bg-white border-none text-gray-900 text-sm font-medium rounded-md block w-full ltr:pl-10 rtl:pr-10 px-2.5 py-4 focus:outline-none focus:ring-0"
                                   placeholder="{{ __('messages.t_what_service_are_u_looking_for_today') }}" required>

                        </div>

                        {{-- Button --}}

                        <button type="submit"
                                class="px-5 py-4 ltr:ml-2 rtl:mr-2 text-sm font-medium text-white bg-primary-600 rounded-md border-none hover:bg-primary-800 focus:ring-0 focus:outline-none">

                            @lang('messages.t_search')

                        </button>

                    </form>

                    {{-- Popular tags --}}

                    @php

                        $popular_tags = App\Models\Category::whereHas('gigs')
                            ->with('translations')
                            ->withCount('gigs')
                            ->take(5)
                            ->orderBy('gigs_count')
                            ->get();

                    @endphp

                    {{-- Invite and Earn Points Button --}}
                    <div class="mt-6">
                        <a href="{{ auth()->check() ? url('account/referrals') : url('auth/login') }}"
                           class="px-4 flex flex-col w-full h-20 bg-[#2ebff6] dark:text-gray-300 dark:hover:text-white dark:bg-blue-900/20 text-white rounded-lg items-center justify-center transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl group">
                            <div class="flex items-center space-x-3">
                                <svg class="w-6 h-6 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 20 20"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"></path>
                                </svg>
                                <span
                                    class="text-white text-sm md:text-lg font-semibold">{{ __('messages.t_invite_and_earn_points') }}</span>
                            </div>
                        </a>
                    </div>

                </div>

            </div>

            <div class="hidden md:flex justify-center items-center gap-6 flex-wrap">

                <a href="{{ route('main.search') }}"
                   class="flex flex-col gap-2 items-center p-6 bg-white dark:bg-zinc-800 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-32 h-32 justify-center group">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="32" width="32"
                        viewBox="0 0 640 640"
                        class="text-primary-600">
                        <path fill="currentColor"
                              d="M128 160C128 124.7 156.7 96 192 96L512 96C547.3 96 576 124.7 576 160L576 416C576 451.3 547.3 480 512 480L192 480C156.7 480 128 451.3 128 416L128 160zM56 192C69.3 192 80 202.7 80 216L80 512C80 520.8 87.2 528 96 528L456 528C469.3 528 480 538.7 480 552C480 565.3 469.3 576 456 576L96 576C60.7 576 32 547.3 32 512L32 216C32 202.7 42.7 192 56 192zM224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160C206.3 160 192 174.3 192 192C192 209.7 206.3 224 224 224zM420.5 235.5C416.1 228.4 408.4 224 400 224C391.6 224 383.9 228.4 379.5 235.5L323.2 327.6L298.7 297C294.1 291.3 287.3 288 280 288C272.7 288 265.8 291.3 261.3 297L197.3 377C191.5 384.2 190.4 394.1 194.4 402.4C198.4 410.7 206.8 416 216 416L488 416C496.7 416 504.7 411.3 508.9 403.7C513.1 396.1 513 386.9 508.4 379.4L420.4 235.4z"/>
                    </svg>
                    <span
                        class="text-xs font-medium text-gray-600 dark:text-gray-300 text-center">{{ __('messages.t_gigs') }}</span>
                </a>

                <a href="{{ route('explore.projects') }}"
                   class="flex flex-col gap-2 items-center p-6 bg-white dark:bg-zinc-800 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-32 h-32 justify-center group">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32" width="32" viewBox="0 0 640 640" class="text-primary-600">
                        <path fill="currentColor"
                              d="M264 112L376 112C380.4 112 384 115.6 384 120L384 160L256 160L256 120C256 115.6 259.6 112 264 112zM208 120L208 160L128 160C92.7 160 64 188.7 64 224L64 320L576 320L576 224C576 188.7 547.3 160 512 160L432 160L432 120C432 89.1 406.9 64 376 64L264 64C233.1 64 208 89.1 208 120zM576 368L384 368L384 384C384 401.7 369.7 416 352 416L288 416C270.3 416 256 401.7 256 384L256 368L64 368L64 480C64 515.3 92.7 544 128 544L512 544C547.3 544 576 515.3 576 480L576 368z"/>
                    </svg>
                    <span
                        class="text-xs font-medium text-gray-600 dark:text-gray-300 text-center">{{ __('messages.t_projects') }}</span>
                </a>
                @auth
                <a href="{{ route('seller.home') }}"
                   class="flex flex-col items-center p-6 bg-white dark:bg-zinc-800 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-32 h-32 justify-center group">
                    <svg xmlns="http://www.w3.org/2000/svg"

                         class="w-8 h-8 text-primary-600 mb-2"

                         fill="none" viewBox="0 0 24 24" stroke="currentColor"
                         stroke-width="2">

                        <path stroke-linecap="round" stroke-linejoin="round"

                              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>

                    </svg>
                    <span
                        class="text-xs font-medium text-gray-600 dark:text-gray-300 text-center">{{ __('messages.t_seller_dashboard') }}</span>
                </a>

                <a href="{{ route('account.projects') }}"
                   class="flex flex-col items-center p-6 bg-white dark:bg-zinc-800 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-32 h-32 justify-center group">

                    <svg xmlns="http://www.w3.org/2000/svg"

                         class="w-8 h-8 text-primary-600 mb-2"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor"
                         stroke-width="2">

                        <path stroke-linecap="round" stroke-linejoin="round"

                              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>

                    </svg>
                    <span
                        class="text-xs font-medium text-gray-600 dark:text-gray-300 text-center">{{ __('messages.t_buyer_dashboard') }}</span>
                </a>
                @endauth
            </div>

        </div>

    </div>


    {{-- Home content --}}

    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:pb-24">

        <div class="grid grid-cols-12 gap-6">

            {{-- Fatured categories --}}

            @if (settings('appearance')->is_featured_categories && $categories && $categories->count())

                <div class="col-span-12 mt-6 xl:mt-6 mb-16">

                    <span
                        class="font-semibold text-black dark:text-gray-200 uppercase tracking-wider text-center block">{{ __('messages.t_featured_categories') }}</span>

                    <div class="flex-wrap justify-center items-center mt-8 -mx-5 hidden" id="featured-categories-slick"
                         wire:ignore style>

                        @foreach ($categories as $category)

                            <a href="{{ url('categories', $category->slug) }}"
                               class="relative !h-72 rounded-md !p-6 !flex !flex-col overflow-hidden group mx-5">

                            <span aria-hidden="true" class="absolute inset-0">

                                <img src="{{ src($category->image) }}" data-src="{{ src($category->image) }}"
                                     alt="{{ $category->name }}" class="lazy w-full h-full object-center object-cover">

                            </span>

                                <span aria-hidden="true"
                                      class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black opacity-90"></span>

                                <span
                                    class="relative mt-auto text-center text-xl font-bold text-white">{{ $category->name }}</span>

                            </a>

                        @endforeach

                    </div>

                </div>

            @endif

            {{-- Bestsellers --}}

            @if (settings('appearance')->is_best_sellers && $sellers && $sellers->count())

                <div class="col-span-12 mt-6 xl:mt-6 mb-16">

                    <span
                        class="font-semibold text-black dark:text-gray-200 uppercase tracking-wider text-center block">{{ __('messages.t_top_sellers') }}</span>

                    <a href="{{ url('sellers') }}"
                       class="sm:flex justify-end hidden text-sm font-semibold text-primary-600 hover:text-primary-700">

                        {{ __('messages.t_view_more') }}
                        {{-- LTR arrow --}}

                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden ltr:inline"
                             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                  d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>

                        {{-- RTL arrow --}}

                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden rtl:inline"
                             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                  d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
                        </svg>

                    </a>


                    <ul class="flex-wrap justify-center items-center mt-8 -mx-5 hidden" id="top-sellers-slick"
                        wire:ignore>

                        @foreach ($sellers as $seller)

                            <li class="col-span-1 flex flex-col text-center bg-white dark:bg-zinc-800 rounded-md shadow divide-y divide-gray-200 dark:divide-zinc-700 mx-5">

                                <div class="px-4 py-8">

                                    {{-- Avatar --}}

                                    <a href="{{ url('profile', $seller->username) }}" class="inline-block relative">

                                        <img class="h-16 w-16 rounded-full object-cover lazy"
                                             src="{{ src($seller->avatar) }}" data-src="{{ src($seller->avatar) }}"
                                             alt="{{ $seller->username }}">

                                        @if ($seller->isOnline() && !$seller->availability)

                                            <span
                                                class="absolute top-0.5 ltr:right-0.5 rtl:left-0.5 block h-3 w-3 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-green-400"></span>

                                        @elseif ($seller->availability)

                                            <span
                                                class="absolute top-0.5 ltr:right-0.5 rtl:left-0.5 block h-3 w-3 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-gray-400"></span>

                                        @else

                                            <span
                                                class="absolute top-0.5 ltr:right-0.5 rtl:left-0.5 block h-3 w-3 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-red-400"></span>

                                        @endif

                                    </a>

                                    {{-- Username --}}

                                    <a href="{{ url('profile', $seller->username) }}"
                                       class="mt-4 text-gray-900 dark:text-gray-200 text-sm font-bold tracking-wider flex items-center justify-center">

                                        {{ $seller->username }}

                                        @if ($seller->status === 'verified')

                                            <img data-tooltip-target="tooltip-account-verified-{{ $seller->id }}"
                                                 class="ltr:ml-0.5 rtl:mr-0.5 h-4 w-4 -mt-0.5"
                                                 src="{{ url('img/auth/verified-badge.svg') }}"
                                                 alt="{{ __('messages.t_account_verified') }}">

                                            <div id="tooltip-account-verified-{{ $seller->id }}" role="tooltip"
                                                 class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">

                                                {{ __('messages.t_account_verified') }}

                                            </div>

                                        @endif

                                    </a>

                                    <dl class="mt-1 flex-grow flex flex-col justify-between">

                                        <dt class="sr-only">Level</dt>

                                        <dd class="text-[11px] font-medium uppercase tracking-widest"
                                            style="color:{{ $seller->level->level_color }}">{{ $seller->level->title }}</dd>

                                        <dt class="sr-only">Skills</dt>

                                        <dd class="mt-5 space-x-1 rtl:space-x-reverse">

                                            {{-- Rating --}}

                                            <div class="flex items-center justify-center mb-5 flex-wrap" wire:ignore>

                                                {{-- Star --}}

                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400 flex-shrink-0"
                                                     viewBox="0 0 20 20" fill="currentColor">
                                                    <path
                                                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>

                                                {{-- Rating --}}

                                                @if ($seller->rating() == 0)
                                                    <div
                                                        class="text-[13px] tracking-widest text-amber-500 ltr:ml-1 rtl:mr-1 font-black whitespace-nowrap">{{ __('messages.t_n_a') }}</div>

                                                @else
                                                    <div
                                                        class="text-sm tracking-widest text-amber-500 ltr:ml-1 rtl:mr-1 font-black whitespace-nowrap">{{ $seller->rating() }}</div>
                                                @endif
                                                {{-- Reviews --}}

                                                <div
                                                    class="ltr:ml-2 rtl:mr-2 text-[13px] font-normal text-gray-400 dark:text-gray-300 whitespace-nowrap">

                                                    ( {{ number_format($seller->reviews->count()) }} )

                                                </div>
                                            </div>

                                            {{-- Skills --}}

                                            @if ($seller->skills->count())

                                                <div class="h-16">

                                                    @foreach ($seller->skills as $skill)
                                                        <span
                                                            class="inline-flex mb-2 px-3 py-1.5 items-center text-gray-800 text-xs font-medium bg-gray-100 dark:bg-zinc-700 dark:text-zinc-300 rounded-full">
                                                        {{ $skill->name }}
                                                    </span>
                                                    @endforeach

                                                </div>

                                            @else

                                                <div class="h-16"></div>

                                            @endif

                                        </dd>

                                    </dl>

                                </div>

                                {{-- Actions --}}

                                <div>

                                    <div
                                        class="-mt-px flex divide-x divide-gray-200 rtl:divide-x-reverse bg-gray-100 dark:bg-zinc-700 dark:divide-zinc-700 rounded-b-lg">

                                        @auth

                                            {{-- Contact me --}}

                                            <div class="w-0 flex-1 flex">

                                                <a href="{{ url('messages/new', $seller->username) }}"
                                                   class="relative w-0 flex-1 inline-flex items-center justify-center py-4 text-xs text-gray-700 dark:text-zinc-300 dark:hover:text-zinc-100 font-medium border border-transparent rounded-bl-lg hover:text-gray-500">

                                                    <svg class="w-5 h-5 text-gray-400 dark:text-gray-300"
                                                         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                                         fill="currentColor" aria-hidden="true">
                                                        <path
                                                            d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                                        <path
                                                            d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                                                    </svg>

                                                    <span class="ml-2">{{ __('messages.t_contact_me') }}</span>

                                                </a>

                                            </div>

                                        @endauth

                                        @guest

                                            {{-- View my profile --}}

                                            <div class="w-0 flex-1 flex">

                                                <a href="{{ url('profile', $seller->username) }}"
                                                   class="relative w-0 flex-1 inline-flex items-center justify-center py-4 text-xs text-gray-700 dark:text-zinc-300 dark:hover:text-zinc-100 font-medium border border-transparent rounded-br-lg hover:text-gray-500">

                                                    <svg xmlns="http://www.w3.org/2000/svg"
                                                         class="w-5 h-5 text-gray-400 dark:text-gray-300"
                                                         viewBox="0 0 20 20" fill="currentColor">
                                                        <path fill-rule="evenodd"
                                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                                                              clip-rule="evenodd"/>
                                                    </svg>

                                                    <span class="ml-2">{{ __('messages.t_view_profile') }}</span>

                                                </a>

                                            </div>

                                        @endguest

                                    </div>

                                </div>

                            </li>

                        @endforeach

                    </ul>
                </div>

            @endif
            {{-- Random gigs --}}

            {{-- Latest projects --}}

            @if (settings('projects')->is_enabled && !is_null($projects) && !$projects->isEmpty())

                <div class="col-span-12 mb-16">

                    {{-- Section title --}}

                    <div class="block mb-6">

                        <div class="flex justify-between items-center bg-transparent py-2">

                            <div>

                                <span
                                    class="font-extrabold text-xl text-gray-800 dark:text-gray-100 pb-1 block tracking-wider">

                                    @lang('messages.t_projects')

                                </span>

                            </div>

                            <div>

                                <a href="{{ url('explore/projects') }}"
                                   class="hidden text-sm font-semibold text-primary-600 hover:text-primary-700 sm:block">

                                    {{ __('messages.t_view_more') }}
                                    {{-- LTR arrow --}}

                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden ltr:inline"
                                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                                    </svg>

                                    {{-- RTL arrow --}}

                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden rtl:inline"
                                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
                                    </svg>

                                </a>

                            </div>

                        </div>

                    </div>


                    {{-- Projects --}}

                    <div class="space-y-6">

                        <div class="grid grid-cols-12 sm:gap-x-9 gap-y-6">

                            @foreach ($projects as $project)
                                <div class="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3">

                                    @livewire('main.cards.project-v2', [ 'id' => $project->uid ], key('project-card-id-' . $project->uid))

                                </div>
                            @endforeach

                        </div>

                    </div>
                </div>

            @endif

            @if ($gigs && !$gigs->isEmpty())

                <div class="col-span-12 mb-16">

                    {{-- Section title --}}

                    <div class="block mb-6">

                        <div class="flex justify-between items-center bg-transparent py-2">

                            <div>

                                <span class="font-extrabold text-xl text-gray-800 dark:text-gray-100 pb-1 block">

                                    @lang('messages.t_selected_gigs_for_u')

                                </span>

                            </div>
                            <div>
                                <a href="{{ url('search') }}"
                                   class="hidden text-sm font-semibold text-primary-600 hover:text-primary-700 sm:block">

                                    {{ __('messages.t_view_more') }}
                                    {{-- LTR arrow --}}

                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden ltr:inline"
                                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                                    </svg>

                                    {{-- RTL arrow --}}

                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden rtl:inline"
                                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
                                    </svg>

                                </a>

                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-12 sm:gap-x-9 gap-y-6">

                        @foreach ($gigs as $gig)
                            <div class="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3">

                                @livewire('main.cards.gig', ['gig' => $gig], key('gig-item-' . $gig->uid))

                            </div>
                        @endforeach

                    </div>

                </div>

            @endif

            {{-- List of categories in home --}}

            @foreach ($categories as $category)

                @if ($category->gigs->count())

                    {{-- Section title --}}

                    <div class="col-span-12">

                        <div class="flex justify-between items-center bg-transparent py-2">

                            <div>
                                <span
                                    class="font-extrabold text-xl text-gray-800 dark:text-gray-100 pb-1 block tracking-wider">{{ $category->name }}</span>

                            </div>
                            <div>

                                <a href="{{ url('categories', $category->slug) }}"
                                   class="hidden text-sm font-semibold text-primary-600 hover:text-primary-700 sm:block">

                                    {{ __('messages.t_view_more') }}

                                    {{-- LTR arrow --}}

                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden ltr:inline"
                                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                                    </svg>

                                    {{-- RTL arrow --}}

                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden rtl:inline"
                                         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
                                    </svg>

                                </a>

                            </div>
                        </div>

                    </div>

                    {{-- List of gigs --}}

                    <div class="col-span-12 mb-16">

                        <div class="grid grid-cols-12 sm:gap-x-9 gap-y-6">

                            @foreach ($category->gigs as $gig)

                                <div class="col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3">

                                    @livewire('main.cards.gig', ['gig' => $gig], key('gig-item-' . $category->id . '-' . $gig->uid))

                                </div>

                            @endforeach

                        </div>

                    </div>

                @endif

            @endforeach

            {{-- Newsletter --}}

            @if (settings('newsletter')->is_enabled)

                <div class="col-span-12">

                    <div class="bg-gray-100 dark:bg-zinc-800 rounded-md p-6 flex items-center sm:p-10">

                        <div class="max-w-lg mx-auto">

                            <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ __('messages.t_sign_up_for_newsletter') }}</h3>

                            <p class="mt-2 text-sm text-gray-500 dark:text-gray-300">{{__('messages.t_sign_up_for_newsletter_subtitle')}}</p>

                            <div class="mt-4 sm:mt-6 sm:flex">

                                <label for="email-address" class="sr-only">Email address</label>

                                <input wire:model.defer="email" id="email-address" type="text" autocomplete="email"
                                       required="" placeholder="{{ __('messages.t_enter_email_address') }}"
                                       class="h-14 appearance-none min-w-0 w-full bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm py-2 px-4 text-sm text-gray-900 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                                       readonly onfocus="this.removeAttribute('readonly');">

                                <div class="mt-3 sm:flex-shrink-0 sm:mt-0 ltr:sm:ml-4 rtl:sm:mr-4">

                                    <button wire:click="newsletter" wire:loading.attr="disabled"
                                            wire:target="newsletter" type="button"
                                            class="dark:disabled:bg-zinc-500 dark:disabled:text-zinc-400 disabled:cursor-not-allowed disabled:!bg-gray-400 disabled:text-gray-500 h-14 w-full bg-primary-600 border border-transparent rounded-md shadow-sm py-2 px-4 flex items-center justify-center text-sm font-bold tracking-wider text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-primary-600">

                                        {{ __('messages.t_signup') }}

                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            @endif

        </div>

    </div>

</div>


@push('scripts')

    {{-- Slick script --}}

    @if (settings('appearance')->is_featured_categories || settings('appearance')->is_best_sellers)

        <script defer type="text/javascript" src="{{ asset('js/plugins/slick/slick.min.js') }}"></script>

    @endif

    {{-- Slick Plugin --}}

    @if (settings('appearance')->is_featured_categories && $categories && $categories->count())

        <script>

            document.addEventListener("DOMContentLoaded", function () {

                // Init featured categories slick

                $('#featured-categories-slick').slick({

                    dots: false,

                    autoplay: true,

                    infinite: true,

                    speed: 300,

                    slidesToShow: 5,

                    slidesToScroll: 1,

                    arrows: false,

                    responsive: [

                        {

                            breakpoint: 1024,

                            settings: {

                                slidesToShow: 4,

                                slidesToScroll: 1

                            }

                        },

                        {

                            breakpoint: 800,

                            settings: {

                                slidesToShow: 3,

                                slidesToScroll: 1

                            }

                        },

                        {

                            breakpoint: 600,

                            settings: {

                                slidesToShow: 2,

                                slidesToScroll: 1

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

                $('#featured-categories-slick').removeClass('hidden');

            });

        </script>

    @endif



    {{-- Bestsellers --}}

    @if (settings('appearance')->is_best_sellers && $sellers && $sellers->count())

        <script>

            document.addEventListener("DOMContentLoaded", function () {

                // Init featured categories slick

                $('#top-sellers-slick').slick({

                    dots: false,

                    autoplay: true,

                    infinite: true,

                    speed: 300,

                    slidesToShow: 4,

                    slidesToScroll: 1,

                    arrows: false,

                    responsive: [

                        {

                            breakpoint: 1280,

                            settings: {

                                slidesToShow: 4,

                                slidesToScroll: 1

                            }

                        },

                        {

                            breakpoint: 1120,

                            settings: {

                                slidesToShow: 3,

                                slidesToScroll: 1

                            }

                        },

                        {

                            breakpoint: 820,

                            settings: {

                                slidesToShow: 2,

                                slidesToScroll: 1

                            }

                        },

                        {

                            breakpoint: 600,

                            settings: {

                                slidesToShow: 1,

                                slidesToScroll: 1

                            }

                        },



                    ]

                });

                $('#top-sellers-slick').removeClass('hidden');

            });

        </script>

    @endif

@endpush

@push('styles')

    {{-- Slick Plugin --}}

    @if (settings('appearance')->is_featured_categories || settings('appearance')->is_best_sellers)

        <link rel="stylesheet" type="text/css" href="{{ asset('js/plugins/slick/slick.css') }}"/>

    @endif

    {{-- Hero section --}}

    <style>

        .home-hero-section {

            background-color: {{ settings('hero')->bg_color }};

            background-repeat: no-repeat;

            background-position: center center;

            background-size: cover;

            height: {{ settings('hero')->bg_large_height }}px;

        }

        {{-- Check if background image enabled --}}

        @if (settings('hero')->enable_bg_img)

            {{-- Background image for small devices --}}

            @if (settings('hero')->background_small)



                @media only screen and (max-width: 600px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_small) }}');

                height: {{ settings('hero')->bg_small_height }}px;

            }

        }

        @endif

        {{-- Background image for medium devices --}}

        @if (settings('hero')->background_medium)



@media only screen and (min-width: 600px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_medium) }}')

            }

        }

        @endif

        {{-- Background image for large devices --}}

        @if (settings('hero')->background_large)
@media only screen and (min-width: 768px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_large) }}');

            }

        }

        @endif

        {{-- Background image for large devices --}}

        @if (settings('hero')->background_large)



@media only screen and (min-width: 992px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_large) }}');

            }

        }


        @endif



        {{-- Background image for large devices --}}

        @if (settings('hero')->background_large)



@media only screen and (min-width: 1200px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_large) }}');

            }

        }

        @endif

        @endif
    </style>

@endpush

