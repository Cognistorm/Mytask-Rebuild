<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="create" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-globe"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_create_language')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_create_language_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- language name --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_language_name')"
                        :placeholder="__('messages.t_enter_language_name')"
                        model="name"
                        icon="translate" />
                </div>

                {{-- Language code --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_language_code')"
                        :placeholder="__('messages.t_enter_language_code')"
                        :hint="__('dashboard.t_lang_code_hint')"
                        model="language_code"
                        icon="globe-stand" />
                </div>

                {{-- Country code --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_country_code')"
                        :placeholder="__('messages.t_enter_country_code')"
                        :hint="__('dashboard.t_lang_country_code_hint')"
                        model="country_code"
                        icon="flag" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Language status --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_active"
                        name="is_active"
                        :label="__('messages.t_enable_this_language')"
                        label_position="right" />
                </div>

                {{-- Language direction --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$force_rtl"
                        name="force_rtl"
                        :label="__('messages.t_force_rtl_for_this_language')"
                        label_position="right" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-purple-700 bg-purple-100">
                        <div class="flex items-center gap-x-3">
                            <i class="ph-duotone ph-warning-octagon text-xl"></i>
                            <h3 class="font-semibold grow text-xs leading-5">
                                Choose default locale to format dates and time in backend (PHP). For example:<br> <b>English</b> (en_US) 13 hours ago <br> <b>French</b> (fr_FR) il y a 13 heures
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Backend timing locale --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->__id"
                            name="backend_timing_locale"
                            :selected_value="$backend_timing_locale"
                            :label="__('messages.t_backend_time_locale')"
                            :placeholder="__('messages.t_choose_default_locale')"
                            data="manual">
                        
                            @foreach (config('carbon-locales') as $value => $text)
                                <x-bladewind.select-item :label="$text" :value="$value" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('backend_timing_locale')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('backend_timing_locale') }}</p>
                    @enderror 

                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-purple-700 bg-purple-100">
                        <div class="flex items-center gap-x-3">
                            <i class="ph-duotone ph-warning-octagon text-xl"></i>
                            <h3 class="font-semibold grow text-xs leading-5">
                                Choose default locale to format dates and time in frontend (Javascript). For example:<br> <b>English</b> (en) 13 hours ago <br> <b>French</b> (fr) il y a 13 heures
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Frontend timing locale --}}
                <div class="col-span-12">

                    {{-- Get locales data --}}
                    @php
                        $frontend_locales = ["en","af","ar-dz","ar-kw","ar-ly","ar-ma","ar-sa","ar-tn","ar","az","be","bg","bm","bn-bd","bn","bo","br","bs","ca","cs","cv","cy","da","de-at","de-ch","de","dv","el","en-au","en-ca","en-gb","en-ie","en-il","en-in","en-nz","en-sg","eo","es-do","es-mx","es-us","es","et","eu","fa","fi","fil","fo","fr-ca","fr-ch","fr","fy","ga","gd","gl","gom-deva","gom-latn","gu","he","hi","hr","hu","hy-am","id","is","it-ch","it","ja","jv","ka","kk","km","kn","ko","ku","ky","lb","lo","lt","lv","me","mi","mk","ml","mn","mr","ms-my","ms","mt","my","nb","ne","nl-be","nl","nn","oc-lnc","pa-in","pl","pt-br","pt","ro","ru","sd","se","si","sk","sl","sq","sr-cyrl","sr","ss","sv","sw","ta","te","tet","tg","th","tk","tl-ph","tlh","tr","tzl","tzm-latn","tzm","ug-cn","uk","ur","uz-latn","uz","vi","x-pseudo","yo","zh-cn","zh-hk","zh-mo","zh-tw"];
                    @endphp

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->__id"
                            name="frontend_timing_locale"
                            :selected_value="$frontend_timing_locale"
                            :label="__('messages.t_frontend_time_locale')"
                            :placeholder="__('messages.t_choose_default_locale')"
                            data="manual">
                        
                            @foreach ($frontend_locales as $locale)
                                <x-bladewind.select-item :label="$locale" :value="$locale" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('frontend_timing_locale')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('frontend_timing_locale') }}</p>
                    @enderror 

                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-red-700 bg-red-100">
                        <div class="flex items-center gap-x-3">
                            <i class="ph-fill ph-seal-warning text-xl"></i>
                            <h3 class="font-semibold grow text-xs leading-5">
                                @lang('dashboard.t_i_will_indentation_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Screenshots --}}
                <div class="col-span-12">
                    <a href="https://i.postimg.cc/9FGnW3mR/Screenshot-3.png">
                        <img src="https://i.postimg.cc/9FGnW3mR/Screenshot-3.png" alt="Image" class="max-w-full border-2 rounded-2xl mb-3 border-slate-100 shadow-sm">
                    </a>
                    <a href="https://i.postimg.cc/sgs0xnxn/Screenshot-4.png">
                        <img src="https://i.postimg.cc/sgs0xnxn/Screenshot-4.png" alt="Image" class="max-w-full border-2 rounded-2xl mb-3 border-slate-100 shadow-sm">
                    </a>
                    <a href="https://i.postimg.cc/Bnp7Kx1J/Screenshot-5.png">
                        <img src="https://i.postimg.cc/Bnp7Kx1J/Screenshot-5.png" alt="Image" class="max-w-full border-2 rounded-2xl mb-3 border-slate-100 shadow-sm">
                    </a>
                </div>

                {{-- I will indentation --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_i_will_indentation')"
                        :placeholder="__('messages.t_enter_value_in_pixel')"
                        model="i_will_indentation"
                        icon="text-indent" />
                </div>
                
            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                @lang('messages.t_create')
            </x-bladewind.button>
        </div>
            
	</x-form>
</div>