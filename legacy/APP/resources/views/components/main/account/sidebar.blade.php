<nav class="w-full {{ $class ?? '' }}">

    @php
        $link_active_class = 'bg-primary-100/25 border-primary-600 text-primary-700 dark:text-white hover:bg-primary-100/25 hover:text-primary-700';
        $link_basic_class  = 'border-transparent text-gray-500 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-600 hover:text-gray-900';
        $icon_active_class = 'text-primary-600 dark:text-gray-50 group-hover:text-primary-600 dark:group-hover:text-white';
        $icon_basic_class  = 'text-gray-400 dark:text-gray-300 dark:group-hover:text-white group-hover:text-gray-500';
        $id                = uid();
    @endphp

    <div class="w-full border-b border-gray-100 dark:border-zinc-600">
        <div class="flex flex-col text-center divide-y divide-gray-200 dark:divide-zinc-600">
            <div class="flex-1 flex flex-col p-8">
                <div class="relative flex-shrink-0 mx-auto">
                    <div class="relative rounded-full overflow-hidden w-28 h-28">
                        @if(auth()->user()->avatar)
                            <img id="profile-avatar-preview" loading="lazy"
                                 class="w-full h-full object-cover"
                                 src="{{src(auth()->user()->avatar) ?? placeholder_img() }}"
                                 data-src="{{ src(auth()->user()->avatar) }}"
                                 alt="{{ auth()->user()->username }}"
                            >

                        @else

                            <div id="profile-avatar-preview"
                                 class="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-600">

                                   <span
                                    class="font-semibold text-slate-400 dark:text-gray-300 uppercase text-lg tracking-wider">

                                     {{ Str::take( auth()->user()->username, 2 ) }}

                                  </span>

                            </div>
                        @endif

                        <label for="profile-avatar-container"
                               class="absolute inset-0 w-full h-full bg-black bg-opacity-50 rounded-full flex items-center justify-center text-sm font-medium text-white opacity-0 hover:opacity-100 cursor-pointer">

                            <span>{{ __('messages.t_change') }}</span>

                            <input type="file" id="profile-avatar-container" wire:model="avatar"
                                   accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/svg+xml"
                                   onchange="avatar(event)"
                                   class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">

                        </label>
                    </div>

                    @if(auth()->user()->avatar)
                        <button wire:click="removeAvatar"
                                wire:loading.attr="disabled"
                                class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors duration-200 z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    @endif

                </div>

                <h3 class="mt-6 text-gray-700 dark:text-white text-sm font-medium flex items-center justify-center">
                    <span
                        class="text-sm font-bold tracking-wider text-gray-700 dark:text-gray-100">{{ auth()->user()->username }}</span>
                    @if (auth()->user()->status === 'verified')
                        <img data-tooltip-target="tooltip-account-verified-{{ $id }}"
                             class="ltr:ml-0.5 rtl:mr-0.5 h-4 w-4 -mt-0.5"
                             src="{{ url('img/auth/verified-badge.svg') }}"
                             alt="{{ __('messages.t_account_verified') }}">
                        <div id="tooltip-account-verified-{{ $id }}" role="tooltip"
                             class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip dark:bg-gray-700">
                            {{ __('messages.t_account_verified') }}
                        </div>
                    @endif
                </h3>
                <dl class="mt-1 flex-grow flex flex-col justify-between">
                    <dd class="text-gray-900 text-sm font-black dark:text-white">{{ money(auth()->user()->balance_available, settings('currency')->code, true) }}</dd>
                </dl>
            </div>
        </div>
    </div>

    <div class="border-b border-gray-100 dark:border-zinc-600">

        {{-- Account settings --}}
        <a href="{{ url('account/settings') }}"
           class="{{ Request::is('account/settings') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            {{-- icon --}}
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="{{ Request::is('account/settings') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>

            {{-- text --}}
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_account_settings') }} </span>

        </a>

        {{-- Update password --}}
        <a href="{{ url('account/password') }}"
           class="{{ Request::is('account/password') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            {{-- icon --}}
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="{{ Request::is('account/password') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>

            {{-- text --}}
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_update_password') }} </span>

        </a>

        {{-- Billing settings --}}
        <a href="{{ url('account/billing') }}"
           class="{{ Request::is('account/billing') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            {{-- icon --}}
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="{{ Request::is('account/billing') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
            </svg>

            {{-- text --}}
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_billing_information') }} </span>

        </a>

    </div>

    <div class="border-b border-gray-100 dark:border-zinc-600">


        {{-- Payment Methods --}}
        <a href="{{ url('account/cards') }}"
           class="{{ Request::is('account/cards') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            {{-- icon --}}
            <svg
                class="{{ Request::is('account/cards') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>

            {{-- text --}}
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_payment_methods') }} </span>

        </a>

        {{-- My Subscription --}}
        <a href="{{ url('account/my-subscription') }}"
           class="{{ Request::is('account/my-subscription') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            {{-- icon --}}
            <svg
                class="{{ Request::is('account/my-subscription') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>

            {{-- text --}}
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_my_subscription') }} </span>

        </a>

        <a href="{{ url('account/referrals') }}"
           class="{{ Request::is('account/referrals') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            <svg
                class="{{ Request::is('account/referrals') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>

            <span class="truncate text-sm font-semibold"> {{ __('messages.t_referrals') }} </span>

        </a>
    </div>

    <div class="border-b border-gray-100 dark:border-zinc-600">

        {{-- Verification center --}}
        <a href="{{ url('account/verification') }}"
           class="{{ Request::is('account/verification') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            {{-- icon --}}
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="{{ Request::is('account/verification') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>

            {{-- text --}}
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_verification_center') }} </span>

        </a>

    </div>

    {{-- Browser sessions --}}
    @if (auth()->user()->password)
        <a href="{{ url('account/sessions') }}"
           class="{{ Request::is('account/sessions') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

            {{-- icon --}}
            <svg
                class="{{ Request::is('account/sessions') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>

            {{-- text --}}
            <span class="truncate text-sm font-semibold"> {{ __('messages.t_browser_sessions') }} </span>

        </a>
    @endif

    {{-- Logout --}}
    <a href="{{ url('auth/logout') }}"
       class="{{ Request::is('account/logout') ? $link_active_class : $link_basic_class }} group ltr:border-l-4 rtl:border-r-4 px-5 py-3 flex items-center text-sm font-medium">

        {{-- icon --}}
        <svg xmlns="http://www.w3.org/2000/svg"
             class="{{ Request::is('account/logout') ? $icon_active_class : $icon_basic_class }} flex-shrink-0 ltr:-ml-1 rtl:-mr-1 ltr:mr-3 rtl:ml-3 h-5 w-5"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>

        {{-- text --}}
        <span class="truncate text-sm font-semibold"> {{ __('messages.t_logout') }} </span>

    </a>

</nav>

<script>
    // Avatar upload validation function
    function avatar(event) {
        const file = event.target.files[0];

        // Check if file exists
        if (!file) {
            return;
        }

        // Check file size (2MB = 2097152 bytes)
        const maxSizeInBytes = 2097152; // 2MB

        if (file.size > maxSizeInBytes) {
            // Show error message for oversized file
            window.$wireui.notify({
                title: "{{ __('messages.t_error') }}",
                description: "{{ __('messages.t_validator_max_file_size_2mb') }}",
                icon: 'error'
            });
            // Clear the file input
            event.target.value = '';
            return;
        }

        var output = document.getElementById('profile-avatar-preview');
        if (output) {
            output.src = URL.createObjectURL(file);
            output.onload = function () {
                URL.revokeObjectURL(output.src) // free memory
            }
        }
    }
</script>
