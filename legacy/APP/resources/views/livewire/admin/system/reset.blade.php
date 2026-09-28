<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="confirm" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-arrows-clockwise"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('dashboard.t_factory_reset')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_factory_reset_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Reset users --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$users"
                        name="users"
                        :label="__('dashboard.t_is_package_enabled')"
                        label_position="right" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}

                {{-- Admin password --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('dashboard.t_admin_password')"
                        :placeholder="__('messages.t_enter_password')"
                        model="password"
                        type="password"
                        icon="password" />
                </div>
                
            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true" color="red">
                @lang('messages.t_confirm')
            </x-bladewind.button>
        </div>
            
	</x-form>
</div>
