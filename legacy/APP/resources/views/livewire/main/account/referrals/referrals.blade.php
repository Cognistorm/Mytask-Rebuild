<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24">

    <div class="px-4 sm:px-6 lg:px-8">

        <div class="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">

            <div class="divide-y divide-gray-200 dark:divide-zinc-700 lg:grid lg:grid-cols-12 lg:divide-y-0 lg:divide-x rtl:divide-x-reverse">

                {{-- Sidebar --}}
                <aside class="lg:col-span-3 py-6 hidden lg:block">
                    <livewire:main.account.sidebar-component />
                </aside>

                {{-- Section content --}}
                <div class="divide-y divide-gray-200 dark:divide-zinc-700 lg:col-span-9">

                    {{-- Form --}}
                    <div class="py-6 px-4 sm:p-6 lg:pb-8 h-[calc(100%-80px)]">

                        {{-- Section header --}}
                        <div class="mb-8">
                            <h2 class="text-base leading-6 font-bold text-gray-900 dark:text-gray-100">{{ __('messages.t_my_referrals') }}</h2>
                        </div>

                        {{-- Referral Statistics --}}
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                            {{-- Total Referrals --}}
                            <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium opacity-90">{{ __('messages.t_total_referrals') }}</p>
                                        <p class="text-2xl font-bold">{{ $stats->total_referrals }}</p>
                                    </div>
                                </div>
                            </div>

                            {{-- Premium Referrals --}}
                            <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                                        </svg>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium opacity-90">{{ __('messages.t_premium_referrals') }}</p>
                                        <p class="text-2xl font-bold">
                                            {{ $stats->premium_referrals }}
                                            <span class="text-sm font-normal opacity-75">
                                                ({{ $stats->paid_premium_referrals }} {{ __('messages.t_paid_premium') }}, {{ $stats->bonus_premium_referrals }} {{ __('messages.t_bonus_premium') }})
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {{-- Total Points --}}
                            <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                                        </svg>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium opacity-90">{{ __('messages.t_total_points') }}</p>
                                        <p class="text-2xl font-bold">{{ auth()->user()->balance_points ?? 0}}</p>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {{-- Referral Link Section --}}
                        <div class="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-6 mb-8">
                            <div class="space-y-4">
                                {{-- Referral Code --}}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {{ __('messages.t_referral_code') }}
                                    </label>
                                    <div class="flex">
                                        <input type="text"
                                               value="{{ $referralCode }}"
                                               readonly
                                               class="flex-1 min-w-0 bg-white dark:bg-zinc-600 border border-gray-300 dark:border-zinc-500 rounded-l-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500">
                                        <button type="button"
                                                id="copy-code-btn"
                                                onclick="copyToClipboard('{{ $referralCode }}', 'copy-code-btn')"
                                                class="relative -ml-px inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-500 bg-gray-50 dark:bg-zinc-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-r-md hover:bg-gray-100 dark:hover:bg-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                            </svg>
                                            <span class="ml-2">{{ __('messages.t_copy') }}</span>
                                        </button>
                                    </div>
                                </div>

                                {{-- Referral Link --}}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {{ __('messages.t_referral_link') }}
                                    </label>
                                    <div class="flex">
                                        <input type="text"
                                               value="{{ $referralLink }}"
                                               readonly
                                               class="flex-1 min-w-0 bg-white dark:bg-zinc-600 border border-gray-300 dark:border-zinc-500 rounded-l-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500">
                                        <button type="button"
                                                id="copy-link-btn"
                                                onclick="copyToClipboard('{{ $referralLink }}', 'copy-link-btn')"
                                                class="relative -ml-px inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-500 bg-gray-50 dark:bg-zinc-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-r-md hover:bg-gray-100 dark:hover:bg-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                            </svg>
                                            <span class="ml-2">{{ __('messages.t_copy') }}</span>
                                        </button>
                                    </div>
                                </div>

                                {{-- Share Buttons --}}
                                <div class="flex flex-col md:flex-row gap-3 md:gap-0 md:space-x-3">
                                    <a href="https://www.linkedin.com/sharing/share-offsite/?url={{ urlencode($referralLink) }}"
                                       target="_blank"
                                       class="inline-flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-md transition-colors">
                                        <svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                        {{ __('messages.t_share_on_linkedin') }}
                                    </a>

                                    <a href="https://www.facebook.com/sharer/sharer.php?u={{ urlencode($referralLink) }}"
                                       target="_blank"
                                       class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
                                        <svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                        {{ __('messages.t_share_on_facebook') }}
                                    </a>
                                </div>
                            </div>
                        </div>

                        {{-- How it Works --}}
                        <div class="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-600 p-6 mb-8">
                            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-8 text-center">{{ __('messages.t_how_it_works') }}</h3>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="text-center">
                                    <div class="bg-primary-100 dark:bg-primary-900/20 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                        <span class="text-primary-600 dark:text-primary-400 text-lg font-bold">1</span>
                                    </div>
                                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{{ __('messages.t_step_1title') }}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ __('messages.t_step_1description') }}</p>
                                </div>

                                <div class="text-center">
                                    <div class="bg-primary-100 dark:bg-primary-900/20 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                        <span class="text-primary-600 dark:text-primary-400 text-lg font-bold">2</span>
                                    </div>
                                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{{ __('messages.t_step_2title') }}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ __('messages.t_step_2description') }}</p>
                                </div>

                                <div class="text-center">
                                    <div class="bg-primary-100 dark:bg-primary-900/20 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                        <span class="text-primary-600 dark:text-primary-400 text-lg font-bold">3</span>
                                    </div>
                                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{{ __('messages.t_step_3title') }}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ __('messages.t_step_3description') }}</p>
                                </div>
                            </div>
                        </div>

                        {{-- Recent Referrals --}}
                        @if($recentReferrals->count() > 0)
                            <div class="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-600 p-6">
                                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{{ __('messages.t_recent_referrals') }}</h3>

                                <div class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-gray-200 dark:divide-zinc-600">
                                        <thead class="bg-gray-50 dark:bg-zinc-700/50">
                                            <tr>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    {{ __('messages.t_username') }}
                                                </th>
                                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    {{ __('messages.t_premium') }}
                                                </th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    {{ __('messages.t_status') }}
                                                </th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    {{ __('messages.t_joined') }}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-600">
                                            @foreach($recentReferrals as $referral)
                                                <tr>
                                                    <td class="px-6 py-4 whitespace-nowrap">
                                                        <div class="flex items-center">
                                                            <div class="flex-shrink-0 h-8 w-8">
                                                                @if($referral->referredUser && $referral->referredUser->avatar)
                                                                    <img class="h-8 w-8 rounded-full object-cover" src="{{ src($referral->referredUser->avatar) }}" alt="{{ $referral->referredUser->username }}">
                                                                @else
                                                                    <div class="h-8 w-8 rounded-full bg-gray-300 dark:bg-zinc-600 flex items-center justify-center">
                                                                        <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                            {{ $referral->referredUser ? substr($referral->referredUser->username, 0, 2) : '?' }}
                                                                        </span>
                                                                    </div>
                                                                @endif
                                                            </div>
                                                            <div class="ml-4">
                                                                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                    {{ $referral->referredUser ? $referral->referredUser->username : 'Unknown User' }}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-6 py-4 whitespace-nowrap text-center">
                                                        @if($referral->referredUser?->hasPaidPremium())
                                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                                </svg>
                                                                {{ __('messages.t_paid_premium') }}
                                                            </span>
                                                        @elseif($referral->referredUser?->hasGiftedPremium())
                                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                                </svg>
                                                                {{ __('messages.t_bonus_premium') }}
                                                            </span>
                                                        @else
                                                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-700">
                                                                <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                                                </svg>
                                                            </span>
                                                        @endif
                                                    </td>
                                                    <td class="px-6 py-4 whitespace-nowrap">
                                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {{ $referral->status->color() }}">
                                                            {{ $referral->status->label() }}
                                                        </span>
                                                    </td>
                                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {{ $referral->referred_at->format('d/m/Y') }}
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>

                                {{-- Pagination --}}
                                @if($recentReferrals->hasPages())
                                    <div class="mt-4 border-t border-gray-200 dark:border-zinc-600 pt-4">
                                        {!! $recentReferrals->links('pagination::tailwind') !!}
                                    </div>
                                @endif
                            </div>
                        @else
                            <div class="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-8 text-center">
                                <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                <h3 class="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">{{ __('messages.t_no_referrals_yet') }}</h3>
                            </div>
                        @endif

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>

<script>
function copyToClipboard(text, buttonId) {
    navigator.clipboard.writeText(text).then(function() {
        const button = document.getElementById(buttonId);
        const span = button.querySelector('span');
        const originalText = span.textContent;
        const originalClasses = button.className;

        button.className = button.className.replace(/bg-gray-50|dark:bg-zinc-600|text-gray-700|dark:text-gray-300|border-gray-300|dark:border-zinc-500/, '') + ' bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500';
        span.textContent = '{{ __('messages.t_copied') }}';

        setTimeout(function() {
            button.className = originalClasses;
            span.textContent = originalText;
        }, 2000);
    }).catch(function(err) {
        console.error('Failed to copy text: ', err);
    });
}
</script>
