<div class="w-full sm:mx-auto sm:max-w-xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>
    
        {{-- Loading --}}
        <x-forms.loading />

        {{-- Heading --}}
        <div class="mb-14 border-b pb-6 max-w-xs mx-auto text-center border-slate-100 dark:border-zinc-700">

            {{-- Logo --}}
            <div class="h-[4.5rem] w-[4.5rem] inline-flex flex-shrink-0 relative mb-3">
                <div class="flex items-center justify-center h-full w-full rounded-full text-base uppercase font-bold tracking-widest bg-slate-100 text-slate-300 dark:bg-zinc-700 dark:text-zinc-400">
                    {{ Str::substr($name, 0, 2) }}
                </div>
            </div>

            {{-- Name --}}
            <h2 class="text-sm font-bold tracking-wider text-slate-500 dark:text-white">{{ $name }}</h2>

            {{-- Subtitle --}}
            <p class="text-xs+ text-slate-400 font-light tracking-wide leading-5 mt-1 dark:text-zinc-400">@lang('dashboard.t_update_payment_gateways_subtitle')</p>

        </div>

        {{-- Body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Name --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_name')"
                        :placeholder="__('messages.t_enter_payment_method_name')"
                        model="name"
                        icon="text-aa" />
                </div>
    
                {{-- Exchange rate --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_exchange_rate')"
                        :placeholder="__('messages.t_enter_exchange_rate_to_usd')"
                        model="exchange_rate"
                        icon="currency-dollar" />
                </div>

                {{-- Deposit min amount --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_deposit_min_amount')"
                        placeholder="0.00"
                        model="deposit_min_amount"
                        icon="arrow-down" />
                </div>
    
                {{-- Deposit max amount --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_deposit_max_amount')"
                        placeholder="0.00"
                        model="deposit_max_amount"
                        icon="arrow-up" />
                </div>

                {{-- Default currency --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->id()"
                            name="currency"
                            :selected_value="$currency"
                            :label="__('messages.t_default_currency')"
                            :placeholder="__('messages.t_choose_currency_code')"
                            data="manual">
                        
                            @foreach ($currencies as $code => $details)
                                <x-bladewind.select-item :label="$code" :value="$code" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('currency')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('currency') }}</p>
                    @enderror 

                </div>
    
                {{-- Status --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_active"
                        name="is_active"
                        :label="__('messages.t_enable_this_payment_gateway')"
                        label_position="right" />
                </div>
    
                {{-- Logo --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        :url="payment_gateway($slug)?->logo ? src( payment_gateway($slug)?->logo ) : ''"
                        name="logo"
                        :placeholder="__('messages.t_payment_gateway_logo')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Divider --}}
                <div class="col-span-12">
                    <div class="-mx-10 my-10 flex items-center gap-4 before:h-px before:flex-1 before:bg-gray-100 dark:before:bg-zinc-700 text-sm text-gray-500 font-semibold before:content-[''] after:h-px after:flex-1 after:bg-gray-100 dark:after:bg-zinc-700 after:content-[''] dark:text-zinc-300">
                        @lang('dashboard.t_fee_settings')
                    </div>
                </div>

                {{-- Deposit fee (percentage) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_deposit_fee_percentage')"
                        placeholder="0.00"
                        model="deposit_fee_percentage"
                        icon="percent" />
                </div>
    
                {{-- Deposit fee (fixed) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_deposit_fee_fixed')"
                        placeholder="0.00"
                        model="deposit_fee_fixed"
                        icon="money" />
                </div>
    
                {{-- Gigs checkout fee (percentage) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_gigs_checkout_fee_percentage')"
                        placeholder="0.00"
                        model="gigs_checkout_fee_percentage"
                        icon="percent" />
                </div>
    
                {{-- Gigs checkout fee (fixed) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_gigs_checkout_fee_fixed')"
                        placeholder="0.00"
                        model="gigs_checkout_fee_fixed"
                        icon="money" />
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-amber-700 bg-amber-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-amber-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs leading-5">
                                @lang('dashboard.t_projects_bids_fee_available_extended_license')
                            </h3>
                        </div>
                    </div>
                </div>
    
                {{-- Projects checkout fee (percentage) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_projects_checkout_fee_percentage')"
                        placeholder="0.00"
                        model="projects_checkout_fee_percentage"
                        icon="percent" />
                </div>
    
                {{-- Projects checkout fee (fixed) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_projects_checkout_fee_fixed')"
                        placeholder="0.00"
                        model="projects_checkout_fee_fixed"
                        icon="money" />
                </div>
    
                {{-- Bids checkout fee (percentage) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_bids_checkout_fee_percentage')"
                        placeholder="0.00"
                        model="bids_checkout_fee_percentage"
                        icon="percent" />
                </div>
    
                {{-- Bids checkout fee (fixed) --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_bids_checkout_fee_fixed')"
                        placeholder="0.00"
                        model="bids_checkout_fee_fixed"
                        icon="money" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12">
                    <div class="-mx-10 my-10 flex items-center gap-4 before:h-px before:flex-1 before:bg-gray-100 dark:before:bg-zinc-700 text-sm text-gray-500 font-semibold before:content-[''] after:h-px after:flex-1 after:bg-gray-100 dark:after:bg-zinc-700 after:content-[''] dark:text-zinc-300">
                        @lang('dashboard.t_api_settings')
                    </div>
                </div>

                {{-- Client id --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        label="Client id"
                        placeholder="Enter your client id"
                        model="client_id" />
                </div>

                {{-- Client secret --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        label="Client secret"
                        placeholder="Enter your client secret"
                        model="client_secret" />
                </div>

                {{-- Environment --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->id()"
                            name="env"
                            :selected_value="$env"
                            :label="__('messages.t_environment')"
                            :placeholder="__('messages.t_choose_environment')"
                            data="manual">

                            {{-- Sandbox --}}
                            <x-bladewind.select-item :label="__('dashboard.t_env_sandbox')" value="sandbox" />

                            {{-- Live --}}
                            <x-bladewind.select-item :label="__('dashboard.t_env_live')" value="production" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('env')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('env') }}</p>
                    @enderror 

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