<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="create" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-note-blank"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_create_article')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_create_update_article_subtitle')
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
    
                                        {{-- Title --}}
                                        <div class="col-span-12">
                                            <x-forms.text-input required
                                                label="{{ __('messages.t_title') }} ({{ strtolower($lang->language_code) }})" 
                                                placeholder="{{ __('messages.t_enter_title') }}" 
                                                model="title.{{ $lang->language_code }}"
                                                icon="text-italic" />
                                        </div>
    
                                        {{-- Content --}}
                                        <div class="col-span-12">
                                            <x-forms.tinymce
                                                id="content-{{ $lang->language_code }}"
                                                model="content.{{ $lang->language_code }}" />
                                        </div>
    
                                    </div>
                                </div>
    
                            </div>

                            {{-- Error --}}
                            @error('title.' . $lang->language_code)
                                <span class="!mt-1.5 text-xs text-red-500">@lang('messages.t_toast_something_went_wrong')</span>
                            @endif

                        @endforeach
                    </div>
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Article slug --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_slug')"
                        :placeholder="__('messages.t_enter_slug')"
                        model="slug"
                        icon="link" />
                </div>

                {{-- Seo description --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_seo_description')"
                        :placeholder="__('messages.t_enter_description_for_seo')"
                        model="seo_description"
                        icon="google-logo" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Post preview image --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker required
                        name="image"
                        :placeholder="__('messages.t_article_image')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
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