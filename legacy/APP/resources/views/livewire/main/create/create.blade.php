<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] lg:pb-24">
    <div class="w-full sm:mx-auto sm:max-w-2xl">

        {{-- Check if gig created --}}
        @if ($isFinished)
            {{-- Gig posted successfully --}}
            <div class="bg-white dark:bg-zinc-800 justify-center pb-4 pt-5 px-4 rounded-md shadow-sm sm:align-middle sm:max-w-sm sm:p-6 sm:w-full mx-auto">
                <div>
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-zinc-700">
                        <svg class="h-6 w-6 text-green-600 dark:text-zinc-500" xmlns="http://www.w3.org/2000/svg"
                             fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <div class="mt-3 text-center sm:mt-5">
                        <h3 class="text-md leading-6 font-medium text-gray-900 dark:text-gray-200"
                            id="modal-title">{{ __('messages.t_gig_created') }}</h3>
                        <div class="mt-2">
                            @if ($is_approved)
                                <p class="text-sm text-gray-500 dark:text-gray-400">{{ __('messages.t_gig_created_subtitle') }}</p>
                            @else
                                <p class="text-sm text-gray-500 dark:text-gray-400">{{ __('messages.t_gig_created_subtitle_pending_approval') }}</p>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="mt-5 sm:mt-6">
                    <a href="{{ $isFinished }}"
                       class="inline-flex justify-center items-center w-full rounded uppercase tracking-widest border border-transparent shadow-sm px-4 py-3 bg-primary-600 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 text-xs">
                        {{ __('messages.t_view_gig') }}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>
                    </a>
                </div>
            </div>
        @else
            {{-- Loading --}}
            <x-forms.loading/>

            {{-- English Language Notice --}}
            @if(in_array('en', supported_languages()->pluck('language_code')->toArray()))
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 dark:bg-amber-900/20 dark:border-amber-700/30">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-amber-800 dark:text-amber-200">
                                {{ __('messages.t_language_notice') }}
                            </h3>
                            <div class="mt-2 text-sm text-amber-700 dark:text-amber-300">
                                <p class="leading-5">
                                    {!! __('messages.t_english_fields_optional_notice') !!}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            @endif

            {{-- Overview --}}
            <div class="card px-4 py-10 sm:p-10 md:mx-0 mb-6">
                {{-- Section head --}}
                <div class="flex-col md:flex-row md:justify-between flex md:items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
                    {{-- Title --}}
                    <div class="flex items-center gap-x-4">
                        <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                            <i class="ph-duotone ph-clipboard-text"></i>
                        </div>
                        <div class="block">
                            <h3 class="text-[0.9375rem] font-bold text-zinc-700 dark:text-white pb-0.5 tracking-wide">
                                @lang('messages.t_overview')
                            </h3>
                            <p class="text-xs+ font-medium text-slate-400 dark:text-zinc-400 tracking-wide">
                                @lang('messages.t_create_gig_overview_subtitle')
                            </p>
                        </div>
                    </div>
                    {{-- Actions --}}
                    <div class="md:ms-auto flex items-center gap-2">
                        {{-- Upgrade seo --}}
                        <button id="modal-upgrade-seo-button" type="button"
                                class="inline-flex justify-center items-center space-x-2 rtl:space-x-reverse rounded border font-semibold focus:outline-none px-3 py-2 leading-5 whitespace-nowrap text-xs border-gray-300 bg-white text-gray-700 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none tracking-wide dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:text-zinc-200">
                            <i class="ph-duotone ph-magnifying-glass w-4 h-4 flex items-center justify-center text-lg text-gray-400 dark:text-zinc-400"></i>
                            <span class="capitalize">@lang('messages.t_seo_meta_tags')</span>
                        </button>
                    </div>
                </div>

                {{-- Section body --}}
                <div class="w-full new-service-container">
                    <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">
                        {{-- Title for each language --}}
                        @foreach (supported_languages() as $lang)
                            <div class="col-span-12" wire:key="create-service-title-{{$lang->language_code}}">
                                <x-forms.text-input
                                    :required="$lang->language_code !== 'en'"
                                    label="title {{$lang->language_code}}"
                                    model="title.{{$lang->language_code}}"
                                    :label="trans('messages.t_service_title') . ' ' . trans('messages.' .$lang->language_code)"
                                />
                            </div>
                        @endforeach

                        {{-- Parent category --}}
                        <div class="col-span-12" wire:key="create-service-categories">
                            <x-forms.select-simple required live
                                                   model="category"
                                                   :label="__('messages.t_category')"
                                                   :placeholder="__('messages.t_choose_category')">
                                <x-slot:options>
                                    @foreach ($categories as $category)
                                        <option value="{{ $category->id }}">{{ $category->name }}</option>
                                    @endforeach
                                </x-slot:options>
                            </x-forms.select-simple>
                        </div>

                        {{-- Subcategory --}}
                        <div class="col-span-12" wire:key="create-service-subcategories">
                            <x-forms.select-simple required live
                                                   model="subcategory"
                                                   :label="__('messages.t_subcategory')"
                                                   :placeholder="__('messages.t_choose_subcategory')">
                                <x-slot:options>
                                    @foreach ($subcategories as $subcategory)
                                        <option value="{{ $subcategory->id }}">{{ $subcategory->name }}</option>
                                    @endforeach
                                </x-slot:options>
                            </x-forms.select-simple>
                        </div>

                        {{-- Childcategory --}}
                        <div class="col-span-12" wire:key="create-service-childcategories">
                            <x-forms.select-simple required
                                                   model="childcategory"
                                                   :label="__('messages.t_childcategory')"
                                                   :placeholder="__('messages.t_choose_childcategory')">
                                <x-slot:options>
                                    @foreach ($childcategories as $childcategory)
                                        <option value="{{ $childcategory->id }}">{{ $childcategory->name }}</option>
                                    @endforeach
                                </x-slot:options>
                            </x-forms.select-simple>
                        </div>

                        {{-- Description for each language --}}
                        @foreach (supported_languages() as $lang)
                            <div class="col-span-12" wire:key="create-service-description-{{$lang->language_code}}">
                                <x-forms.tinymce
                                    :required="$lang->language_code !== 'en'"
                                    :label="trans('messages.t_description') . ' ' . trans('messages.' .$lang->language_code)"
                                    id="description-{{$lang->language_code}}"
                                    target="create-gig-action-btn"
                                    model="description.{{$lang->language_code}}"
                                />
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>

            {{-- Pricing --}}
            <div class="card px-4 py-10 sm:p-10 md:mx-0 mb-6">
                {{-- Section head --}}
                <div class="flex-col md:flex-row md:justify-between flex md:items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
                    {{-- Title --}}
                    <div class="flex items-center gap-x-4">
                        <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                            <i class="ph-duotone ph-tag"></i>
                        </div>
                        <div class="block">
                            <h3 class="text-[0.9375rem] font-bold text-zinc-700 dark:text-white pb-0.5 tracking-wide">
                                @lang('messages.t_pricing')
                            </h3>
                            <p class="text-xs+ font-medium text-slate-400 dark:text-zinc-400 tracking-wide">
                                @lang('messages.t_create_gig_pricing_subtitle')
                            </p>
                        </div>
                    </div>
                </div>

                {{-- Section body --}}
                <div class="w-full new-service-container">
                    <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">
                        {{-- Service price --}}
                        <div class="col-span-12 md:col-span-6">
                            <x-forms.text-input required
                                                :label="__('messages.t_price')"
                                                placeholder="0.00"
                                                model="price"
                                                suffix="{{ $currency_symbol }}"/>
                        </div>

                        {{-- Delivery time --}}
                        <div class="col-span-12 md:col-span-6" wire:key="create-service-available-deliveries">
                            <x-forms.select-simple required
                                                   model="delivery_time"
                                                   :label="__('messages.t_delivery_time')"
                                                   :placeholder="__('messages.t_choose_delivery_time')">
                                <x-slot:options>
                                    @foreach ($available_deliveries as $key => $delivery)
                                        <option value="{{ $delivery['value'] }}">{{ $delivery['text'] }}</option>
                                    @endforeach
                                </x-slot:options>
                            </x-forms.select-simple>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Media --}}
            <div class="card px-4 py-10 sm:p-10 md:mx-0 mb-6">
                {{-- Section head --}}
                <div class="flex-col md:flex-row md:justify-between flex md:items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
                    {{-- Title --}}
                    <div class="flex items-center gap-x-4">
                        <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                            <i class="ph-duotone ph-images"></i>
                        </div>
                        <div class="block">
                            <h3 class="text-[0.9375rem] font-bold text-zinc-700 dark:text-white pb-0.5 tracking-wide">
                                @lang('messages.t_gallery')
                            </h3>
                            <p class="text-xs+ font-medium text-slate-400 dark:text-zinc-400 tracking-wide">
                                @lang('messages.t_get_noticed_by_right_buyers_images')
                            </p>
                        </div>
                    </div>
                </div>

                {{-- Section body --}}
                <div class="w-full new-service-container">
                    <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">
                        {{-- Thumbnail --}}
                        <div class="col-span-12 mb-10">
                            {{-- Container --}}
                            <div class="w-full" wire:ignore>
                                {{-- Label --}}
                                <div class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate text-zinc-500 dark:text-white mb-2.5">
                                    {{-- Label text --}}
                                    @lang('messages.t_thumbnail')
                                    {{-- Required --}}
                                    <span class="font-bold text-red-400">*</span>
                                </div>
                                {{-- Uploader --}}
                                <x-forms.uploader
                                        model="thumbnail"
                                        id="uploader_thumbnail"
                                        :extensions="['jpg', 'jpeg', 'png']"
                                        accept="image/jpg, image/jpeg, image/png"
                                        description="messages.t_image_has_been_successfully_deleted"
                                        size="{{ settings('publish')->max_image_size }}"
                                        max="1"/>
                            </div>
                            {{-- Errors --}}
                            @error('thumbnail')
                            <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('thumbnail') }}</p>
                            @enderror
                        </div>

                        {{-- Images uploader --}}
                        <div class="col-span-12">
                            {{-- Container --}}
                            <div class="w-full" wire:ignore>
                                {{-- Label --}}
                                <div class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate text-zinc-500 dark:text-white mb-2.5">
                                    {{-- Label text --}}
                                    @lang('messages.t_images')
                                    {{-- Required --}}
                                    <span class="font-bold text-red-400">*</span>
                                </div>
                                {{-- Uploader --}}
                                <x-forms.uploader
                                        model="images"
                                        id="uploader_images"
                                        :extensions="['jpg', 'jpeg', 'png']"
                                        accept="image/jpg, image/jpeg, image/png"
                                        description="messages.t_image_has_been_successfully_deleted"
                                        size="{{ settings('publish')->max_image_size }}"
                                        max="{{ settings('publish')->max_images }}"/>
                            </div>
                            {{-- Errors --}}
                            @error('images')
                            <p class="mt-2 text-xs text-red-600 dark:text-red-500">{{ $errors->first('images') }}</p>
                            @enderror
                        </div>

                        {{-- Documents --}}
                        @if (settings('publish')->is_documents_enabled)
                            <div class="col-span-12 mt-10">
                                {{-- Container --}}
                                <div class="w-full" wire:ignore>
                                    {{-- Label --}}
                                    <div class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate text-zinc-500 dark:text-white mb-2.5">
                                        @lang('messages.t_documents')
                                    </div>
                                    {{-- Uploader --}}
                                    <x-forms.uploader
                                            model="documents"
                                            id="uploader_documents"
                                            :extensions="['pdf']"
                                            accept="application/pdf"
                                            size="{{ settings('publish')->max_document_size }}"
                                            max="{{ settings('publish')->max_documents }}"/>
                                </div>
                                {{-- Errors --}}
                                @error('documents')
                                <p class="mt-2 text-xs text-red-600 dark:text-red-500">{{ $errors->first('documents') }}</p>
                                @enderror
                            </div>
                        @endif
                    </div>
                </div>
            </div>

            {{-- Create --}}
            <div class="w-full mt-12">
                <x-bladewind.button size="small" class="mx-auto block w-full" action="create" id="create-gig-action-btn">
                    @lang('messages.t_create')
                </x-bladewind.button>
            </div>

            {{-- SEO Modal --}}
            <x-forms.modal id="modal-upgrade-seo-container" target="modal-upgrade-seo-button"
                           uid="modal_uid_{{ uid() }}" placement="center-center" size="max-w-4xl">
                {{-- Modal heading --}}
                <x-slot name="title">{{ __('messages.t_seo') }}</x-slot>

                {{-- Modal content --}}
                <x-slot name="content">
                    <div class="grid sm:grid-cols-2 gap-4" x-data="window.CQjwMygsGRWknEn">
                        {{-- SEO Form --}}
                        <div class="border-b sm:border-b-0 sm:border-r sm:pr-12 relative pb-12 sm:mb-0 dark:border-zinc-700">
                            <div class="w-full space-y-6">
                                {{-- SEO Title --}}
                                <x-forms.text-input
                                        label="{{ __('messages.t_seo_title') }}"
                                        placeholder="{{ __('messages.t_enter_seo_title') }}"
                                        model="seo_title"
                                        icon="google"
                                        x-model="seo.title"
                                        maxlength="100"/>

                                {{-- SEO Description --}}
                                <x-forms.textarea
                                        label="{{ __('messages.t_seo_description') }}"
                                        placeholder="{{ __('messages.t_enter_seo_description') }}"
                                        model="seo_description"
                                        icon="folder-text"
                                        rows="6"
                                        x-model="seo.description"
                                        maxlength="150"/>
                            </div>
                        </div>

                        {{-- SEO Preview --}}
                        <div class="pt-6 sm:pt-8 sm:px-8 sm:pb-8 flex items-center justify-start sm:!justify-center">
                            <template x-if="seo.title && seo.description">
                                <div class="relative max-w-full">
                                    <span class="text-xs font-normal truncate block text-green-700" x-text="seoUrlPreview"></span>
                                    <h2 class="text-sm text-primary-700 font-medium truncate block break-all" x-text="seo.title"></h2>
                                    <div class="text-xs text-gray-600 font-normal pt-1 break-all">
                                        <span class="text-gray-400" x-text="today"></span> — <span x-text="seo.description"></span>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </x-slot>
            </x-forms.modal>
        @endif
    </div>
</div>

{{-- Include in Footer --}}
@push('scripts')
    {{-- Slugify Plugin --}}
    <script src="{{ asset('js/plugins/slugify/slugify.min.js') }}"></script>

    {{-- AlpineJS --}}
    <script>
        function CQjwMygsGRWknEn() {
            return {
                seo: {
                    is_enabled: false,
                    title: null,
                    description: null
                },

                // Initialize
                initialize() {
                },

                // Get seo today date
                today() {
                    const date = new Date();
                    const strArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const d = date.getDate();
                    const m = strArray[date.getMonth()];
                    const y = date.getFullYear();
                    return '' + m + ' ' + (d <= 9 ? '0' + d : d) + ', ' + y;
                },

                // Set seo url preview
                seoUrlPreview() {
                    if (this.seo.title) {
                        return "{{ url('service') }}/" + slugify(this.seo.title)
                    }
                }
            }
        }
        window.CQjwMygsGRWknEn = CQjwMygsGRWknEn();
    </script>
@endpush
