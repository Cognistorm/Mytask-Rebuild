<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-currency-dollar"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_currency_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_currency_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Name --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_currency_name')"
                        :placeholder="__('messages.t_enter_currency_name')"
                        model="name"
                        icon="cursor-text" />
                </div>

                {{-- Code --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->__id"
                            label_key="code"
                            value_key="code"
                            name="code"
                            :selected_value="$code"
                            :label="__('messages.t_currency_code')"
                            :placeholder="__('messages.t_choose_currency_code')"
                            data="manual">
                        
                            @foreach ($currencies as $c => $currency)
                                <x-bladewind.select-item :label="$c" :value="$c" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('code')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('code') }}</p>
                    @enderror 

                </div>

                {{-- Exchange rate --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_exchange_rate')"
                        :placeholder="__('messages.t_enter_exchange_rate_to_usd')"
                        model="exchange_rate"
                        icon="swap" />
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