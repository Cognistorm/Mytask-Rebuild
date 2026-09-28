<div class="w-full md:max-w-2xl lg:px-20 pt-5 lg:pt-12 mx-auto">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Steps --}}
    <div class="mb-10">

        {{-- Current step --}}
        <p class="text-xs font-semibold tracking-wide text-gray-500">5/6 - Cron jobs</p>
    
        {{-- Progress bar --}}
        <div class="mt-4 overflow-hidden rounded-full bg-gray-200">
            <div class="h-2 w-5/6 rounded-full bg-indigo-600"></div>
        </div>
        
    </div>

    {{-- Content --}}
    <x-form wire:submit="next" class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-checks"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    Cron jobs
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    Config scheduled tasks on your server
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6"> 

                {{-- Info --}}
                <div class="col-span-12">
                    <p class="mb-6 text-xs font-normal tracking-wider leading-7 text-gray-500">
                        In order for Riverr to completely work, we have to run some tasks in the background, Please make sure that your server supports Crontab or contact your server provider to check if they support it.<br>
                        Save the following lines and check documentation file to see how to set cron jobs on your server.<br>
                        You can do this later and continue now your installation.<br>
                    </p>
                </div>

                {{-- Schedule --}}
                <div class="col-span-12">
                    <code class="block text-xs text-[#BFC7D5] bg-[#292D3E] px-4 leading-6 py-3"><span class="text-amber-500">curl</span> {{ url('tasks/schedule') }}</code>
                </div>

                {{-- Queue --}}
                <div class="col-span-12">
                    <code class="block text-xs text-[#BFC7D5] bg-[#292D3E] px-4 leading-6 py-3"><span class="text-amber-500">curl</span> {{ url('tasks/queue') }}</code>
                </div>

            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                Finish installation
            </x-bladewind.button>
        </div>

    </x-form>

</div>