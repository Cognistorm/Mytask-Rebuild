<div class="w-full sm:mx-auto sm:max-w-2xl" x-data="{ driver: @entangle('driver') }" x-cloak>
    
    {{-- Loading --}}
    <x-forms.loading />

    {{-- Mail config section --}}
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0 mb-6" has-files>

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-at"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_smtp_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_smtp_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-amber-700 bg-amber-100">
                        <div class="flex items-center gap-x-3">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block w-5 h-5 flex-none text-amber-600"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>
                            <h3 class="font-semibold grow text-xs leading-5">
                                @lang('dashboard.t_smtp_ports_restrictions_alert')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Default mail transport driver --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="driver"
                            :selected_value="$driver"
                            :label="__('dashboard.t_default_mail_transport_driver')"
                            :placeholder="__('dashboard.t_choose_a_value')"
                            data="manual">
                        
                            {{-- Smtp --}}
                            <x-bladewind.select-item label="SMTP" value="smtp" />

                            {{-- Sendmail --}}
                            <x-bladewind.select-item label="Sendmail" value="sendmail" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('driver')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('driver') }}</p>
                    @enderror 

                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Smtp host --}}
                <div class="col-span-12" x-show="driver == 'smtp'">
                    <x-forms.text-input required
                        :label="__('messages.t_smtp_host')"
                        :placeholder="__('messages.t_enter_smtp_host')"
                        model="host"
                        icon="hard-drives" />
                </div>

                {{-- Smtp port --}}
                <div class="col-span-12" x-show="driver == 'smtp'">
                    <x-forms.text-input required
                        :label="__('messages.t_smtp_port')"
                        :placeholder="__('messages.t_enter_smtp_port')"
                        model="port"
                        icon="usb" />
                </div>

                {{-- Encryption --}}
                <div class="col-span-12" x-show="driver == 'smtp'">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="encryption"
                            :selected_value="$encryption"
                            :label="__('messages.t_smtp_encryption')"
                            :placeholder="__('messages.t_choose_smtp_encryption')"
                            data="manual">
                        
                            {{-- Ssl --}}
                            <x-bladewind.select-item label="SSL" value="ssl" />

                            {{-- Tls --}}
                            <x-bladewind.select-item label="TLS" value="tls" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('encryption')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('encryption') }}</p>
                    @enderror 

                </div>

                {{-- Username --}}
                <div class="col-span-12" x-show="driver == 'smtp'">
                    <x-forms.text-input required
                        :label="__('messages.t_username')"
                        :placeholder="__('messages.t_enter_username')"
                        model="username"
                        icon="fingerprint" />
                </div>

                {{-- Password --}}
                <div class="col-span-12" x-show="driver == 'smtp'">
                    <x-forms.text-input required
                        :label="__('messages.t_password')"
                        :placeholder="__('messages.t_enter_password')"
                        :hint="__('dashboard.t_leave_blank_if_u_dont_want_t_change_it')"
                        model="password"
                        type="password"
                        icon="password" />
                </div>

                {{-- Check if default driver is sendmail --}}
                @if ($driver == 'sendmail')
                    
                    {{-- Sendmail hint --}}
                    <div class="col-span-12">
                        <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                            <div class="flex items-center gap-x-3">
                                <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                                <h3 class="font-semibold grow text-xs leading-5">
                                    @lang('dashboard.t_sendmail_path_explain_hint')
                                </h3>
                            </div>
                        </div>
                    </div>

                    {{-- Sendmail path from php.ini --}}
                    @if (ini_get('sendmail_path'))
                        <div class="col-span-12">
                            <div class="py-2.5 px-3 rounded text-yellow-700 bg-yellow-50">
                                <div class="flex items-center gap-x-3">
                                    <svg class="inline-block w-5 h-5 flex-none text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                                    <h3 class="font-semibold grow text-xs leading-5">
                                        {{ ini_get('sendmail_path') }}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    @endif

                    {{-- Sendmail path --}}
                    <div class="col-span-12">
                        <x-forms.text-input required
                            :label="__('dashboard.t_sendmail_path')"
                            :placeholder="__('dashboard.t_enter_sendmail_path')"
                            model="sendmail_path"
                            icon="folder-open" />
                    </div>

                @endif

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- From address --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_smtp_from_address')"
                        :placeholder="__('messages.t_enter_email_address')"
                        model="from_address"
                        type="email"
                        icon="paper-plane-tilt" />
                </div>

                {{-- From name --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_smtp_from_name')"
                        :placeholder="__('messages.t_enter_your_company_website_name')"
                        model="from_name"
                        icon="user" />
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

    {{-- Testing mail section --}}
    <x-form wire:submit="send" class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-paper-plane-tilt"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_test_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_test_settings_smtp_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-3">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs leading-5">
                                @lang('dashboard.t_test_smtp_enable_debug_mode_hint')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Email address --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_email_address')"
                        :placeholder="__('messages.t_enter_email_address')"
                        model="email"
                        type="email"
                        icon="at" />
                </div>

            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                @lang('messages.t_send')
            </x-bladewind.button>
        </div>
            
	</x-form>

</div>