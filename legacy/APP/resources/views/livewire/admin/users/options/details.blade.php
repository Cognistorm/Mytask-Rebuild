<div class="w-full sm:mx-auto sm:max-w-2xl">
	<div class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">

            {{-- Avatar --}}
            @if ($user->avatar)
                <div class="relative">
                    <img class="w-14 h-14 rounded-full object-cover" src="{{ src($user->avatar) }}" alt="{{ $user->username }}">
                    @if ($user->isOnline())
                        <span class="top-0 ltr:left-10 rtl:right-10 absolute w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-800 rounded-full"></span>
                    @else
                        <span class="top-0 ltr:left-10 rtl:right-10 absolute w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-zinc-800 rounded-full"></span>
                    @endif
                </div>
            @else
                <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                    <i class="ph-duotone ph-user"></i>
                </div>
            @endif

            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_user_details')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_more_details_about_this_user')
                </p>
            </div>
        </div>

        {{-- General details --}}
        <div class="w-full">
            <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">

                {{-- Username --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_username') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ $user->username }}
                    </dd>
                </div>

                {{-- Email Address --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_email_address') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ $user->email }}
                    </dd>
                </div>

                {{-- Email verified at --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_email_verified_at') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->email_verified_at)
                            {{ format_date($user->email_verified_at, 'ago') }}
                        @else
                            -
                        @endif
                    </dd>
                </div>

                {{-- Account type --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_account_type') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->account_type === 'seller')
                            {{ __('messages.t_freelancer') }}
                        @else
                            {{ __('messages.t_buyer') }}
                        @endif
                    </dd>
                </div>

                {{-- Level --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_level') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->level)
                            {{ $user->level->title }}
                        @else
                            -
                        @endif
                    </dd>
                </div>

                {{-- Registeration method --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_registeration_method') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->provider_id && $user->provider_name)
                            @switch($user->provider_name)
                                @case('facebook')
                                    {{ __('messages.t_facebook') }}
                                @break

                                @case('twitter')
                                    {{ __('messages.t_twitter') }}
                                @break

                                @case('google')
                                    {{ __('messages.t_google') }}
                                @break

                                @case('github')
                                    {{ __('messages.t_github') }}
                                @break

                                @case('linkedin')
                                    {{ __('messages.t_linkedin') }}
                                @break

                                @default
                            @endswitch
                        @else
                            {{ __('messages.t_email_address') }}
                        @endif
                    </dd>
                </div>

                {{-- Country --}}
                @if ($user->country)
                    <div class="sm:col-span-1">
                        <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                            {{ __('messages.t_country') }}
                        </dt>
                        <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                            @if ($user->country)
                                <div class="flex items-center">
                                    <img src="{{ countryFlag($user->country?->code) }}"
                                        alt="{{ $user->country->name }}" class="h-3 ltr:mr-2 rtl:ml-2">
                                    <span>{{ $user->country->name }}</span>
                                </div>
                            @else
                                -
                            @endif
                        </dd>
                    </div>
                @endif

                {{-- Fullname --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_fullname') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->fullname)
                            {{ $user->fullname }}
                        @else
                            -
                        @endif
                    </dd>
                </div>

                {{-- Headline --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_headline') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->headline)
                            {{ $user->headline }}
                        @else
                            -
                        @endif
                    </dd>
                </div>

                {{-- Registeration date --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_registeration_date') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ format_date($user->created_at, 'ago') }}
                    </dd>
                </div>

                {{-- Balance net --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_net_balance') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ money($user->balance_net, settings('currency')->code, true) }}
                    </dd>
                </div>

                {{-- Balance net --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_withdrawn_money') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ money($user->balance_withdrawn, settings('currency')->code, true) }}
                    </dd>
                </div>

                {{-- Used for purchases --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_used_for_purchases') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ money($user->balance_purchases, settings('currency')->code, true) }}
                    </dd>
                </div>

                {{-- Pending clearance --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_pending_clearance') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ money($user->balance_pending, settings('currency')->code, true) }}
                    </dd>
                </div>

                {{-- Available balance --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_available_balance') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {{ money($user->balance_available, settings('currency')->code, true) }}
                    </dd>
                </div>

                {{-- Last activity --}}
                <div class="sm:col-span-1">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_last_activity') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->last_activity)
                            {{ format_date($user->last_activity, 'ago') }}
                        @else
                            -
                        @endif
                    </dd>
                </div>

                {{-- Description --}}
                <div class="sm:col-span-2">
                    <dt class="text-xs+ font-normal text-gray-400 dark:text-zinc-300">
                        {{ __('messages.t_description') }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        @if ($user->description)
                            {{ $user->description }}
                        @endif
                    </dd>
                </div>

            </dl>
        </div>

    </div>
</div>