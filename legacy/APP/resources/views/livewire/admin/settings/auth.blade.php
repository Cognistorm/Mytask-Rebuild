<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-fingerprint"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_auth_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_auth_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Verification required --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$verification_required"
                        name="verification_required"
                        :label="__('dashboard.t_account_verification_required')"
                        label_position="right" />
                </div>

                {{-- Verification method --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="verification_type"
                            :selected_value="$verification_type"
                            :label="__('dashboard.t_verification_method')"
                            :placeholder="__('dashboard.t_choose_verification_method')"
                            data="manual">
                        
                            {{-- Dashboard --}}
                            <x-bladewind.select-item :label="__('dashboard.t_manually_from_dashboard')" value="admin" />

                            {{-- Email address --}}
                            <x-bladewind.select-item :label="__('messages.t_email_address')" value="email" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('verification_type')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('verification_type') }}</p>
                    @enderror 

                </div>

                {{-- Verification expiry time --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_verification_expiry_period')"
                        :placeholder="__('messages.t_verification_expiry_period_after_minutes')"
                        model="verification_expiry_period"
                        icon="clock-countdown" />
                </div>

                {{-- Password reset expiry period --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_password_reset_expiry_period')"
                        :placeholder="__('messages.t_password_expiry_period_after_minutes')"
                        model="password_reset_expiry_period"
                        icon="password" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Authentication screen wallpaper --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('auth')->wallpaper) ? src(settings('auth')->wallpaper) : ''"
                        name="auth_img_id"
                        :placeholder="__('messages.t_auth_screen_background_img')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Default buyer level --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->id()"
                            name="default_buyer_level"
                            :selected_value="$default_buyer_level"
                            :label="__('dashboard.t_default_new_buyers_level')"
                            :placeholder="__('messages.t_choose_level')"
                            data="manual">
                        
                            @foreach ($levels as $level)
                                @if ($level->account_type == 'buyer')
                                    <x-bladewind.select-item :label="$level->title" :value="$level->id" />
                                @endif
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('default_buyer_level')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('default_buyer_level') }}</p>
                    @enderror 

                </div>

                {{-- Default seller level --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->id()"
                            name="default_seller_level"
                            :selected_value="$default_seller_level"
                            :label="__('dashboard.t_default_new_sellers_level')"
                            :placeholder="__('messages.t_choose_level')"
                            data="manual">
                        
                            @foreach ($levels as $level)
                            @if ($level->account_type == 'seller')
                                <x-bladewind.select-item :label="$level->title" :value="$level->id" />
                            @endif
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('default_seller_level')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('default_seller_level') }}</p>
                    @enderror 

                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable facebook login --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_facebook_login"
                        name="is_facebook_login"
                        :label="__('messages.t_enable_facebook_login')"
                        label_position="right" />
                </div>

                {{-- Facebook client id --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_facebook_client_id')"
                        :placeholder="__('messages.t_enter_facebook_client_id')"
                        model="facebook_client_id"
                        icon="facebook-logo" />
                </div>

                {{-- Facebook client secret --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_facebook_client_secret')"
                        :placeholder="__('messages.t_enter_facebook_client_secret')"
                        model="facebook_client_secret"
                        icon="facebook-logo" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable twitter login --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_twitter_login"
                        name="is_twitter_login"
                        :label="__('messages.t_enable_twitter_login')"
                        label_position="right" />
                </div>

                {{-- Twitter client id --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_twitter_client_id')"
                        :placeholder="__('messages.t_enter_twitter_client_id')"
                        model="twitter_client_id"
                        icon="twitter-logo" />
                </div>

                {{-- Twitter client secret --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_twitter_client_secret')"
                        :placeholder="__('messages.t_enter_twitter_client_secret')"
                        model="twitter_client_secret"
                        icon="twitter-logo" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable google login --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_google_login"
                        name="is_google_login"
                        :label="__('messages.t_enable_google_login')"
                        label_position="right" />
                </div>

                {{-- Google client id --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_google_client_id')"
                        :placeholder="__('messages.t_enter_google_client_id')"
                        model="google_client_id"
                        icon="google-logo" />
                </div>

                {{-- Google client secret --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_google_client_secret')"
                        :placeholder="__('messages.t_enter_google_client_secret')"
                        model="google_client_secret"
                        icon="google-logo" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable github login --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_github_login"
                        name="is_github_login"
                        :label="__('messages.t_enable_github_login')"
                        label_position="right" />
                </div>

                {{-- Github client id --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_github_client_id')"
                        :placeholder="__('messages.t_enter_github_client_id')"
                        model="github_client_id"
                        icon="github-logo" />
                </div>

                {{-- Github client secret --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_github_client_secret')"
                        :placeholder="__('messages.t_enter_github_client_secret')"
                        model="github_client_secret"
                        icon="github-logo" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable linkedin login --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_linkedin_login"
                        name="is_linkedin_login"
                        :label="__('messages.t_enable_linkedin_login')"
                        label_position="right" />
                </div>

                {{-- Linkedin client id --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_linkedin_client_id')"
                        :placeholder="__('messages.t_enter_linkedin_client_id')"
                        model="linkedin_client_id"
                        icon="linkedin-logo" />
                </div>

                {{-- Linkedin client secret --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input
                        :label="__('messages.t_linkedin_client_secret')"
                        :placeholder="__('messages.t_enter_linkedin_client_secret')"
                        model="linkedin_client_secret"
                        icon="linkedin-logo" />
                </div>
                
            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                @lang('messages.t_update')
            </x-bladewind.button>
        </div>
            
	</x-form>
</div>