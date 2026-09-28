<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('dashboard.t_caching_system')
            </h2>

            {{-- Breadcrumbs --}}
            <div class="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6 rtl:space-x-reverse">
                <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">

                    {{-- Main home --}}
                    <li>
                        <div class="flex items-center">
                            <a href="{{ url('/') }}" class="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-zinc-300 dark:hover:text-white">
                                @lang('messages.t_home')
                            </a>
                        </div>
                    </li>
    
                    {{-- Dashboard --}}
                    <li aria-current="page">
                        <div class="flex items-center">
                            <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                            <a href="{{ admin_url('/') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                                @lang('messages.t_dashboard')
                            </a>
                        </div>
                    </li>
    
                    {{-- Current page --}}
                    <li aria-current="page">
                        <div class="flex items-center">
                            <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                            <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">
                                @lang('messages.t_cache')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

    </div>

    {{-- Content --}}
    <ul role="list" class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">

        {{-- System cache --}}
        <li class="col-span-1">
            <button wire:click="clear('cache')" wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}" type="button" class="card dark:hover:bg-zinc-900 dark:hover:text-white dark:text-zinc-200 font-semibold hover:bg-gray-100 hover:text-gray-900 inline-flex items-center justify-center px-4 py-3 rounded-lg text-gray-500 text-xs truncate bg-white">

                {{-- Icon --}}
                <i class="ph-duotone ph-hard-drives ltr:mr-3 rtl:ml-3 text-2xl text-red-400"></i>      
                
                {{-- Text --}}
                <span class="w-full tracking-wide ltr:text-left rtl:text-right">
                    @lang('dashboard.t_clear_system_cache')
                </span>

                {{-- Info button --}}
                <i class="ph-duotone ph-question ltr:ml-2 rtl:mr-2 text-xl text-slate-300 hover:text-slate-500 dark:text-zinc-400 dark:hover:text-zinc-200" data-popover-target="caching-system-popover-1" data-popover-trigger="hover" data-popover-placement="bottom"></i>

                {{-- Info container --}}
                <div data-popover id="caching-system-popover-1" role="tooltip" class="absolute card duration-300 font-normal inline-block leading-6 opacity-0 rounded text-slate-500 dark:text-zinc-300 text-xs transition-opacity invisible w-64 z-10">
                    <div class="px-3 py-2">
                        <p>@lang('dashboard.t_cache_system_popover_info')</p>
                    </div>
                    <div data-popper-arrow></div>
                </div>

            </button>
        </li>

        {{-- Views --}}
        <li class="col-span-1">
            <button wire:click="clear('views')" wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}" type="button" class="card dark:hover:bg-zinc-900 dark:hover:text-white dark:text-zinc-200 font-semibold hover:bg-gray-100 hover:text-gray-900 inline-flex items-center justify-center px-4 py-3 rounded-lg text-gray-500 text-xs truncate bg-white">

                {{-- Icon --}}
                <i class="ph-duotone ph-files ltr:mr-3 rtl:ml-3 text-2xl text-blue-400"></i>      
                
                {{-- Text --}}
                <span class="w-full tracking-wide ltr:text-left rtl:text-right">
                    @lang('dashboard.t_clear_compiled_views_cache')
                </span>

                {{-- Info button --}}
                <i class="ph-duotone ph-question ltr:ml-2 rtl:mr-2 text-xl text-slate-300 hover:text-slate-500 dark:text-zinc-400 dark:hover:text-zinc-200" data-popover-target="caching-system-popover-2" data-popover-trigger="hover" data-popover-placement="bottom"></i>

                {{-- Info container --}}
                <div data-popover id="caching-system-popover-2" role="tooltip" class="absolute card duration-300 font-normal inline-block leading-6 opacity-0 rounded text-slate-500 dark:text-zinc-300 text-xs transition-opacity invisible w-64 z-10">
                    <div class="px-3 py-2">
                        <p>@lang('dashboard.t_views_cache_popover_info')</p>
                    </div>
                    <div data-popper-arrow></div>
                </div>

            </button>
        </li>

        {{-- Sessions --}}
        <li class="col-span-1">
            <button wire:click="clear('sessions')" wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}" type="button" class="card dark:hover:bg-zinc-900 dark:hover:text-white dark:text-zinc-200 font-semibold hover:bg-gray-100 hover:text-gray-900 inline-flex items-center justify-center px-4 py-3 rounded-lg text-gray-500 text-xs truncate bg-white">

                {{-- Icon --}}
                <i class="ph-duotone ph-database ltr:mr-3 rtl:ml-3 text-2xl text-amber-400"></i>      
                
                {{-- Text --}}
                <span class="w-full tracking-wide ltr:text-left rtl:text-right">
                    @lang('dashboard.t_clear_sessions_cache')
                </span>

                {{-- Info button --}}
                <i class="ph-duotone ph-question ltr:ml-2 rtl:mr-2 text-xl text-slate-300 hover:text-slate-500 dark:text-zinc-400 dark:hover:text-zinc-200" data-popover-target="caching-system-popover-3" data-popover-trigger="hover" data-popover-placement="bottom"></i>

                {{-- Info container --}}
                <div data-popover id="caching-system-popover-3" role="tooltip" class="absolute card duration-300 font-normal inline-block leading-6 opacity-0 rounded text-slate-500 dark:text-zinc-300 text-xs transition-opacity invisible w-64 z-10">
                    <div class="px-3 py-2">
                        <p>@lang('dashboard.t_clear_sessions_popover_info')</p>
                    </div>
                    <div data-popper-arrow></div>
                </div>

            </button>
        </li>

        {{-- Log --}}
        <li class="col-span-1">
            <button wire:click="clear('log')" wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}" type="button" class="card dark:hover:bg-zinc-900 dark:hover:text-white dark:text-zinc-200 font-semibold hover:bg-gray-100 hover:text-gray-900 inline-flex items-center justify-center px-4 py-3 rounded-lg text-gray-500 text-xs truncate bg-white">

                {{-- Icon --}}
                <i class="ph-duotone ph-bug ltr:mr-3 rtl:ml-3 text-2xl text-green-400"></i>      
                
                {{-- Text --}}
                <span class="w-full tracking-wide ltr:text-left rtl:text-right">
                    @lang('dashboard.t_clear_log_files')
                </span>

                {{-- Info button --}}
                <i class="ph-duotone ph-question ltr:ml-2 rtl:mr-2 text-xl text-slate-300 hover:text-slate-500 dark:text-zinc-400 dark:hover:text-zinc-200" data-popover-target="caching-system-popover-4" data-popover-trigger="hover" data-popover-placement="bottom"></i>

                {{-- Info container --}}
                <div data-popover id="caching-system-popover-4" role="tooltip" class="absolute card duration-300 font-normal inline-block leading-6 opacity-0 rounded text-slate-500 dark:text-zinc-300 text-xs transition-opacity invisible w-64 z-10">
                    <div class="px-3 py-2">
                        <p>@lang('dashboard.t_clear_log_files_popover_info')</p>
                    </div>
                    <div data-popper-arrow></div>
                </div>

            </button>
        </li>
  
    </ul>
    
</div>
