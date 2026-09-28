<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-identification-card"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('dashboard.t_licensing')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_licensing_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Purchase code --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_purchase_code')"
                        :placeholder="__('dashboard.t_purchase_code')"
                        model="purchase_code"
                        icon="hash" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- License type --}}
                <div class="col-span-12">
                    <div class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">

                        {{-- Regular license --}}
                        <a href="https://codecanyon.net/item/riverr-freelance-services-marketplace/39634853" target="_blank" class="relative flex rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 p-4 focus:outline-none">
                            <div class="flex flex-1">
                                <div class="flex flex-col">
    
                                    {{-- Title --}}
                                    <div class="dark:text-zinc-200 flex font-bold gap-x-2 items-center text-slate-700 text-xs+ tracking-wide">
                                        <i class="ph-duotone ph-folder-simple text-xl"></i>
                                        <span>Regular license</span>
                                    </div>
    
                                    {{-- Description --}}
                                    <span class="mt-1 flex items-center text-xs text-slate-500 dark:text-zinc-400">
                                        Some add-ons are not included. Valid for one single domain.
                                    </span>
                                    
                                </div>
                            </div>
    
                            {{-- Selected --}}
                            @if ($license === 'regular')
                                <svg class="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                            @endif
    
                        </a>
    
                        {{-- Extended license --}}
                        <a href="https://codecanyon.net/item/riverr-freelance-services-marketplace/39634853" target="_blank" class="relative flex rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 p-4 focus:outline-none">
                            <div class="flex flex-1">
                                <div class="flex flex-col">
    
                                    {{-- Title --}}
                                    <div class="dark:text-zinc-200 flex font-bold gap-x-2 items-center text-slate-700 text-xs+ tracking-wide">
                                        <i class="ph-duotone ph-crown text-xl"></i>
                                        <span>Extended license</span>
                                    </div>
    
                                    {{-- Description --}}
                                    <span class="mt-1 flex items-center text-xs text-slate-500 dark:text-zinc-400">
                                        All current and future add-ons are included. Valid for multiple domains. 50% discount on mobile apps when we release them.
                                    </span>
                                    
                                </div>
                            </div>
    
                            {{-- Selected --}}
                            @if ($license === 'extended')
                                <svg class="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                            @endif
    
                        </a>

                    </div>
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-10">
                    <div class="h-px w-full bg-zinc-200 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Buyer --}}
                <div class="col-span-12">
                    <x-forms.text-input disabled
                        label="Buyer"
                        placeholder="Buyer"
                        model="buyer"
                        icon="user" />
                </div>

                {{-- Supported until --}}
                <div class="col-span-12">
                    <x-forms.text-input disabled
                        label="Supported until"
                        placeholder="Supported until"
                        model="supported_until"
                        icon="clock-clockwise" />
                </div>

                {{-- Currenty supported --}}
                <div class="col-span-12">
                    <x-forms.text-input disabled
                        label="Support"
                        placeholder="Support"
                        model="currently_supported"
                        icon="question" />
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