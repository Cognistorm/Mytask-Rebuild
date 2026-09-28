<x-layouts.dashboard-app>
    <x-slot name="sidebarItems">

        <span
            class="mr-1 my-2 flex justify-center items-center rounded-md bg-cpx-2 py-1 font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">{{ __('messages.t_buyer_dashboard') }}</span>


        @if (settings('projects')->is_enabled)
            <a href="{{ url('account/projects') }}"
               class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/projects') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5">
                    <path
                        d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>
                    <circle cx="14" cy="15" r="1"/>
                </svg>

                <span>@lang('messages.t_ordered_projects')</span>
            </a>
        @endif


        <a href="{{ url('account/orders') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/orders') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>


            <span>{{ __('messages.t_buy_services') }}</span>
        </a>

        @if (settings('publish')->enable_custom_offers)
        <a href="{{ url('account/offers') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/offers') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg class="{{ Request::is('account/orders') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
            </svg>


            <span>{{ __('messages.t_personal_offers') }}</span>
        </a>
        @endif

        {{-- Reviews --}}
        <a href="{{ url('account/reviews') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/reviews') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_my_reviews') }} </span>
        </a>

        <a href="{{ url('account/refunds') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/refunds') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"/>
            </svg>

            <span class="truncate text-sm font-semibold"> {{ __('messages.t_refunds') }} </span>
        </a>

        <a href="{{ url('account/favorite') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/favorite') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>

            <span class="truncate text-sm font-semibold"> {{ __('messages.t_favorite_list') }} </span>
        </a>


    </x-slot>

    <x-slot name="mobileSidebarItems">
                <span
                    class="mr-1 my-2 flex justify-center items-center rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">დამკვეთის პროფილი</span>


        @if (settings('projects')->is_enabled)
            <a href="{{ url('account/projects') }}"
               class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/projects') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5">
                    <path
                        d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>
                    <circle cx="14" cy="15" r="1"/>
                </svg>


                <span>@lang('messages.t_projects')</span>
            </a>
        @endif


        <a href="{{ url('account/orders') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/orders') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>


            <span>{{ __('messages.t_my_orders') }}</span>
        </a>

        {{-- Reviews --}}
        <a href="{{ url('account/reviews') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/reviews') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_my_reviews') }} </span>
        </a>

        <a href="{{ url('account/refunds') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ Request::is('account/refunds') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"/>
            </svg>

            <span class="truncate text-sm font-semibold"> {{ __('messages.t_refunds') }} </span>
        </a>

        <a href="{{ url('account/favorite') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{Request::is('account/favorite') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg xmlns="http://www.w3.org/2000/svg"
                 class="flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>

            <span class="truncate text-sm font-semibold"> {{ __('messages.t_favorite_list') }} </span>
        </a>


    </x-slot>

    {{ $slot }}
</x-layouts.dashboard-app>

