<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-list-magnifying-glass"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_seo_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_seo_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Description --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        :label="__('messages.t_seo_description')"
                        :placeholder="__('messages.t_enter_description')"
                        model="description"
                        rows="8"
                        icon="google-logo" />
                </div>

                {{-- Keywords --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        :label="__('dashboard.t_keywords')"
                        :placeholder="__('dashboard.t_separate_each_keyword_with_comma')"
                        model="keywords"
                        rows="4"
                        icon="textbox" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Facebook app id --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_facebook_app_id')"
                        :placeholder="__('messages.t_enter_facebook_app_id')"
                        model="facebook_app_id"
                        icon="facebook-logo" />
                </div>

                {{-- Facebook page id --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_facebook_page_id')"
                        :placeholder="__('messages.t_enter_facebook_page_id')"
                        model="facebook_page_id"
                        icon="facebook-logo" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Twitter username --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_twitter_username')"
                        :placeholder="__('messages.t_enter_twitter_username')"
                        model="twitter_username"
                        icon="twitter-logo" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Og Image --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('seo')->ogimage) ? src(settings('seo')->ogimage) : ''"
                        name="ogimage"
                        :placeholder="__('messages.t_social_media_ogimage')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable site map --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_sitemap"
                        name="is_sitemap"
                        :label="__('messages.t_enable_sitemap')"
                        label_position="right" />
                </div>

                {{-- Generate sitemap --}}
                <div class="col-span-12">
                    <div class="flex items-center space-x-4 rtl:space-x-reverse text-xs">

                        {{-- Generate sitemap --}}
                        @if (settings('seo')->is_sitemap)
                            <button wire:click="generateSitemap" type="button" class="text-gray-400 hover:text-black hover:underline">
                                @lang('dashboard.t_generate_sitemap')    
                            </button>    
                        @endif
    
                        {{-- Sitemap link --}}
                        @if (\File::exists(base_path('sitemap.xml')))
                            <a href="{{ url('sitemap.xml') }}" target="_blank" class="text-gray-400 hover:text-black hover:underline">
                                @lang('dashboard.t_view_sitemap')
                            </a>
                        @endif

                    </div>
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