<div class="w-full sm:mx-auto sm:max-w-2xl">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Form --}}
	<x-form wire:submit="delete" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Section head --}}
        <div class="flex flex-col gap-y-4 items-center mb-8 border-b pb-6 border-slate-100 dark:border-zinc-700">
            <div class="bg-red-100 h-24 w-24 flex items-center justify-center rounded-full">
                <i class="ph-duotone ph-trash text-red-500 text-4xl"></i>
            </div>
            <p class="text-sm font-normal tracking-wide text-slate-500 dark:text-zinc-300">@lang('messages.t_are_u_sure_u_want_to_delete_this')</p>
            <span class="!-mt-2 font-semibold text-base dark:text-white">{{ $level->title }}</span>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Update default level only if it's same as current level --}}
                @if ( settings('auth')->default_buyer_level_id == $level->id || settings('auth')->default_seller_level_id == $level->id )
                
                    {{-- Alert --}}
                    <div class="col-span-12">
                        <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                            <div class="flex items-center gap-x-3">
                                <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                                <h3 class="font-semibold grow text-xs">
                                    @lang('dashboard.t_delete_level_default_explain')
                                </h3>
                            </div>
                        </div>
                    </div>

                    {{-- Default buyer level --}}
                    @if ($level->account_type == 'buyer')
                        <div class="col-span-12">

                            {{-- Select --}}
                            <div class="w-full" wire:ignore>
                                <x-bladewind.select required
                                    :component-id="$this->id()"
                                    name="default_buyer_level"
                                    :selected_value="$default_buyer_level"
                                    :label="__('dashboard.t_default_new_buyers_level')"
                                    :placeholder="__('messages.t_choose_level')"
                                    data="manual">
                                
                                    @foreach ($levels as $level)
                                        @if ($level->account_type == 'buyer')
                                            <x-bladewind.select-item :label="$level->title" :value="$level->id" />
                                        @endif
                                    @endforeach

                                </x-bladewind.select>
                            </div>

                            {{-- Error --}}  
                            @error('default_buyer_level')
                                <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('default_buyer_level') }}</p>
                            @enderror 

                        </div>
                    @endif

                    {{-- Default seller level --}}
                    @if ($level->account_type == 'seller')
                        <div class="col-span-12">

                            {{-- Select --}}
                            <div class="w-full" wire:ignore>
                                <x-bladewind.select required
                                    :component-id="$this->id()"
                                    name="default_seller_level"
                                    :selected_value="$default_seller_level"
                                    :label="__('dashboard.t_default_new_sellers_level')"
                                    :placeholder="__('messages.t_choose_level')"
                                    data="manual">
                                
                                    @foreach ($levels as $level)
                                    @if ($level->account_type == 'seller')
                                        <x-bladewind.select-item :label="$level->title" :value="$level->id" />
                                    @endif
                                    @endforeach

                                </x-bladewind.select>
                            </div>

                            {{-- Error --}}  
                            @error('default_seller_level')
                                <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('default_seller_level') }}</p>
                            @enderror 

                        </div>
                    @endif

                    {{-- Divider --}}
                    <div class="col-span-12 -mx-4 sm:-mx-10">
                        <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                    </div>

                @endif

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs">
                                @lang('dashboard.t_delete_level_set_new_explain') "{{ $level->title }}"
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Set new level --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->id()"
                            name="new_level"
                            :label="__('dashboard.t_new_level')"
                            :placeholder="__('messages.t_choose_level')"
                            data="manual">
                        
                            @foreach ($levels as $level)
                                <x-bladewind.select-item :label="$level->title" :value="$level->id" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('new_level')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('new_level') }}</p>
                    @enderror 

                </div>

            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true" color="red">
                @lang('messages.t_delete_level')
            </x-bladewind.button>
        </div>

    </x-form>

</div>