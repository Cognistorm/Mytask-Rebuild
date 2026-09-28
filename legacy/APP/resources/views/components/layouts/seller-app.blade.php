<x-layouts.dashboard-app>
    <x-slot name="sidebarItems">

        <span
            class="my-2 flex  justify-center mr-1 items-center rounded-md bg-green-50 px-2 py-1 font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">{{ __('messages.t_seller_dashboard') }}</span>

        {{-- Home --}}
        <a href="{{ url('seller/home') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/home') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path fill="currentColor" fill-opacity=".3"
                      d="M5 14.059c0-1.01 0-1.514.222-1.945.221-.43.632-.724 1.453-1.31l4.163-2.974c.56-.4.842-.601 1.162-.601.32 0 .601.2 1.162.601l4.163 2.974c.821.586 1.232.88 1.453 1.31.222.43.222.935.222 1.945V19c0 .943 0 1.414-.293 1.707C18.414 21 17.943 21 17 21H7c-.943 0-1.414 0-1.707-.293C5 20.414 5 19.943 5 19v-4.94Z"></path>
                <path fill="currentColor"
                      d="M3 12.387c0 .267 0 .4.084.441.084.041.19-.04.4-.204l7.288-5.669c.59-.459.885-.688 1.228-.688.343 0 .638.23 1.228.688l7.288 5.669c.21.163.316.245.4.204.084-.04.084-.174.084-.441v-.409c0-.48 0-.72-.102-.928-.101-.208-.291-.355-.67-.65l-7-5.445c-.59-.459-.885-.688-1.228-.688-.343 0-.638.23-1.228.688l-7 5.445c-.379.295-.569.442-.67.65-.102.208-.102.448-.102.928v.409Z"></path>
                <path fill="currentColor"
                      d="M11.5 15.5h1A1.5 1.5 0 0 1 14 17v3.5h-4V17a1.5 1.5 0 0 1 1.5-1.5Z"></path>
                <path fill="currentColor"
                      d="M17.5 5h-1a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5Z"></path>
            </svg>

            <span>@lang('messages.t_home')</span>
        </a>

        {{-- Orders --}}
        <a href="{{ url('seller/orders') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/orders') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <rect x="0" y="0" width="24" height="24"/>
                    <path
                        d="M5.94290508,4 L18.0570949,4 C18.5865712,4 19.0242774,4.41271535 19.0553693,4.94127798 L19.8754445,18.882556 C19.940307,19.9852194 19.0990032,20.9316862 17.9963398,20.9965487 C17.957234,20.9988491 17.9180691,21 17.8788957,21 L6.12110428,21 C5.01653478,21 4.12110428,20.1045695 4.12110428,19 C4.12110428,18.9608266 4.12225519,18.9216617 4.12455553,18.882556 L4.94463071,4.94127798 C4.97572263,4.41271535 5.41342877,4 5.94290508,4 Z"
                        fill="currentColor" opacity="0.3"/>
                    <path
                        d="M7,7 L9,7 C9,8.65685425 10.3431458,10 12,10 C13.6568542,10 15,8.65685425 15,7 L17,7 C17,9.76142375 14.7614237,12 12,12 C9.23857625,12 7,9.76142375 7,7 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_orders')</span>
        </a>

        {{-- Gigs --}}
        <a href="{{ url('seller/gigs') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/gigs') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-opacity="0.25"
                      d="M21.0001 16.05V18.75C21.0001 20.1 20.1001 21 18.7501 21H6.6001C6.9691 21 7.3471 20.946 7.6981 20.829C7.7971 20.793 7.89609 20.757 7.99509 20.712C8.31009 20.586 8.61611 20.406 8.88611 20.172C8.96711 20.109 9.05711 20.028 9.13811 19.947L9.17409 19.911L15.2941 13.8H18.7501C20.1001 13.8 21.0001 14.7 21.0001 16.05Z"
                      fill="currentColor"></path>
                <path fill-opacity="0.5"
                      d="M17.7324 11.361L15.2934 13.8L9.17334 19.9111C9.80333 19.2631 10.1993 18.372 10.1993 17.4V8.70601L12.6384 6.26701C13.5924 5.31301 14.8704 5.31301 15.8244 6.26701L17.7324 8.17501C18.6864 9.12901 18.6864 10.407 17.7324 11.361Z"
                      fill="currentColor"></path>
                <path
                    d="M7.95 3H5.25C3.9 3 3 3.9 3 5.25V17.4C3 17.643 3.02699 17.886 3.07199 18.12C3.09899 18.237 3.12599 18.354 3.16199 18.471C3.20699 18.606 3.252 18.741 3.306 18.867C3.315 18.876 3.31501 18.885 3.31501 18.885C3.32401 18.885 3.32401 18.885 3.31501 18.894C3.44101 19.146 3.585 19.389 3.756 19.614C3.855 19.731 3.95401 19.839 4.05301 19.947C4.15201 20.055 4.26 20.145 4.377 20.235L4.38601 20.244C4.61101 20.415 4.854 20.559 5.106 20.685C5.115 20.676 5.11501 20.676 5.11501 20.685C5.25001 20.748 5.385 20.793 5.529 20.838C5.646 20.874 5.76301 20.901 5.88001 20.928C6.11401 20.973 6.357 21 6.6 21C6.969 21 7.347 20.946 7.698 20.829C7.797 20.793 7.89599 20.757 7.99499 20.712C8.30999 20.586 8.61601 20.406 8.88601 20.172C8.96701 20.109 9.05701 20.028 9.13801 19.947L9.17399 19.911C9.80399 19.263 10.2 18.372 10.2 17.4V5.25C10.2 3.9 9.3 3 7.95 3ZM6.6 18.75C5.853 18.75 5.25 18.147 5.25 17.4C5.25 16.653 5.853 16.05 6.6 16.05C7.347 16.05 7.95 16.653 7.95 17.4C7.95 18.147 7.347 18.75 6.6 18.75Z"
                    fill="currentColor"></path>
            </svg>

            <span>@lang('messages.t_gigs')</span>
        </a>

        {{-- Projects --}}
        @if (settings('projects')->is_enabled)
            <a href="{{ url('seller/projects') }}"
               class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/projects') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

                <svg
                    class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 24 24" version="1.1">
                    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                        <rect x="0" y="0" width="24" height="24"/>
                        <path
                            d="M4,6 L20,6 C20.5522847,6 21,6.44771525 21,7 L21,8 C21,8.55228475 20.5522847,9 20,9 L4,9 C3.44771525,9 3,8.55228475 3,8 L3,7 C3,6.44771525 3.44771525,6 4,6 Z M5,11 L10,11 C10.5522847,11 11,11.4477153 11,12 L11,19 C11,19.5522847 10.5522847,20 10,20 L5,20 C4.44771525,20 4,19.5522847 4,19 L4,12 C4,11.4477153 4.44771525,11 5,11 Z M14,11 L19,11 C19.5522847,11 20,11.4477153 20,12 L20,19 C20,19.5522847 19.5522847,20 19,20 L14,20 C13.4477153,20 13,19.5522847 13,19 L13,12 C13,11.4477153 13.4477153,11 14,11 Z"
                            fill="currentColor"/>
                        <path
                            d="M14.4452998,2.16794971 C14.9048285,1.86159725 15.5256978,1.98577112 15.8320503,2.4452998 C16.1384028,2.90482849 16.0142289,3.52569784 15.5547002,3.83205029 L12,6.20185043 L8.4452998,3.83205029 C7.98577112,3.52569784 7.86159725,2.90482849 8.16794971,2.4452998 C8.47430216,1.98577112 9.09517151,1.86159725 9.5547002,2.16794971 L12,3.79814957 L14.4452998,2.16794971 Z"
                            fill="currentColor" fill-rule="nonzero" opacity="0.3"/>
                    </g>
                </svg>

                <span>@lang('messages.t_awarded_projects')</span>
            </a>
        @endif

        {{-- Offers --}}
        @if (settings('publish')->enable_custom_offers)
            <a href="{{ url('seller/offers') }}"
               class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/offers') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

                <svg
                    class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 24 24" version="1.1">
                    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                        <rect x="0" y="0" width="24" height="24"/>
                        <polygon fill="currentColor" opacity="0.3" points="6 3 18 3 20 6.5 4 6.5"/>
                        <path
                            d="M6,5 L18,5 C19.1045695,5 20,5.8954305 20,7 L20,19 C20,20.1045695 19.1045695,21 18,21 L6,21 C4.8954305,21 4,20.1045695 4,19 L4,7 C4,5.8954305 4.8954305,5 6,5 Z M9,9 C8.44771525,9 8,9.44771525 8,10 C8,10.5522847 8.44771525,11 9,11 L15,11 C15.5522847,11 16,10.5522847 16,10 C16,9.44771525 15.5522847,9 15,9 L9,9 Z"
                            fill="currentColor"/>
                    </g>
                </svg>

                <span>@lang('messages.t_personal_offers')</span>
            </a>
        @endif

        {{-- Reviews --}}
        <a href="{{ url('seller/reviews') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/reviews') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <polygon points="0 0 24 0 24 24 0 24"/>
                    <path
                        d="M12,18 L7.91561963,20.1472858 C7.42677504,20.4042866 6.82214789,20.2163401 6.56514708,19.7274955 C6.46280801,19.5328351 6.42749334,19.309867 6.46467018,19.0931094 L7.24471742,14.545085 L3.94038429,11.3241562 C3.54490071,10.938655 3.5368084,10.3055417 3.92230962,9.91005817 C4.07581822,9.75257453 4.27696063,9.65008735 4.49459766,9.61846284 L9.06107374,8.95491503 L11.1032639,4.81698575 C11.3476862,4.32173209 11.9473121,4.11839309 12.4425657,4.36281539 C12.6397783,4.46014562 12.7994058,4.61977315 12.8967361,4.81698575 L14.9389263,8.95491503 L19.5054023,9.61846284 C20.0519472,9.69788046 20.4306287,10.2053233 20.351211,10.7518682 C20.3195865,10.9695052 20.2170993,11.1706476 20.0596157,11.3241562 L16.7552826,14.545085 L17.5353298,19.0931094 C17.6286908,19.6374458 17.263103,20.1544017 16.7187666,20.2477627 C16.5020089,20.2849396 16.2790408,20.2496249 16.0843804,20.1472858 L12,18 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_reviews')</span>
        </a>

        {{-- Refunds --}}
        <a href="{{ url('seller/refunds') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/refunds') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-5.5 w-5.5 ltr:mr-3.5 rtl:ml-3.5 -mt-[1px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <rect x="0" y="0" width="24" height="24"/>
                    <circle fill="currentColor" opacity="0.3" cx="20.5" cy="12.5" r="1.5"/>
                    <rect fill="currentColor" opacity="0.3"
                          transform="translate(12.000000, 6.500000) rotate(-15.000000) translate(-12.000000, -6.500000) "
                          x="3" y="3" width="18" height="7" rx="1"/>
                    <path
                        d="M22,9.33681558 C21.5453723,9.12084552 21.0367986,9 20.5,9 C18.5670034,9 17,10.5670034 17,12.5 C17,14.4329966 18.5670034,16 20.5,16 C21.0367986,16 21.5453723,15.8791545 22,15.6631844 L22,18 C22,19.1045695 21.1045695,20 20,20 L4,20 C2.8954305,20 2,19.1045695 2,18 L2,6 C2,4.8954305 2.8954305,4 4,4 L20,4 C21.1045695,4 22,4.8954305 22,6 L22,9.33681558 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_refunds')</span>
        </a>

        <a href="{{ url('seller/unblock-requests') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/unblock-requests') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                <path fill="currentColor" fill-opacity="0.3" d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                <path fill="currentColor" d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z"/>
            </svg>

            <span>@lang('messages.t_unblock_money_requests')</span>
        </a>

        {{-- Portfolio --}}
        <a href="{{ url('seller/portfolio') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/portfolio') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6.5 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M13.3111 14.75H5.03356C3.36523 14.75 2.30189 12.9625 3.10856 11.4958L5.24439 7.60911L7.24273 3.96995C8.07689 2.45745 10.2586 2.45745 11.0927 3.96995L13.1002 7.60911L14.0627 9.35995L15.2361 11.4958C16.0427 12.9625 14.9794 14.75 13.3111 14.75Z"
                    fill="currentColor"></path>
                <path fill-opacity="0.3"
                      d="M21.1667 15.2083C21.1667 18.4992 18.4992 21.1667 15.2083 21.1667C11.9175 21.1667 9.25 18.4992 9.25 15.2083C9.25 15.0525 9.25917 14.9058 9.26833 14.75H13.3108C14.9792 14.75 16.0425 12.9625 15.2358 11.4958L14.0625 9.36C14.4292 9.28666 14.8142 9.25 15.2083 9.25C18.4992 9.25 21.1667 11.9175 21.1667 15.2083Z"
                      fill="currentColor"></path>
            </svg>

            <span>@lang('messages.my_portfolio')</span>
        </a>

        {{-- Payouts --}}
        <a href="{{ url('seller/withdrawals') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/withdrawals') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <rect x="0" y="0" width="24" height="24"/>
                    <rect fill="currentColor" opacity="0.3" x="2" y="4" width="20" height="5" rx="1"/>
                    <path
                        d="M5,7 L8,7 L8,21 L7,21 C5.8954305,21 5,20.1045695 5,19 L5,7 Z M19,7 L19,19 C19,20.1045695 18.1045695,21 17,21 L11,21 L11,7 L19,7 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_payouts')</span>
        </a>
    </x-slot>

    <x-slot name="mobileSidebarItems">
                <span
                    class="my-2 flex  justify-center mr-1 items-center rounded-md bg-green-50 px-2 py-1 font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">ფრილანსერის პროფილი</span>

        {{-- Home --}}
        <a href="{{ url('seller/home') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/home') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path fill="currentColor" fill-opacity=".3"
                      d="M5 14.059c0-1.01 0-1.514.222-1.945.221-.43.632-.724 1.453-1.31l4.163-2.974c.56-.4.842-.601 1.162-.601.32 0 .601.2 1.162.601l4.163 2.974c.821.586 1.232.88 1.453 1.31.222.43.222.935.222 1.945V19c0 .943 0 1.414-.293 1.707C18.414 21 17.943 21 17 21H7c-.943 0-1.414 0-1.707-.293C5 20.414 5 19.943 5 19v-4.94Z"></path>
                <path fill="currentColor"
                      d="M3 12.387c0 .267 0 .4.084.441.084.041.19-.04.4-.204l7.288-5.669c.59-.459.885-.688 1.228-.688.343 0 .638.23 1.228.688l7.288 5.669c.21.163.316.245.4.204.084-.04.084-.174.084-.441v-.409c0-.48 0-.72-.102-.928-.101-.208-.291-.355-.67-.65l-7-5.445c-.59-.459-.885-.688-1.228-.688-.343 0-.638.23-1.228.688l-7 5.445c-.379.295-.569.442-.67.65-.102.208-.102.448-.102.928v.409Z"></path>
                <path fill="currentColor"
                      d="M11.5 15.5h1A1.5 1.5 0 0 1 14 17v3.5h-4V17a1.5 1.5 0 0 1 1.5-1.5Z"></path>
                <path fill="currentColor"
                      d="M17.5 5h-1a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5Z"></path>
            </svg>

            <span>@lang('messages.t_home')</span>
        </a>

        {{-- Orders --}}
        <a href="{{ url('seller/orders') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/orders') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <rect x="0" y="0" width="24" height="24"/>
                    <path
                        d="M5.94290508,4 L18.0570949,4 C18.5865712,4 19.0242774,4.41271535 19.0553693,4.94127798 L19.8754445,18.882556 C19.940307,19.9852194 19.0990032,20.9316862 17.9963398,20.9965487 C17.957234,20.9988491 17.9180691,21 17.8788957,21 L6.12110428,21 C5.01653478,21 4.12110428,20.1045695 4.12110428,19 C4.12110428,18.9608266 4.12225519,18.9216617 4.12455553,18.882556 L4.94463071,4.94127798 C4.97572263,4.41271535 5.41342877,4 5.94290508,4 Z"
                        fill="currentColor" opacity="0.3"/>
                    <path
                        d="M7,7 L9,7 C9,8.65685425 10.3431458,10 12,10 C13.6568542,10 15,8.65685425 15,7 L17,7 C17,9.76142375 14.7614237,12 12,12 C9.23857625,12 7,9.76142375 7,7 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_orders')</span>
        </a>

        {{-- Gigs --}}
        <a href="{{ url('seller/gigs') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/gigs') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-opacity="0.25"
                      d="M21.0001 16.05V18.75C21.0001 20.1 20.1001 21 18.7501 21H6.6001C6.9691 21 7.3471 20.946 7.6981 20.829C7.7971 20.793 7.89609 20.757 7.99509 20.712C8.31009 20.586 8.61611 20.406 8.88611 20.172C8.96711 20.109 9.05711 20.028 9.13811 19.947L9.17409 19.911L15.2941 13.8H18.7501C20.1001 13.8 21.0001 14.7 21.0001 16.05Z"
                      fill="currentColor"></path>
                <path fill-opacity="0.5"
                      d="M17.7324 11.361L15.2934 13.8L9.17334 19.9111C9.80333 19.2631 10.1993 18.372 10.1993 17.4V8.70601L12.6384 6.26701C13.5924 5.31301 14.8704 5.31301 15.8244 6.26701L17.7324 8.17501C18.6864 9.12901 18.6864 10.407 17.7324 11.361Z"
                      fill="currentColor"></path>
                <path
                    d="M7.95 3H5.25C3.9 3 3 3.9 3 5.25V17.4C3 17.643 3.02699 17.886 3.07199 18.12C3.09899 18.237 3.12599 18.354 3.16199 18.471C3.20699 18.606 3.252 18.741 3.306 18.867C3.315 18.876 3.31501 18.885 3.31501 18.885C3.32401 18.885 3.32401 18.885 3.31501 18.894C3.44101 19.146 3.585 19.389 3.756 19.614C3.855 19.731 3.95401 19.839 4.05301 19.947C4.15201 20.055 4.26 20.145 4.377 20.235L4.38601 20.244C4.61101 20.415 4.854 20.559 5.106 20.685C5.115 20.676 5.11501 20.676 5.11501 20.685C5.25001 20.748 5.385 20.793 5.529 20.838C5.646 20.874 5.76301 20.901 5.88001 20.928C6.11401 20.973 6.357 21 6.6 21C6.969 21 7.347 20.946 7.698 20.829C7.797 20.793 7.89599 20.757 7.99499 20.712C8.30999 20.586 8.61601 20.406 8.88601 20.172C8.96701 20.109 9.05701 20.028 9.13801 19.947L9.17399 19.911C9.80399 19.263 10.2 18.372 10.2 17.4V5.25C10.2 3.9 9.3 3 7.95 3ZM6.6 18.75C5.853 18.75 5.25 18.147 5.25 17.4C5.25 16.653 5.853 16.05 6.6 16.05C7.347 16.05 7.95 16.653 7.95 17.4C7.95 18.147 7.347 18.75 6.6 18.75Z"
                    fill="currentColor"></path>
            </svg>

            <span>@lang('messages.t_gigs')</span>
        </a>

        {{-- Projects --}}
        @if (settings('projects')->is_enabled)
            <a href="{{ url('seller/projects') }}"
               class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/projects') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

                <svg
                    class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 24 24" version="1.1">
                    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                        <rect x="0" y="0" width="24" height="24"/>
                        <path
                            d="M4,6 L20,6 C20.5522847,6 21,6.44771525 21,7 L21,8 C21,8.55228475 20.5522847,9 20,9 L4,9 C3.44771525,9 3,8.55228475 3,8 L3,7 C3,6.44771525 3.44771525,6 4,6 Z M5,11 L10,11 C10.5522847,11 11,11.4477153 11,12 L11,19 C11,19.5522847 10.5522847,20 10,20 L5,20 C4.44771525,20 4,19.5522847 4,19 L4,12 C4,11.4477153 4.44771525,11 5,11 Z M14,11 L19,11 C19.5522847,11 20,11.4477153 20,12 L20,19 C20,19.5522847 19.5522847,20 19,20 L14,20 C13.4477153,20 13,19.5522847 13,19 L13,12 C13,11.4477153 13.4477153,11 14,11 Z"
                            fill="currentColor"/>
                        <path
                            d="M14.4452998,2.16794971 C14.9048285,1.86159725 15.5256978,1.98577112 15.8320503,2.4452998 C16.1384028,2.90482849 16.0142289,3.52569784 15.5547002,3.83205029 L12,6.20185043 L8.4452998,3.83205029 C7.98577112,3.52569784 7.86159725,2.90482849 8.16794971,2.4452998 C8.47430216,1.98577112 9.09517151,1.86159725 9.5547002,2.16794971 L12,3.79814957 L14.4452998,2.16794971 Z"
                            fill="currentColor" fill-rule="nonzero" opacity="0.3"/>
                    </g>
                </svg>

                <span>@lang('messages.t_awarded_projects')</span>
            </a>
        @endif

        {{-- Offers --}}
        @if (settings('publish')->enable_custom_offers)
            <a href="{{ url('seller/offers') }}"
               class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/offers') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

                <svg
                    class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 24 24" version="1.1">
                    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                        <rect x="0" y="0" width="24" height="24"/>
                        <polygon fill="currentColor" opacity="0.3" points="6 3 18 3 20 6.5 4 6.5"/>
                        <path
                            d="M6,5 L18,5 C19.1045695,5 20,5.8954305 20,7 L20,19 C20,20.1045695 19.1045695,21 18,21 L6,21 C4.8954305,21 4,20.1045695 4,19 L4,7 C4,5.8954305 4.8954305,5 6,5 Z M9,9 C8.44771525,9 8,9.44771525 8,10 C8,10.5522847 8.44771525,11 9,11 L15,11 C15.5522847,11 16,10.5522847 16,10 C16,9.44771525 15.5522847,9 15,9 L9,9 Z"
                            fill="currentColor"/>
                    </g>
                </svg>

                <span>@lang('messages.t_personal_offers')</span>
            </a>
        @endif

        {{-- Reviews --}}
        <a href="{{ url('seller/reviews') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/reviews') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <polygon points="0 0 24 0 24 24 0 24"/>
                    <path
                        d="M12,18 L7.91561963,20.1472858 C7.42677504,20.4042866 6.82214789,20.2163401 6.56514708,19.7274955 C6.46280801,19.5328351 6.42749334,19.309867 6.46467018,19.0931094 L7.24471742,14.545085 L3.94038429,11.3241562 C3.54490071,10.938655 3.5368084,10.3055417 3.92230962,9.91005817 C4.07581822,9.75257453 4.27696063,9.65008735 4.49459766,9.61846284 L9.06107374,8.95491503 L11.1032639,4.81698575 C11.3476862,4.32173209 11.9473121,4.11839309 12.4425657,4.36281539 C12.6397783,4.46014562 12.7994058,4.61977315 12.8967361,4.81698575 L14.9389263,8.95491503 L19.5054023,9.61846284 C20.0519472,9.69788046 20.4306287,10.2053233 20.351211,10.7518682 C20.3195865,10.9695052 20.2170993,11.1706476 20.0596157,11.3241562 L16.7552826,14.545085 L17.5353298,19.0931094 C17.6286908,19.6374458 17.263103,20.1544017 16.7187666,20.2477627 C16.5020089,20.2849396 16.2790408,20.2496249 16.0843804,20.1472858 L12,18 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_reviews')</span>
        </a>

        {{-- Refunds --}}
        <a href="{{ url('seller/refunds') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/refunds') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-5.5 w-5.5 ltr:mr-3.5 rtl:ml-3.5 -mt-[1px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <rect x="0" y="0" width="24" height="24"/>
                    <circle fill="currentColor" opacity="0.3" cx="20.5" cy="12.5" r="1.5"/>
                    <rect fill="currentColor" opacity="0.3"
                          transform="translate(12.000000, 6.500000) rotate(-15.000000) translate(-12.000000, -6.500000) "
                          x="3" y="3" width="18" height="7" rx="1"/>
                    <path
                        d="M22,9.33681558 C21.5453723,9.12084552 21.0367986,9 20.5,9 C18.5670034,9 17,10.5670034 17,12.5 C17,14.4329966 18.5670034,16 20.5,16 C21.0367986,16 21.5453723,15.8791545 22,15.6631844 L22,18 C22,19.1045695 21.1045695,20 20,20 L4,20 C2.8954305,20 2,19.1045695 2,18 L2,6 C2,4.8954305 2.8954305,4 4,4 L20,4 C21.1045695,4 22,4.8954305 22,6 L22,9.33681558 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_refunds')</span>
        </a>

        <a href="{{ url('seller/unblock-requests') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/unblock-requests') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                <path fill="currentColor" fill-opacity="0.3" d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                <path fill="currentColor" d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z"/>
            </svg>

            <span>@lang('messages.t_unblock_money_requests')</span>
        </a>

        {{-- Portfolio --}}
        <a href="{{ url('seller/portfolio') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/portfolio') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6.5 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M13.3111 14.75H5.03356C3.36523 14.75 2.30189 12.9625 3.10856 11.4958L5.24439 7.60911L7.24273 3.96995C8.07689 2.45745 10.2586 2.45745 11.0927 3.96995L13.1002 7.60911L14.0627 9.35995L15.2361 11.4958C16.0427 12.9625 14.9794 14.75 13.3111 14.75Z"
                    fill="currentColor"></path>
                <path fill-opacity="0.3"
                      d="M21.1667 15.2083C21.1667 18.4992 18.4992 21.1667 15.2083 21.1667C11.9175 21.1667 9.25 18.4992 9.25 15.2083C9.25 15.0525 9.25917 14.9058 9.26833 14.75H13.3108C14.9792 14.75 16.0425 12.9625 15.2358 11.4958L14.0625 9.36C14.4292 9.28666 14.8142 9.25 15.2083 9.25C18.4992 9.25 21.1667 11.9175 21.1667 15.2083Z"
                      fill="currentColor"></path>
            </svg>

            <span>@lang('messages.my_portfolio')</span>
        </a>


        {{-- Payouts --}}
        <a href="{{ url('seller/withdrawals') }}"
           class="group flex items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 py-2 text-sm font-semibold tracking-wide ltr:rounded-l-full rtl:rounded-r-full {{ \Illuminate\Support\Str::of(request()->path())->startsWith('seller/withdrawals') ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-zinc-100' }}">

            <svg
                class="text-slate-500 dark:text-zinc-300 flex-shrink-0 h-6 w-6 ltr:mr-3.5 rtl:ml-3.5 -mt-[3px] group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 24 24" version="1.1">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <rect x="0" y="0" width="24" height="24"/>
                    <rect fill="currentColor" opacity="0.3" x="2" y="4" width="20" height="5" rx="1"/>
                    <path
                        d="M5,7 L8,7 L8,21 L7,21 C5.8954305,21 5,20.1045695 5,19 L5,7 Z M19,7 L19,19 C19,20.1045695 18.1045695,21 17,21 L11,21 L11,7 L19,7 Z"
                        fill="currentColor"/>
                </g>
            </svg>

            <span>@lang('messages.t_payouts')</span>
        </a>

    </x-slot>

    {{ $slot }}
</x-layouts.dashboard-app>
