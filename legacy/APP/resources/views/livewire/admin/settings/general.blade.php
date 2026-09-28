<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-gear"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_general_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_general_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Title --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_site_title')"
                        :placeholder="__('messages.t_enter_site_title')"
                        model="title"
                        icon="text-aa" />
                </div>

                {{-- Title separator --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_site_title_separator')"
                        :placeholder="__('messages.t_enter_site_title_separator')"
                        model="separator"
                        icon="minus" />
                </div>

                {{-- Site subtitle --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_site_subtitle')"
                        :placeholder="__('messages.t_enter_site_subtitle')"
                        model="subtitle"
                        icon="subtitles" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Light logo --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('general')->logo) ? src(settings('general')->logo) : ''"
                        name="logo"
                        :placeholder="__('messages.t_site_logo')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Site Logo dark mode --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('general')->logo_dark) ? src(settings('general')->logo_dark) : ''"
                        name="logo_dark"
                        :placeholder="__('messages.t_site_logo_dark_mode')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Site Logo transparent header --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('general')->logo_transparent) ? src(settings('general')->logo_transparent) : ''"
                        name="logo_transparent"
                        :placeholder="__('dashboard.t_site_logo_transparent_header')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Site Favicon --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('general')->favicon) ? src(settings('general')->favicon) : ''"
                        name="favicon"
                        :placeholder="__('messages.t_site_favicon')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- top navbar announce text --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_top_navbar_announce_text')"
                        :placeholder="__('messages.t_enter_top_navbar_announce_text')"
                        model="announce_text"
                        icon="megaphone" />
                </div>

                {{-- top navbar announce link --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_top_navbar_announce_link')"
                        :placeholder="__('messages.t_enter_top_navbar_announce_link')"
                        model="announce_link"
                        icon="link" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Default language --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->__id"
                            name="default_language"
                            :selected_value="$default_language"
                            :label="__('messages.t_default_language')"
                            :placeholder="__('messages.t_choose_default_language')"
                            data="manual">
                        
                            @foreach ($languages as $language)
                                <x-bladewind.select-item :label="$language->name" :value="$language->language_code" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('default_language')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('default_language') }}</p>
                    @enderror 

                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable multi-vendor --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_multivendor"
                        name="enable_multivendor"
                        :label="__('dashboard.t_enable_multivendor')"
                        label_position="right" />
                </div>

                {{-- Become a freelancer requires approval --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$freelancer_requires_approval"
                        name="freelancer_requires_approval"
                        :label="__('dashboard.t_become_freelancer_requires_approval')"
                        label_position="right" />
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