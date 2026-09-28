<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-slideshow"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_hero_section_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_hero_section_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Enable background image --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_bg_img"
                        name="enable_bg_img"
                        :label="__('messages.t_enable_hero_section_background_img')"
                        label_position="right" />
                </div>

                {{-- Large screen background --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('hero')->background_large) ? src(settings('hero')->background_large) : ''"
                        name="bg_large"
                        :placeholder="__('messages.t_large_screen_background_img')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Medium screen background --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('hero')->background_medium) ? src(settings('hero')->background_medium) : ''"
                        name="bg_medium"
                        :placeholder="__('messages.t_medium_screen_background_img')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Small screen background --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('hero')->background_small) ? src(settings('hero')->background_small) : ''"
                        name="bg_small"
                        :placeholder="__('messages.t_small_screen_background_img')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Hero section default background color --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_hero_section_default_bg_color')"
                        :placeholder="__('messages.t_enter_color_hex_color_example')"
                        model="bg_color"
                        icon="palette" />
                </div>

                {{-- Hero section large screen height --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('messages.t_large_screen_height')"
                        :placeholder="__('messages.t_enter_value_in_pixel')"
                        model="bg_large_height"
                        icon="ruler" />
                </div>

                {{-- Hero section small screen height --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('messages.t_small_screen_height')"
                        :placeholder="__('messages.t_enter_value_in_pixel')"
                        model="bg_small_height"
                        icon="ruler" />
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