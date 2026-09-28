<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center justify-between gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">

            {{-- Title --}}
            <div class="flex items-center gap-x-4">
                <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                    <i class="ph-duotone ph-cloud-arrow-up"></i>
                </div>
                <div class="text-muted-700 block text-xl font-semibold">
                    <h3 class="text-sm font-bold text-zinc-700 dark:text-white">
                        Cloudinary
                    </h3>
                    <a href="https://cloudinary.com" class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                        https://cloudinary.com
                    </a>
                </div>
            </div>

            {{-- Actions --}}
            <div class="">
                <a href="{{ admin_url('services/cloud') }}" class="flex items-center gap-x-1 text-xs font-semibold text-primary-600 uppercase tracking-wider hover:text-primary-700">
                    <i class="ph-duotone ph-arrow-left text-xl opacity-40"></i>
                    <span>@lang('messages.t_back')</span>
                </a>
            </div>

        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">
    
                {{-- Cloudinary url --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_cloudinary_url')"
                        :placeholder="__('messages.t_enter_cloudinary_url')"
                        model="cloud_url"
                        icon="link" />
                </div>

                {{-- Upload preset --}}
                <div class="col-span-12">
                    <x-forms.text-input
                        :label="__('messages.t_upload_preset_name')"
                        :placeholder="__('messages.t_enter_upload_preset_name')"
                        model="upload_preset"
                        icon="folder-notch-open" />
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
