<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-flag-banner"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_edit_country')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_create_edit_country_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Country name --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_country_name')"
                        :placeholder="__('messages.t_enter_country_name')"
                        model="name"
                        icon="text-aa" />
                </div>

                {{-- Country code --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_country_code')"
                        :placeholder="__('messages.t_enter_country_code')"
                        model="code"
                        icon="flag" />
                </div>

                {{-- Country status --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_active"
                        name="is_active"
                        :label="__('messages.t_country_status_active')"
                        label_position="right" />
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