<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-align-top"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_footer_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_footer_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Enable language switcher --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_language_switcher"
                        name="is_language_switcher"
                        :label="__('dashboard.t_enable_language_switcher')"
                        label_position="right" />
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs">
                                @lang('dashboard.t_go_to_pages_section_to_create_new_pages')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Terms of service page --}}
                <div class="col-span-12 md:col-span-6">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="page_terms"
                            :selected_value="$page_terms"
                            :label="__('messages.t_terms_page')"
                            :placeholder="__('messages.t_choose_terms_page')"
                            data="manual">
                        
                            @foreach ($pages as $page)
                                <x-bladewind.select-item :label="$page->title" :value="$page->id" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('page_terms')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('page_terms') }}</p>
                    @enderror 

                </div>

                {{-- Privacy policy page --}}
                <div class="col-span-12 md:col-span-6">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="page_policy"
                            :selected_value="$page_policy"
                            :label="__('messages.t_privacy_policy_page')"
                            :placeholder="__('messages.t_choose_privacy_policy_page')"
                            data="manual">
                        
                            @foreach ($pages as $page)
                                <x-bladewind.select-item :label="$page->title" :value="$page->id" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('page_policy')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('page_policy') }}</p>
                    @enderror 

                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Footer logo --}}
                <div class="col-span-12 md:col-span-6" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('footer')->logo) ? src(settings('footer')->logo) : ''"
                        name="logo"
                        :placeholder="__('messages.t_footer_logo')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Footer logo for dark mode --}}
                <div class="col-span-12 md:col-span-6" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('footer')->logo_dark) ? src(settings('footer')->logo_dark) : ''"
                        name="logo_dark"
                        :placeholder="__('dashboard.t_dark_mode_footer_logo')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Copyrights --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        :label="__('messages.t_copyrights')"
                        :placeholder="__('messages.t_enter_copyrights_html_supported')"
                        model="copyrights"
                        :rows="6"
                        icon="copyright" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Facebook page --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_facebook_page')"
                        :placeholder="__('messages.t_enter_facebook_page_link')"
                        model="social_facebook"
                        icon="facebook-logo" />
                </div>

                {{-- Twitter page --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_twitter_page')"
                        :placeholder="__('messages.t_enter_twitter_page_link')"
                        model="social_twitter"
                        icon="twitter-logo" />
                </div>

                {{-- Instagram page --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_instagram_page')"
                        :placeholder="__('messages.t_enter_instagram_page_link')"
                        model="social_instagram"
                        icon="instagram-logo" />
                </div>

                {{-- Linkedin page --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_linkedin_page')"
                        :placeholder="__('messages.t_enter_linkedin_page_link')"
                        model="social_linkedin"
                        icon="linkedin-logo" />
                </div>

                {{-- Pinterest page --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_pinterest_page')"
                        :placeholder="__('messages.t_enter_pinterest_page_link')"
                        model="social_pinterest"
                        icon="pinterest-logo" />
                </div>

                {{-- Youtube page --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_youtube_page')"
                        :placeholder="__('messages.t_enter_youtube_page_link')"
                        model="social_youtube"
                        icon="youtube-logo" />
                </div>

                {{-- Github page --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_github_page')"
                        :placeholder="__('messages.t_enter_github_page_link')"
                        model="social_github"
                        icon="github-logo" />
                </div>

                {{-- WeChat --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_wechat')"
                        placeholder="https://www.wechat.com"
                        model="social_wechat"
                        icon="wechat-logo" />
                </div>

                {{-- Tiktok --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_tiktok')"
                        placeholder="https://www.tiktok.com"
                        model="social_tiktok"
                        icon="tiktok-logo" />
                </div>

                {{-- Snapchat --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_snapchat')"
                        placeholder="https://www.snapchat.com"
                        model="social_snapchat"
                        icon="snapchat-logo" />
                </div>

                {{-- Whatsapp --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_whatsapp')"
                        placeholder="https://www.whatsapp.com"
                        model="social_whatsapp"
                        icon="whatsapp-logo" />
                </div>

                {{-- Sina Weibo --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_sinaweibo')"
                        placeholder="https://www.weibo.com"
                        model="social_sinaweibo"
                        icon="link" />
                </div>

                {{-- Telegram --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_telegram')"
                        placeholder="https://www.telegram.com"
                        model="social_telegram"
                        icon="telegram-logo" />
                </div>

                {{-- Vk --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_vk')"
                        placeholder="https://www.vk.com"
                        model="social_vk"
                        icon="link" />
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