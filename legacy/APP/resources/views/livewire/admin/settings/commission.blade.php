<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-percent"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_commission_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_commission_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">
                
                {{-- Enable tax --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                    :checked="$enable_taxes"
                    name="enable_taxes"
                    :label="__('dashboard.t_enable_tax')"
                    label_position="right" />
                </div>

                {{-- Tax type --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="tax_type"
                            :selected_value="$tax_type"
                            :label="__('dashboard.t_tax_value_type')"
                            :placeholder="__('dashboard.t_choose_tax_value_type')"
                            data="manual">
                        
                            {{-- Percentage --}}
                            <x-bladewind.select-item :label="__('messages.t_percentage_amount')" value="percentage" />

                            {{-- Fixed --}}
                            <x-bladewind.select-item :label="__('messages.t_fixed_amount')" value="fixed" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('tax_type')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('tax_type') }}</p>
                    @enderror 

                </div>

                {{-- Tax value --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_tax_value')"
                        :placeholder="__('messages.t_enter_tax_value')"
                        model="tax_value"
                        icon="target" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Commission from --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="commission_from"
                            :selected_value="$commission_from"
                            :label="__('messages.t_commission')"
                            :placeholder="__('messages.t_take_commission_from')"
                            :hint="__('dashboard.t_commission_from_settings_hint')"
                            data="manual">
                        
                            {{-- Orders --}}
                            <x-bladewind.select-item :label="__('messages.t_orders')" value="orders" />

                            {{-- Payouts --}}
                            <x-bladewind.select-item :label="__('messages.t_payouts')" value="withdrawals" />

                            {{-- Both --}}
                            <x-bladewind.select-item :label="__('messages.t_both')" value="both" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('commission_from')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('commission_from') }}</p>
                    @enderror 

                </div>

                {{-- Commission type --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="commission_type"
                            :selected_value="$commission_type"
                            :label="__('messages.t_commission_type')"
                            :placeholder="__('messages.t_choose_commission_type')"
                            data="manual">
                        
                            {{-- Percentage --}}
                            <x-bladewind.select-item :label="__('messages.t_percentage_amount')" value="percentage" />

                            {{-- Fixed --}}
                            <x-bladewind.select-item :label="__('messages.t_fixed_amount')" value="fixed" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('commission_type')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('commission_type') }}</p>
                    @enderror 

                </div>

                {{-- Commission value --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_commission_value')"
                        :placeholder="__('messages.t_enter_commission_value')"
                        model="commission_value"
                        icon="ticket" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-2">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs leading-7">
                                @lang('dashboard.t_go_to_publish_settings_to_enable_offers')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Custom offers commission type --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="custom_offers_commission_type"
                            :selected_value="$custom_offers_commission_type"
                            :label="__('dashboard.t_commission_from_custom_offers_type')"
                            :placeholder="__('dashboard.t_choose_a_value')"
                            data="manual">
                        
                            {{-- Percentage --}}
                            <x-bladewind.select-item :label="__('messages.t_percentage_amount')" value="percentage" />

                            {{-- Fixed --}}
                            <x-bladewind.select-item :label="__('messages.t_fixed_amount')" value="fixed" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('custom_offers_commission_type')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('custom_offers_commission_type') }}</p>
                    @enderror 

                </div>

                {{-- Commission value from freelancer --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_commission_value_from_freelancer')"
                        :placeholder="__('dashboard.t_enter_commission_value')"
                        model="custom_offers_commission_value_freelancer"
                        icon="hash" />
                </div>

                {{-- Commission value from buyer --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_commission_value_from_buyer')"
                        :placeholder="__('dashboard.t_enter_commission_value')"
                        model="custom_offers_commission_value_buyer"
                        icon="hash" />
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