<div class="w-full sm:mx-auto sm:max-w-2xl">
	<div class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-cpu"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_cron_jobs')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_cron_jobs_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

				{{-- Queue commands --}}
				<div class="col-span-12">
					<kbd class="px-2 pt-2 pb-[9px] w-full block text-xs+ font-normal text-zinc-100 bg-[#262121] rounded">
						<span class="text-amber-500">curl</span> {{ $command_queue }}
					</kbd>
				</div>
		
				{{-- Schedule commands --}}
				<div class="col-span-12">
					<kbd class="px-2 pt-2 pb-[9px] w-full block text-xs+ font-normal text-zinc-100 bg-[#262121] rounded">
						<span class="text-amber-500">curl</span> {{ $command_schedule }}
					</kbd>
				</div>

				{{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-100">
                        <div class="flex items-center gap-x-3">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block w-5 h-5 flex-none text-blue-600"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>
                            <h3 class="font-semibold grow text-xs leading-5">
                                @lang('dashboard.t_cron_jobs_explain_hint')
                            </h3>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
            
	</div>
</div>