<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-wrench"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_maintenance_mode')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_maintenance_mode_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- App status --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="status"
                            :selected_value="$status"
                            :label="__('messages.t_status')"
                            :placeholder="__('messages.t_status')"
                            data="manual">
                        
                            {{-- Down --}}
                            <x-bladewind.select-item :label="__('dashboard.t_app_under_maintenance')" value="down" />

                            {{-- Up --}}
                            <x-bladewind.select-item :label="__('dashboard.t_app_live')" value="up" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('status')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('status') }}</p>
                    @enderror 

                </div>

                {{-- Headline --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_headline')"
                        :placeholder="__('messages.t_enter_your_headline')"
                        model="headline"
                        icon="text-aa" />
                </div>

                {{-- Message --}}
                <div class="col-span-12">
                    <x-forms.textarea
                        :label="__('messages.t_message')"
                        :placeholder="__('messages.t_enter_your_message')"
                        model="message"
                        icon="book-open-text"
                        :rows="6" />
                </div>

                {{-- Secret key --}}
                @if ($status === 'down' && $secret)

                    {{-- Input --}}
                    <div class="col-span-12">
                        <x-forms.text-input disabled
                            :label="__('messages.t_secret_key')"
                            :placeholder="__('messages.t_enter_secret_key')"
                            model="secret"/>
                    </div>

                    {{-- Alert --}}
                    <div class="col-span-12">
                        <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-100">
                            <div class="flex items-center gap-x-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block w-5 h-5 flex-none text-blue-600"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>
                                <h3 class="font-semibold grow text-xs leading-5">
                                    @lang('dashboard.t_maintenance_mode_secret_explain')
                                </h3>
                            </div>
                        </div>
                    </div>

                    {{-- Disable mode link --}}
                    <div class="col-span-12">
                        <a href="{{ url($secret) }}" target="_blank" class="inline-flex w-full text-xs font-semibold tracking-wide text-zinc-500 bg-zinc-100 px-2 py-2 rounded-xs">
                            <span>{{ url('/') }}/</span>
                            <span class="text-blue-500">{{ $secret }}</span>
                        </a>
                    </div>

                @endif

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