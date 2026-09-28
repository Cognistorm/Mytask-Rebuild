<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-pencil-line"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_edit_level')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_create_edit_level_subtitle')
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

                {{-- Text color --}}
                <div class="col-span-12" wire:ignore>
                    <x-forms.color-picker required
                        :label="__('dashboard.t_level_text_color')"
                        model="text_color" />
                </div>

                {{-- Bg color --}}
                <div class="col-span-12" wire:ignore>
                    <x-forms.color-picker
                        :label="__('dashboard.t_level_bg_color')"
                        model="bg_color" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs">
                                @lang('dashboard.t_levels_order_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Order --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_level_order')"
                        :placeholder="__('dashboard.t_enter_a_number')"
                        model="order_number"
                        icon="list-numbers" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Account type --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="account_type"
                            :selected_value="$account_type"
                            :label="__('messages.t_account_type')"
                            :placeholder="__('messages.t_choose_account_type')"
                            data="manual">
                        
                            {{-- Values --}}
                            <x-bladewind.select-item :label="__('messages.t_seller')" value="seller" />
                            <x-bladewind.select-item :label="__('messages.t_buyer')" value="buyer" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('account_type')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('account_type') }}</p>
                    @enderror 

                </div>

                {{-- Seller --}}
                @if ($account_type === 'seller')
                    
                    {{-- Seller max sales --}}
                    <div class="col-span-12" wire:key="seller-max-sales">
                        <x-forms.text-input required
                            :label="__('messages.t_seller_maximum_sales')"
                            :placeholder="__('messages.t_enter_maximum_sales_for_seller')"
                            model="seller_max_sales"
                            icon="trend-up" />
                    </div>

                    {{-- Seller min sales --}}
                    <div class="col-span-12" wire:key="seller-min-sales">
                        <x-forms.text-input required
                            :label="__('messages.t_seller_minimum_sales')"
                            :placeholder="__('messages.t_enter_minimum_sales_for_seller')"
                            model="seller_min_sales"
                            icon="trend-down" />
                    </div>

                @endif

                {{-- Buyer --}}
                @if ($account_type === 'buyer')
                
                    {{-- Buyer max purchases --}}
                    <div class="col-span-12" wire:key="buyer-max-purchases">
                        <x-forms.text-input required
                            :label="__('messages.t_buyer_maximum_purchases')"
                            :placeholder="__('messages.t_enter_maximum_purchases_for_buyer')"
                            model="buyer_max_purchases"
                            icon="trend-up" />
                    </div>

                    {{-- Buyer min purchases --}}
                    <div class="col-span-12" wire:key="buyer-min-purchases">
                        <x-forms.text-input required
                            :label="__('messages.t_buyer_minimum_purchases')"
                            :placeholder="__('messages.t_enter_minimum_purchases_for_buyer')"
                            model="buyer_min_purchases"
                            icon="trend-down" />
                    </div>

                @endif

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Badge icon --}}
                <div class="col-span-12" wire:ignore wire:key="level-badge-upload-container">
                    <x-bladewind.filepicker
                        :url="!empty($level->badge) ? src($level->badge) : ''"
                        name="badge"
                        :placeholder="__('dashboard.t_upload_level_badge_icon')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
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

{{-- Inject Javascript --}}
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

@endpush

{{-- Inject Css --}}
@push('styles')
    
    {{-- Color picker --}}
    <link rel="stylesheet" href="{{ asset('js/plugins/coloris/dist/coloris.min.css') }}"/>

@endpush