<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24">
    {{-- Loading --}}
    <x-forms.loading />

    {{-- Form --}}
    <div class="overflow-hidden">
        <div class="relative mx-auto max-w-xl">
            {{-- Heading --}}
            <div class="text-center">
                <h2 class="text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                    @lang('messages.t_contact_us')
                </h2>
                <p class="mt-2 text-sm leading-6 text-gray-500 dark:text-zinc-400">
                    @lang('messages.t_contact_us_subtitle')
                </p>
            </div>

            <div class="mt-12">
                <x-form class="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8" id="contact-form">
                    {{-- Fullname --}}
                    <div class="col-span-2">
                        <x-forms.text-input
                            :label="__('messages.t_name')"
                            :placeholder="__('messages.t_enter_your_fullname')"
                            icon="user"
                            model="name" />
                    </div>

                    {{-- Email address --}}
                    <div class="col-span-2">
                        <x-forms.text-input
                            :label="__('messages.t_email_address')"
                            :placeholder="__('messages.t_enter_email_address')"
                            icon="at"
                            model="email"
                            type="email" />
                    </div>

                    {{-- Subject --}}
                    <div class="col-span-2">
                        <x-forms.text-input
                            :label="__('messages.t_subject')"
                            :placeholder="__('messages.t_enter_message_subject')"
                            icon="envelope"
                            model="subject" />
                    </div>

                    {{-- Message --}}
                    <div class="col-span-2">
                        <x-forms.textarea
                            :label="__('messages.t_message')"
                            :placeholder="__('messages.t_descibe_ur_message_in_details')"
                            icon="chat-circle-dots"
                            model="message" />
                    </div>

                    {{-- reCaptcha error --}}
                    @error('recaptcha_token')
                        <div class="col-span-2">
                            <p class="text-xs text-red-600 dark:text-red-500">{{ $errors->first('recaptcha_token') }}</p>
                        </div>
                    @enderror

                    {{-- Submit --}}
                    <div class="col-span-2">
                        <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                            @lang('messages.t_lets_talk')
                        </x-bladewind.button>
                    </div>

                    {{-- Agree & reCaptcha --}}
                    <div class="col-span-2">
                        <ul class="space-y-1 text-gray-500 list-disc list-inside dark:text-zinc-400">
                            {{-- reCaptcha --}}
                            @if (settings('security')->is_recaptcha)
                                <li class="text-xs tracking-wide text-slate-400 dark:text-zinc-400">
                                    @lang('messages.t_this_site_protected_by_recaptcha_and_google')
                                    <a href="https://policies.google.com/privacy" target="_blank" class="text-gray-900 dark:text-zinc-200 hover:underline font-medium">
                                        @lang('messages.t_privacy_policy')
                                    </a>
                                    <span class="lowercase">@lang('messages.t_and')</span>
                                    <a href="https://policies.google.com/terms" target="_blank" class="text-gray-900 dark:text-zinc-200 hover:underline font-medium">
                                        @lang('messages.t_terms_of_service')
                                    </a>
                                    @lang('messages.t_recaptcha_apply')
                                </li>
                            @endif

                            {{-- Agree --}}
                            <li class="text-xs tracking-wide text-slate-400 dark:text-zinc-400">
                                {!! __('messages.t_by_continue_agree_terms_privacy', [
                                    'privacy_link' => settings('footer')->privacy ? url('page', settings('footer')->privacy->slug) : "#",
                                    'privacy_text' => settings('footer')->privacy ? settings('footer')->privacy->title : __('messages.t_privacy_policy'),
                                    'terms_link'   => settings('footer')->terms ? url('page', settings('footer')->terms->slug) : "#",
                                    'terms_text'   => settings('footer')->terms ? settings('footer')->terms->title : __('messages.t_terms_of_service'),
                                ]) !!}
                            </li>
                        </ul>
                    </div>
                </x-form>
            </div>
        </div>
    </div>
</div>

{{-- Inject css --}}
@push('styles')
    {{-- reCaptcha --}}
	@if (settings('security')->is_recaptcha)
        <script src="https://www.google.com/recaptcha/api.js?render={{ config('recaptcha.site_key') }}"></script>
    @endif
@endpush

{{-- Inject Js --}}
@push('scripts')
    {{-- Verify reCaptcha --}}
	@if (settings('security')->is_recaptcha)
        <script>
            grecaptcha.ready(function () {
                document.getElementById('contact-form').addEventListener("submit", function (event) {
                    event.preventDefault();
                    grecaptcha.execute("{{ config('recaptcha.site_key') }}", { action: 'register' })
                        .then(function (token) {
                            window.Livewire.find("{{ $this->id() }}").set('recaptcha_token', token)
                            window.Livewire.find("{{ $this->id() }}").contact();
                        });
                });
            });
        </script>
    @endif
@endpush
