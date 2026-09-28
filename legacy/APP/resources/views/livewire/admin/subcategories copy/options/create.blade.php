<div class="mx-auto w-full max-w-3xl" x-data x-cloak>

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Form --}}
    <x-form has-files wire:submit="create">
        <div class="card">

            {{-- Section title --}}
            <div class="border-gray-100 dark:border-zinc-700 flex items-center justify-between gap-4 border-b px-10 py-5 dark:bg-transparent rounded-t-md bg-white">

                {{-- Title --}}
                <div>
                    <h3 class="text-sm+ leading-6 font-bold text-gray-900 dark:text-white"> @lang('messages.t_create_subcategory') </h3>
                    <p class="text-xs font-normal leading-normal text-gray-400 dark:text-zinc-400 tracking-wide">
                        @lang('messages.t_create_subcategory_subtitle')
                    </p>
                </div>

                {{-- Actions --}}
                <div class="ms-auto flex items-center gap-2">

                    {{-- Cancel --}}
                    <a wire:navigate href="{{ admin_url('subcategories') }}" class="btn p-2.5 hover:shadow-none ring-slate-300 dark:ring-zinc-600 space-x-2 rtl:space-x-reverse border">
                        <i class="ph-duotone ph-arrow-left text-lg"></i>
                        <span>@lang('messages.t_cancel')</span>
                    </a>

                </div>

            </div>

            {{-- Section body --}}
            <div class="px-10 py-8 grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Available languages --}}
                <div class="col-span-12">
                    <div class="flex flex-col space-y-2 sm:space-y-3 lg:space-y-4">
                        @foreach (supported_languages() as $lang)

                            {{-- Translation container --}}
                            <div x-data="{ expanded: false }" class="overflow-hidden rounded-md bg-gray-50 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700" wire:key="translation-language-{{ $lang->id }}">
    
                                {{-- Language header --}}
                                <div class="flex items-center justify-between px-4 py-3 sm:px-5" :class="expanded ? 'bg-gray-100 dark:bg-zinc-500' : ''">
    
                                    {{-- Language --}}
                                    <div class="flex items-center space-x-2 rtl:space-x-reverse tracking-wide outline-none">
                                        <img class="h-3" src="{{ asset('img/flags/'. $lang->country_code .'.svg') }}" alt="{{ $lang->name }}" />
                                        <p class="text-slate-700 line-clamp-1 dark:text-zinc-100 text-xs+ font-semibold">
                                            {{ $lang->name }}
                                        </p>
                                    </div>
    
                                    {{-- Edit --}}
                                    <button type="button" @click="expanded = !expanded" class="flex items-center justify-center text-zinc-500 dark:text-zinc-300">
                                        <i class="ph-duotone ph-pencil-simple text-lg"></i>
                                    </button>
    
                                </div>
    
                                {{-- Language body --}}
                                <div x-collapse x-show="expanded">
                                    <div class="grid grid-cols-12 md:gap-x-6 gap-y-5 mb-6 px-4 py-7 sm:px-5">
    
                                        {{-- Name --}}
                                        <div class="col-span-12">
                                            <x-forms.text-input
                                                label="{{ __('messages.t_subcategory_name') }} ({{ strtoupper($lang->language_code) }})" 
                                                placeholder="{{ __('messages.t_enter_subcategory_name') }}" 
                                                model="name.{{ $lang->language_code }}"
                                                icon="text-italic" />
                                        </div>
    
                                        {{-- Top content --}}
                                        <div class="col-span-12">
                                            <x-forms.textarea
                                                label="{{ __('dashboard.t_top_custom_content') }} ({{ strtoupper($lang->language_code) }})" 
                                                placeholder="{{ __('dashboard.t_html_tags_allowed') }}" 
                                                model="content_top.{{ $lang->language_code }}"
                                                icon="code-block"
                                                rows="7" />
                                        </div>
    
                                        {{-- Bottom content --}}
                                        <div class="col-span-12">
                                            <x-forms.textarea
                                                label="{{ __('dashboard.t_bottom_custom_content') }} ({{ strtoupper($lang->language_code) }})" 
                                                placeholder="{{ __('dashboard.t_html_tags_allowed') }}" 
                                                model="content_bottom.{{ $lang->language_code }}"
                                                icon="code-block"
                                                rows="7" />
                                        </div>
    
                                    </div>
                                </div>
    
                            </div>

                            {{-- Error --}}
                            @error('name.' . $lang->language_code)
                                <span class="!mt-1.5 text-xs text-red-500">@lang('messages.t_toast_something_went_wrong')</span>
                            @endif

                        @endforeach
                    </div>
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Parent category --}}
                <div class="col-span-12">
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select
                            :component-id="$this->__id"
                            label_key="name"
                            value_key="id"
                            name="parent_id"
                            :label="__('messages.t_parent_category')"
                            :placeholder="__('messages.t_choose_parent_category')"
                            :data="$categories"
                            searchable />
                    </div>
                    {{-- Error --}}  
                    @error('parent_id')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('parent_id') }}</p>
                    @enderror          
                </div>

                {{-- Subcategory slug --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        label="{{ __('messages.t_subcategory_slug') }}" 
                        placeholder="{{ __('messages.t_enter_subcategory_slug') }}" 
                        model="slug"
                        icon="link" />
                </div>

                {{-- Seo description --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        label="{{ __('messages.t_description') }}" 
                        placeholder="{{ __('messages.t_enter_description') }}" 
                        model="description"
                        icon="book-open-text"
                        rows="7" />
                </div>

                {{-- Subcategory icon --}}
                <div class="col-span-12 lg:col-span-6" wire:ignore>
                    <x-bladewind.filepicker
                        name="icon"
                        :placeholder="__('messages.t_subcategory_icon')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />               
                </div>

                {{-- Subcategory image --}}
                <div class="col-span-12 lg:col-span-6" wire:ignore>
                    <x-bladewind.filepicker
                        name="image"
                        :placeholder="__('messages.t_subcategory_image')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

            </div>
            
            {{-- Section footer --}}
            <div class="py-4 px-4 flex justify-end sm:px-10 bg-slate-50 rounded-bl-md rounded-br-lg border-t dark:bg-zinc-900 dark:border-zinc-700">
                <x-bladewind.button
                    size="small"
                    can_submit="true"
                    class="mx-auto block">
                    {{ __('messages.t_create') }}
                </x-bladewind.button>
            </div> 

        </div>
    </x-form>

</div>