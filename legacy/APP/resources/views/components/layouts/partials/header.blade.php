{{-- Header --}}
<div class="flex-shrink-0 flex h-16 bg-white dark:bg-zinc-800 border-b border-[#e9eef5] dark:border-zinc-600">

    {{-- Open sidebar --}}
    <button type="button"
            class="px-4 ltr:border-r rtl:border-l border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-600 md:hidden dark:border-zinc-700/40 dark:text-zinc-200"
            @click="open = true">

        <span class="sr-only">Open sidebar</span>

        <svg class="h-6 w-6 reflection" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h7"></path>
        </svg>

    </button>

    {{-- Header right --}}
    <div class="flex-1 px-4 md:px-6 flex justify-between">

        <div class="flex-1 flex"></div>

        <div class="ltr:ml-4 rtl:mr-4 flex items-center md:ltr:ml-6 md:rtl:mr-6">

            {{-- Notifications --}}
            @php
                $notifications = \App\Models\Notification::where('user_id', auth()->id())->where('is_seen', false)->latest()->get();
            @endphp

            <button x-on:click="notifications_menu = true" type="button"
                    class="text-gray-500 hover:text-primary-600 transition-colors duration-300 py-2 relative mx-4 dark:text-gray-100 dark:hover:text-white">

                <svg class="text-gray-400 hover:text-gray-700 h-6 w-6 dark:text-gray-100 dark:hover:text-white"
                     stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24"
                     xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 13.586V10c0-3.217-2.185-5.927-5.145-6.742C13.562 2.52 12.846 2 12 2s-1.562.52-1.855 1.258C7.185 4.074 5 6.783 5 10v3.586l-1.707 1.707A.996.996 0 0 0 3 16v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a.996.996 0 0 0-.293-.707L19 13.586zM19 17H5v-.586l1.707-1.707A.996.996 0 0 0 7 14v-4c0-2.757 2.243-5 5-5s5 2.243 5 5v4c0 .266.105.52.293.707L19 16.414V17zm-7 5a2.98 2.98 0 0 0 2.818-2H9.182A2.98 2.98 0 0 0 12 22z"></path>
                </svg>

                @if ($notifications && count($notifications))
                    <span class="flex absolute h-2 w-2 top-0 ltr:right-0 rtl:left-0 mt-0 ltr:-mr-1 rtl:-ml-1">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                    </span>
                @endif

            </button>

            {{-- Messages --}}
            @php
                $new_messages = \App\Models\ChMessage::where('to_id', auth()->id())->where('seen', false)->count();
            @endphp

            <a href="{{ url('inbox') }}"
               class="text-gray-500 hover:text-primary-600 transition-colors duration-300 py-2 relative mx-4 dark:text-gray-100 dark:hover:text-white">

                <svg class="text-gray-400 hover:text-gray-700 h-6 w-6 dark:text-gray-100 dark:hover:text-white"
                     stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24"
                     xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zm0 2v.511l-8 6.223-8-6.222V6h16zM4 18V9.044l7.386 5.745a.994.994 0 0 0 1.228 0L20 9.044 20.002 18H4z"></path>
                </svg>

                @if ($new_messages)
                    <span class="flex absolute h-2 w-2 top-0 ltr:right-0 rtl:left-0 mt-0 ltr:-mr-1 rtl:-ml-1">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                    </span>
                @endif

            </a>

            {{-- Profile dropdown --}}
            <div x-data="Components.menu({ open: false })" x-init="init()"
                 @keydown.escape.stop="open = false; focusButton()" @click.away="onClickAway($event)"
                 class="relative ltr:ml-3 rtl:mr-3">

                {{-- Button --}}
                <div>
                    <button
                            type="button" x-ref="button"
                            class="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-0 lg:rounded-md lg:p-2 lg:hover:bg-gray-50 dark:bg-zinc-700/40 lg:dark:hover:bg-zinc-700"
                            id="freelancer-dashboard-user-menu-button"
                            x-bind:aria-expanded="open.toString()"
                            @click="onButtonClick()"
                            @keyup.space.prevent="onButtonEnter()"
                            @keydown.enter.prevent="onButtonEnter()"
                            @keydown.arrow-up.prevent="onArrowUp()"
                            @keydown.arrow-down.prevent="onArrowDown()"
                            aria-expanded="false" aria-haspopup="true">

                        {{-- Avatar --}}
                        <div class="h-8 w-8 inline-flex flex-shrink-0 relative">
                            @if (auth()->user()->avatar)
                                <img class="mask is-squircle object-cover w-full h-full block"
                                     src="{{ src(auth()->user()->avatar) }}"
                                     alt="{{ auth()->user()->username }}">
                            @else
                                @php
                                    $faker = Faker\Factory::create();
                                    $color = $faker->rgbColor();
                                @endphp
                                <div class="flex items-center justify-center h-full w-full mask is-squircle text-sm uppercase font-medium"
                                     style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                    {{ Str::substr(auth()->user()->username, 0, 2) }}
                                </div>
                            @endif
                        </div>

                        {{-- Username --}}
                        <div class="ltr:ml-3 rtl:mr-3 hidden text-sm font-medium text-gray-700 dark:text-zinc-100 lg:block truncate max-w-[100px]">
                            {{ auth()->user()->username }}
                        </div>

                        {{-- Chevron icon --}}
                        <svg class="ltr:ml-1 rtl:mr-1 hidden h-5 w-5 flex-shrink-0 text-gray-400 lg:block"
                             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                             aria-hidden="true">
                            <path fill-rule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                  clip-rule="evenodd"></path>
                        </svg>

                    </button>
                </div>

                {{-- Menu --}}
                <div
                        x-show="open"
                        x-transition:enter="transition ease-out duration-100"
                        x-transition:enter-start="transform opacity-0 scale-95"
                        x-transition:enter-end="transform opacity-100 scale-100"
                        x-transition:leave="transition ease-in duration-75"
                        x-transition:leave-start="transform opacity-100 scale-100"
                        x-transition:leave-end="transform opacity-0 scale-95"
                        class="ltr:origin-top-right rtl:origin-top-left py-1 focus:outline-none absolute top-full ltr:right-0 rtl:left-0 w-60 mt-3 bg-white dark:bg-zinc-800 rounded-lg shadow-md ring-1 ring-gray-900 ring-opacity-5 font-normal text-sm text-gray-900 divide-y divide-gray-100 dark:divide-zinc-700 z-40"
                        x-ref="menu-items"
                        x-bind:aria-activedescendant="activeDescendant"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="freelancer-dashboard-user-menu-button"
                        tabindex="-1"
                        @keydown.arrow-up.prevent="onArrowUp()"
                        @keydown.arrow-down.prevent="onArrowDown()"
                        @keydown.tab="open = false"
                        @keydown.enter.prevent="open = false; focusButton()"
                        @keyup.space.prevent="open = false; focusButton()"
                        style="display: none;">

                    <p class="py-3 px-3.5 truncate">
                        <span class="block mb-0.5 text-xs text-gray-500 dark:text-gray-300">{{ __('messages.t_logged_in_as_username', ['username' => auth()->user()->username]) }}</span>
                        <span class="font-semibold dark:text-white">{{ money(auth()->user()->balance_available, settings('currency')->code, true) }}</span>
                    </p>

                    {{-- Account --}}
                    <div class="py-1.5 px-3.5">

                        {{-- View Profile --}}
                        <a href="{{ url('profile', auth()->user()->username) }}"
                           class="group flex items-center py-1.5 group-hover:text-primary-600">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 class="flex-none ltr:mr-3 rtl:ml-3 text-gray-400 group-hover:text-primary-600 h-5 w-5"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span class="font-semibold text-xs text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">{{ __('messages.t_view_profile') }}</span>
                        </a>

                        {{-- Edit profile --}}
                        <a href="{{ url('account/profile') }}"
                           class="group flex items-center py-1.5 group-hover:text-primary-600">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 class="flex-none ltr:mr-3 rtl:ml-3 text-gray-400 group-hover:text-primary-600 h-5 w-5"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            <span class="font-semibold text-xs text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">{{ __('messages.t_edit_profile') }}</span>
                        </a>

                        {{-- Account settings --}}
                        <a href="{{ url('account/settings') }}"
                           class="group flex items-center py-1.5 group-hover:text-primary-600">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 class="flex-none ltr:mr-3 rtl:ml-3 text-gray-400 group-hover:text-primary-600 h-5 w-5"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <span class="font-semibold text-xs text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">{{ __('messages.t_account_settings') }}</span>
                        </a>

                        {{-- Update password --}}
                        <a href="{{ url('account/password') }}"
                           class="group flex items-center py-1.5 group-hover:text-primary-600">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 class="flex-none ltr:mr-3 rtl:ml-3 text-gray-400 group-hover:text-primary-600 h-5 w-5"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                            <span class="font-semibold text-xs text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">{{ __('messages.t_update_password') }}</span>
                        </a>

                    </div>

                    {{-- Content --}}
                    <div class="py-1.5 px-3.5">

                        {{-- Messages --}}
                        <a href="{{ url('inbox') }}"
                           class="group flex items-center py-1.5 group-hover:text-primary-600">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 class="flex-none ltr:mr-3 rtl:ml-3 text-gray-400 group-hover:text-primary-600 h-5 w-5"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            <span class="font-semibold text-xs text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">{{ __('messages.t_messages') }}</span>
                        </a>

                    </div>

                    {{-- Security --}}
                    <div class="py-1.5 px-3.5">

                        {{-- Verification center --}}
                        @if (auth()->user()->status !== 'verified')
                            <a href="{{ url('account/verification') }}"
                               class="group flex items-center py-1.5 group-hover:text-primary-600">
                                <svg xmlns="http://www.w3.org/2000/svg"
                                     class="flex-none ltr:mr-3 rtl:ml-3 text-gray-400 group-hover:text-primary-600 h-5 w-5"
                                     fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                </svg>
                                <span class="font-semibold text-xs text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">{{ __('messages.t_verification_center') }}</span>
                            </a>
                        @endif

                        {{-- Logout --}}
                        <a href="{{ url('auth/logout') }}"
                           class="group flex items-center py-1.5 group-hover:text-primary-600">
                            <svg aria-hidden="true" width="20" height="20" fill="none"
                                 class="flex-none ltr:mr-3 rtl:ml-3 text-gray-400 group-hover:text-primary-600 h-5 w-5">
                                <path
                                        d="M10.25 3.75H9A6.25 6.25 0 002.75 10v0A6.25 6.25 0 009 16.25h1.25M10.75 10h6.5M14.75 12.25l2.5-2.25-2.5-2.25"
                                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                                        stroke-linejoin="round"/>
                            </svg>
                            <span class="font-semibold text-xs text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">{{ __('messages.t_logout') }}</span>
                        </a>

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>
