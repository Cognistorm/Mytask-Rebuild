<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="create" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-user"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_create_user')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_create_update_user_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Username --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_username')"
                        :placeholder="__('messages.t_enter_username')"
                        model="username"
                        icon="user" />
                </div>

                {{-- Email address --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_email_address')"
                        :placeholder="__('messages.t_enter_email_address')"
                        model="email"
                        type="email"
                        icon="at" />
                </div>

                {{-- Password --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_password')"
                        :placeholder="__('messages.t_enter_password')"
                        model="password"
                        type="password"
                        icon="lock" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Account type --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->id()"
                            name="account_type"
                            :selected_value="$account_type"
                            :label="__('messages.t_account_type')"
                            :placeholder="__('messages.t_choose_account_type')"
                            data="manual">
                        
                            <x-bladewind.select-item :label="__('messages.t_freelancer')" value="seller" />
                            <x-bladewind.select-item :label="__('messages.t_buyer')" value="buyer" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('account_type')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('account_type') }}</p>
                    @enderror 

                </div>

                {{-- Default level --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->id()"
                            name="level"
                            :selected_value="$level"
                            :label="__('messages.t_level')"
                            :placeholder="__('messages.t_choose_level')"
                            data="manual">
                        
                            @foreach ($levels as $user_level)
                                <x-bladewind.select-item :label="$user_level->title" :value="$user_level->id" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('level')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('level') }}</p>
                    @enderror 

                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Country --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->id()"
                            name="country"
                            :selected_value="$country"
                            :label="__('messages.t_country')"
                            :placeholder="__('messages.t_choose_country')"
                            data="manual">
                        
                            @foreach ($countries as $user_country)
                                <x-bladewind.select-item :label="$user_country->name" :value="$user_country->id" />
                            @endforeach

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('country')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('country') }}</p>
                    @enderror 

                </div>

                {{-- Fullname --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_fullname')"
                        :placeholder="__('messages.t_enter_fullname')"
                        model="fullname"
                        icon="identification-badge" />
                </div>

                {{-- Headline --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_headline')"
                        :placeholder="__('messages.t_enter_your_headline')"
                        model="headline"
                        icon="text-aa" />
                </div>

                {{-- Description --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        :label="__('messages.t_description')"
                        :placeholder="__('messages.t_enter_description')"
                        rows="6"
                        model="description"
                        icon="text-columns" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Status --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required searchable
                            :component-id="$this->id()"
                            name="status"
                            :selected_value="$status"
                            :label="__('messages.t_status')"
                            :placeholder="__('messages.t_choose_status')"
                            data="manual">
                        
                            <x-bladewind.select-item :label="__('messages.t_active')" value="active" />
                            <x-bladewind.select-item :label="__('messages.t_verified')" value="verified" />
                            <x-bladewind.select-item :label="__('messages.t_banned')" value="banned" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('status')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('status') }}</p>
                    @enderror 

                </div>

                {{-- Avatar --}}
                <div class="col-span-12" wire:ignore>
                    <x-bladewind.filepicker
                        name="avatar"
                        :placeholder="__('messages.t_upload_avatar')"
                        accepted_file_types=".jpg,.png,.jpeg,.gif,.svg" />  
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Available credit --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_available_balance')"
                        placeholder="0.00"
                        model="balance"
                        icon="wallet" />
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