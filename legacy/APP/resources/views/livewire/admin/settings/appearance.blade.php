<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-paint-roller"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_appearance_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_appreance_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Primary color --}}
                <div class="col-span-12" wire:ignore>
                    <x-forms.color-picker required
                        :label="__('messages.t_primary_color')"
                        model="primary_color" />
                </div>

                {{-- Enable theme switcher --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_theme_switcher"
                        name="is_theme_switcher"
                        :label="__('messages.t_enable_theme_switcher')"
                        label_position="right" />
                </div>

                {{-- Enable featured categories --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_featured_categories"
                        name="is_featured_categories"
                        :label="__('messages.t_show_featured_categories')"
                        label_position="right" />
                </div>

                {{-- Enable best freelancers --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_best_sellers"
                        name="is_best_sellers"
                        :label="__('messages.t_show_best_sellers')"
                        label_position="right" />
                </div>

                {{-- Default theme --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="default_theme"
                            :selected_value="$default_theme"
                            :label="__('messages.t_default_theme')"
                            :placeholder="__('messages.t_default_theme')"
                            data="manual">
                        
                            {{-- Dark --}}
                            <x-bladewind.select-item :label="__('messages.t_dark')" value="dark" />

                            {{-- Light --}}
                            <x-bladewind.select-item :label="__('messages.t_light')" value="light" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('default_theme')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('default_theme') }}</p>
                    @enderror 

                </div>

                {{-- Logo height --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_logo_height')"
                        :placeholder="__('messages.t_enter_logo_height')"
                        model="logo_desktop_height"
                        :hint="__('messages.t_logo_height_hint')"
                        icon="ruler" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Custom fonts --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('messages.t_custom_google_fonts_html')"
                        :placeholder="__('messages.t_enter_links_from_google_fonts')"
                        model="font_link"
                        icon="google-logo"
                        :rows="8"
                        hint="e.g: <link href='https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap' rel='stylesheet'>" />
                </div>

                {{-- Font name --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_font_name')"
                        :placeholder="__('messages.t_enter_font_name')"
                        model="font_family"
                        icon="text-aa"
                        :hint="__('messages.t_font_family_hint')" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Default image --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="!empty(settings('appearance')->placeholder) ? src(settings('appearance')->placeholder) : ''"
                        name="placeholder_img"
                        :placeholder="__('messages.t_upload_default_image')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs">
                                @lang('dashboard.t_frontend_custom_codes_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Frontend custom head code --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        label="Frontend custom head code"
                        placeholder="HTML tags allowed"
                        model="custom_code_head_main_layout"
                        icon="code-block"
                        :rows="12"
                        hint="Custom code before </head>" />
                </div>

                {{-- Frontend custom footer code --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        label="Frontend custom footer code"
                        placeholder="HTML tags allowed"
                        model="custom_code_footer_main_layout"
                        icon="code-block"
                        :rows="12"
                        hint="Custom code before </body>" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs">
                                @lang('dashboard.t_frontend_freelancer_custom_codes_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Freelancer dashboard custom head code --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        label="Freelancer dashboard custom head code"
                        placeholder="HTML tags allowed"
                        model="custom_code_head_freelancer_layout"
                        icon="code-block"
                        :rows="12"
                        hint="Custom code before </head>" />
                </div>

                {{-- Freelancer dashboard custom footer code --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        label="Freelancer dashboard custom footer code"
                        placeholder="HTML tags allowed"
                        model="custom_code_footer_freelancer_layout"
                        icon="code-block"
                        :rows="12"
                        hint="Custom code before </body>" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs">
                                @lang('dashboard.t_backend_custom_codes_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Admin dashboard custom head code --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        label="Admin dashboard custom head code"
                        placeholder="HTML tags allowed"
                        model="custom_code_head_admin_layout"
                        icon="code-block"
                        :rows="12"
                        hint="Custom code before </head>" />
                </div>

                {{-- Admin dashboard custom footer code --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        label="Admin dashboard custom footer code"
                        placeholder="HTML tags allowed"
                        model="custom_code_footer_admin_layout"
                        icon="code-block"
                        :rows="12"
                        hint="Custom code before </body>" />
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

@push('scripts')

    {{-- Color Picker --}}
    <script src="{{ asset('js/plugins/coloris/dist/coloris.min.js') }}"></script>
    <script>
        document.querySelectorAll('.color-picker-input').forEach(input => {
            Coloris({
                el   : '#' + input.id,
                theme: 'large'
            });
        });
    </script>
    
    {{-- AlpineJs --}}
    <script>
        function fweXqTeRXrFVxql() {
            return {

                selected: 'sliders'

            }
        }
        window.fweXqTeRXrFVxql = fweXqTeRXrFVxql();
    </script>

@endpush

@push('styles')
    
    {{-- Color picker --}}
    <link rel="stylesheet" href="{{ asset('js/plugins/coloris/dist/coloris.min.css') }}"/>

@endpush