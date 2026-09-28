<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-pencil"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('dashboard.t_edit_attribute')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_create_attribute_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Available languages --}}
                <div class="col-span-12">
                    <div class="flex flex-col space-y-2 sm:space-y-3 lg:space-y-4 divide-y divide-slate-100 dark:divide-zinc-700">
                        @foreach (supported_languages() as $lang)

                            {{-- Translation container --}}
                            <div x-data="{ expanded: false }" class="bg-transparent font-medium" wire:key="translation-language-{{ $lang->id }}">
    
                                {{-- Language header --}}
                                <div class="flex w-full items-center gap-2 {{ !$loop->first ? 'pt-4' : '' }}">

                                    {{-- Flag --}}
                                    <div class="bg-transparent border-2 border-slate-200 dark:border-zinc-600 flex h-11 items-center justify-center relative rounded-full shrink-0 w-11">
                                        <img src="{{ asset('img/flags/rounded/'. $lang->country_code .'.svg') }}" alt="{{ $lang->name }}" class="h-8 w-8 rounded-full">
                                    </div>

                                    {{-- Name --}}
                                    <div>

                                        {{-- Lang name --}}
                                        <p class="text-xs+ font-bold tracking-wide text-zinc-600 dark:text-gray-200" tag="h3">
                                            {{ $lang->name }}
                                        </p>

                                        {{-- Description --}}
                                        <p class="text-xs mt-0.5 text-slate-400 dark:text-gray-400">
                                            @lang('dashboard.t_create_new_record_in_language_name', ['language' => strtolower($lang->name)])
                                        </p>

                                    </div>

                                    {{-- Edit --}}
                                    <div class="ms-auto">
                                        <button @click="expanded = !expanded" type="button" class="border border-slate-300 dark:border-zinc-600 dark:text-zinc-400 duration-100 ease-in flex h-10 hover:border-2 items-center justify-center rounded-full text-slate-400 transition-all w-10">
                                            <i class="ph-duotone ph-pencil-simple text-lg"></i>
                                        </button>
                                    </div>

                                </div>
    
                                {{-- Language body --}}
                                <div x-collapse x-show="expanded">
                                    <div class="grid grid-cols-12 md:gap-x-6 gap-y-5 mb-6 px-4 py-7 sm:px-5">
    
                                        {{-- Name --}}
                                        <div class="col-span-12">
                                            <x-forms.text-input required
                                                label="{{ __('dashboard.t_attribute_name') }} ({{ strtolower($lang->language_code) }})" 
                                                placeholder="{{ __('dashboard.t_enter_attribute_name') }}" 
                                                model="name.{{ $lang->language_code }}"
                                                icon="textbox" />
                                        </div>
    
                                        {{-- Description --}}
                                        <div class="col-span-12">
                                            <x-forms.textarea
                                                label="{{ __('messages.t_description') }} ({{ strtolower($lang->language_code) }})" 
                                                placeholder="{{ __('dashboard.t_html_tags_allowed') }}" 
                                                model="description.{{ $lang->language_code }}"
                                                :hint="__('dashboard.t_attribute_description_explain_hint')"
                                                icon="article"
                                                rows="7" />
                                        </div>

                                        {{-- Hint --}}
                                        <div class="col-span-12">
                                            <x-forms.text-input
                                                label="{{ __('dashboard.t_attribute_hint') }} ({{ strtolower($lang->language_code) }})" 
                                                placeholder="{{ __('dashboard.t_enter_attribute_hint') }}" 
                                                model="hint.{{ $lang->language_code }}"
                                                icon="info" />
                                        </div>
    
                                    </div>
                                </div>
    
                            </div>

                        @endforeach
                    </div>

                    {{-- Error --}}
                    @if ($errors->has('name.*'))
                        <span class="block mt-4 text-red-500 text-xs">@lang('messages.t_toast_something_went_wrong')</span>
                    @endif

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
                                @lang('dashboard.t_select_category_create_attribute_hint')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Category --}}
                <div class="col-span-12">
                    <x-forms.select-simple required live
                        model="category_id"
                        :label="__('messages.t_category')"
                        :placeholder="__('dashboard.t_select_category')">
                        <x-slot:options>
                            @foreach ($categories as $category)
                                <option value="{{ $category->id }}">{{ $category->name }}</option>
                            @endforeach
                        </x-slot:options>
                    </x-forms.select-simple>
                </div>

                {{-- Subcategory --}}
                <div class="col-span-12">
                    <x-forms.select-simple live
                        model="subcategory_id"
                        :label="__('messages.t_subcategory')"
                        :placeholder="__('dashboard.t_select_subcategory')"
                        :disabled="count($subcategories) == 0">
                        <x-slot:options>
                            @foreach ($subcategories as $subcategory)
                                <option value="{{ $subcategory->id }}">{{ $subcategory->name }}</option>
                            @endforeach
                        </x-slot:options>
                    </x-forms.select-simple>
                </div>

                {{-- Childcategory --}}
                <div class="col-span-12">
                    <x-forms.select-simple
                        model="childcategory_id"
                        :label="__('dashboard.t_childcategory')"
                        :placeholder="__('dashboard.t_select_childcategory')"
                        :disabled="count($childcategories) == 0">
                        <x-slot:options>
                            @foreach ($childcategories as $childcategory)
                                <option value="{{ $childcategory->id }}">{{ $childcategory->name }}</option>
                            @endforeach
                        </x-slot:options>
                    </x-forms.select-simple>
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
                                @lang('dashboard.t_select_attribute_type_hint')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Type --}}
                <div class="col-span-12">
                    <x-forms.radio required live
                        model="type"
                        :label="__('dashboard.t_attribute_type')"
                        :options="[
                            ['text' => __('dashboard.t_select_element'), 'value' => 'select'],
                            ['text' => __('dashboard.t_checkbox_element'), 'value' => 'checkbox']
                        ]" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Required --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_required"
                        name="is_required"
                        :label="__('dashboard.t_is_attribute_required_by_default')"
                        label_position="right" />
                </div>

                {{-- Check if attribute type is a checkbox --}}
                @if ($type === "checkbox")
                    
                    {{-- Checked --}}
                    <div class="col-span-12">
                        <x-bladewind.toggle
                            :checked="$is_checked"
                            name="is_checked"
                            :label="__('dashboard.t_is_attribute_checkbox_checked_by_default')"
                            label_position="right" />
                    </div>

                    {{-- Disabled --}}
                    <div class="col-span-12">
                        <x-bladewind.toggle
                            :checked="$is_disabled"
                            name="is_disabled"
                            :label="__('dashboard.t_is_attribute_checkbox_disabled_by_default')"
                            label_position="right" />
                    </div>

                @endif

                {{-- Check if attribute type is a select --}}
                @if ($type === "select")
                    
                    {{-- Divider --}}
                    <div class="col-span-12 -mx-4 sm:-mx-10">
                        <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                    </div>

                    {{-- Add new option --}}
                    <div class="col-span-12">
                        <div class="flex gap-2 items-center w-full bg-white border rounded-lg px-4 py-2.5 shadow-sm border-slate-200 dark:bg-zinc-900 dark:border-transparent dark:shadow-none">
                            <div class="bg-slate-100 flex h-11 items-center justify-center rounded-full text-gray-500 w-11 dark:bg-zinc-700 dark:text-zinc-300">
                                <i class="ph-duotone ph-selection-plus w-5 h-5 text-xl flex items-center justify-center"></i>
                            </div>
                            <div>
                                <p class="text-xs+ font-bold tracking-wide text-zinc-600 dark:text-gray-200" tag="h3">
                                    @lang('dashboard.t_new_option')
                                </p>
                                <p class="text-xs mt-0.5 text-slate-400 dark:text-gray-400">
                                    @lang('dashboard.t_new_option_select_subtitle')
                                </p>
                            </div>
                            <div class="ms-auto">
                                <button wire:click="addOption" type="button" class="border-2 rounded-full flex items-center justify-center text-slate-400 border-slate-100 hover:bg-slate-100 hover:text-slate-500 transition-all duration-150 ease-in w-8 h-8 dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 dark:text-zinc-300">
                                    <i class="ph ph-plus w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    {{-- Error when options field is empty --}}
                    @if ($errors->has('options') && count($options) == 0)
                        <div class="col-span-12">
                            <div class="py-2.5 px-3 rounded text-red-700 bg-red-100">
                                <div class="flex items-center gap-x-3">
                                    <i class="ph-duotone ph-siren text-xl"></i>
                                    <h3 class="font-semibold grow text-xs leading-5">
                                        @lang('dashboard.t_attribute_options_empty_error_msg')
                                    </h3>
                                </div>
                            </div>
                        </div>
                    @endif

                    {{-- List of options --}}
                    @if (is_array($options) && count($options))

                        {{-- Alert --}}
                        <div class="col-span-12">
                            <div class="py-2.5 px-3 rounded text-amber-700 bg-amber-100">
                                <div class="flex items-center gap-x-3">
                                    <i class="ph-duotone ph-warning text-xl"></i>
                                    <h3 class="font-semibold grow text-xs leading-5">
                                        @lang('dashboard.t_option_value_attribute_only_alphanumeric_alert')
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {{-- List --}}
                        <div class="col-span-12">
                            <div class="w-full divide-y dark:divide-zinc-700 space-y-6">
                                @foreach (array_reverse($options) as $key => $option)
                                    <div wire:key="attributes-select-option-id-{{ $key }}" class="grid grid-cols-12 md:gap-x-8 gap-y-4 {{ $loop->first ? '' : 'pt-5' }}">

                                        {{-- Text --}}
                                        <div class="col-span-12 md:col-span-6">
                                            <x-forms.text-input required
                                                :label="__('dashboard.t_option_text')"
                                                model="options.{{ $key }}.text"
                                                icon="textbox" />
                                        </div>
                        
                                        {{-- Value --}}
                                        <div class="col-span-12 md:col-span-6">
                                            <x-forms.text-input required
                                                :label="__('dashboard.t_option_value')"
                                                model="options.{{ $key }}.value"
                                                icon="list-bullets" />
                                        </div>

                                        {{-- Delete --}}
                                        <div class="col-span-12 !-mt-1">
                                            <button wire:click="deleteOption({{ $key }})" type="button" class="bg-red-600 font-light hover:bg-red-700 inline-flex items-center px-4 py-2 rounded-full text-[11px] text-white tracking-widest uppercase">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ltr:mr-2 rtl:ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                @lang('messages.t_delete')
                                            </button>
                                        </div>
                                        
                                    </div>
                                @endforeach
                            </div>
                        </div>

                    @endif

                @endif
                
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
