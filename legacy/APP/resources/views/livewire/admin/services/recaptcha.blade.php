<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-shield-star"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_recaptcha')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_update_recaptcha_settings')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-red-700 bg-red-100">
                        <div class="flex items-center gap-x-3">
                            <i class="ph-duotone ph-warning-octagon text-xl"></i>
                            <h3 class="font-semibold grow text-xs leading-5">
                                @lang('dashboard.t_enable_recaptcha_alert_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Enable --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$is_enabled"
                        name="is_enabled"
                        :label="__('messages.t_enable_recaptcha')"
                        label_position="right" />
                </div>

                {{-- site key --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_site_key')"
                        :placeholder="__('messages.t_enter_site_key')"
                        model="site_key"
                        icon="key" />
                </div>

                {{-- Site secret --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_secret_key')"
                        :placeholder="__('messages.t_enter_secret_key')"
                        model="secret_key"
                        icon="lock" />
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