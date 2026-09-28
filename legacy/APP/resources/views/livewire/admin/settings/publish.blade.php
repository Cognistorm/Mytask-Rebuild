<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-paper-plane-tilt"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_publish_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_publish_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Auto approve gigs --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$auto_approve_gigs"
                        name="auto_approve_gigs"
                        :label="__('messages.t_auto_approve_gigs')"
                        label_position="right" />
                </div>

                {{-- Auto approve project  --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$auto_approve_portfolio"
                        name="auto_approve_portfolio"
                        :label="__('dashboard.t_auto_approve_project_portfolio')"
                        label_position="right" />
                </div>

                {{-- Enable custom offers --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_custom_offers"
                        name="enable_custom_offers"
                        :label="__('dashboard.t_enable_custom_offers')"
                        label_position="right" />
                </div>

                {{-- Custom offers require admin approval --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$custom_offers_require_approval"
                        name="custom_offers_require_approval"
                        :label="__('dashboard.t_custom_offers_require_admin_approval')"
                        label_position="right" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Maxiumum tags --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('messages.t_max_tags')"
                        :placeholder="__('messages.t_enter_max_tags')"
                        model="max_tags"
                        icon="tag" />
                </div>

                {{-- Custom offers expiration time --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_custom_offers_expiration_time_days')"
                        :placeholder="__('dashboard.t_insert_a_value')"
                        model="custom_offers_expiry_days"
                        icon="clock-countdown" />
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