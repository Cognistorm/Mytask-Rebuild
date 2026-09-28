<div x-show="notifications_menu" style="display: none" class="fixed inset-0 flex z-40" x-ref="notifications_menu">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Backdrop --}}
    <div 
        x-show="notifications_menu" 
        style="display: none" 
        x-transition:enter="ease-in-out duration-500" 	
        x-transition:enter-start="opacity-0"
        x-transition:enter-end="opacity-100" x-transition:leave="ease-in-out duration-500"
        x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
        class="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
        @click="notifications_menu = false"
        aria-hidden="true"></div>

    {{-- Menu --}}
    <div 
        x-show="notifications_menu" 
        style="display: none"
        x-transition:enter="transition ease-in-out duration-300 transform"
        x-transition:enter-start="ltr:translate-x-full rtl:-translate-x-full"
        x-transition:enter-end="ltr:translate-x-0 rtl:-translate-x-0"
        x-transition:leave="transition ease-in-out duration-300 transform"
        x-transition:leave-start="ltr:-translate-x-0 rtl:translate-x-0"
        x-transition:leave-end="ltr:translate-x-full rtl:-translate-x-full"
        class="fixed ltr:right-0 rtl:left-0 max-w-sm w-full bg-white dark:bg-zinc-700 shadow-xl flex flex-col h-full">

        {{-- Section --}}
        <div class="pt-8 px-6 lg:px-6 w-full sm:flex sm:justify-between sm:items-center">

            {{-- Title --}}
            <div class="flex justify-center sm:justify-left">
                <h3 class="inline-flex items-center font-semibold">
                    <span class="text-base dark:text-gray-100">@lang('messages.t_notifications')</span>
                </h3>
            </div>

            {{-- Close button --}}
            <div 
                x-show="notifications_menu" 
                x-transition:enter="ease-in-out duration-300" 
                x-transition:enter-start="opacity-0" 
                x-transition:enter-end="opacity-100" 
                x-transition:leave="ease-in-out duration-300" 
                x-transition:leave-start="opacity-100" 
                x-transition:leave-end="opacity-0" 
                class="top-0 ltr:right-0 rtl:left-0 pt-2 block">
                <button type="button" class="ltr:ml-1 rtl:mr-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white border border-gray-200 hover:border-gray-300 dark:border-zinc-500" @click="notifications_menu = false">
                    <span class="sr-only">Close sidebar</span>
                    <svg class="text-gray-400 dark:text-zinc-300 h-5 w-5" x-description="Heroicon name: outline/x" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

        </div>

        {{-- List of notifications --}}
        <div class="w-full overflow-auto h-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-zinc-900 dark:scrollbar-track-zinc-600">
            <div class="space-y-2 py-6">
                @foreach ($notifications as $n)
                    <div class="px-6 pb-1 pt-2" wire:key="header-notifications-{{ $n->uid }}">
                        <div class="flex items-center bg-slate-100 px-4 py-2 rounded dark:bg-zinc-600">
                            <div class="flex-shrink-0">
                                <span class="rounded-md h-10 w-10 flex items-center justify-center dark:text-zinc-400 dark:border-zinc-500 border border-slate-300 text-slate-400">
                                    <svg class="h-5 w-5" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M19 13.586V10c0-3.217-2.185-5.927-5.145-6.742C13.562 2.52 12.846 2 12 2s-1.562.52-1.855 1.258C7.185 4.074 5 6.783 5 10v3.586l-1.707 1.707A.996.996 0 0 0 3 16v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a.996.996 0 0 0-.293-.707L19 13.586zM19 17H5v-.586l1.707-1.707A.996.996 0 0 0 7 14v-4c0-2.757 2.243-5 5-5s5 2.243 5 5v4c0 .266.105.52.293.707L19 16.414V17zm-7 5a2.98 2.98 0 0 0 2.818-2H9.182A2.98 2.98 0 0 0 12 22z"></path></svg>
                                </span>
                            </div>
                            <div class="ltr:ml-3 rtl:mr-3 w-0 flex-1">
                                <p class="dark:text-white text-[13px] font-normal text-slate-500 leading-relaxed">
                                    @if ($n->params)
                                        {!! __('messages.' . $n->text, $n->params) !!}
                                    @else
                                        {!! __('messages.' . $n->text) !!}
                                    @endif
                                </p>
                                <div class="mt-2 flex space-x-7 rtl:space-x-reverse">

                                    {{-- View --}}
                                    <a href="{{ $n->action }}" class="bg-transparent rounded-md text-primary-600 hover:text-primary-700 focus:outline-none text-xs tracking-wide dark:text-zinc-200 dark:hover:text-white">
                                        {{ __('messages.t_view') }}
                                    </a>
                                    
                                    {{-- Mark as read --}}
                                    <button wire:click="read('{{ $n->uid }}')" wire:loading.attr="disabled" wire:target="read('{{ $n->uid }}')" type="button" class="bg-transparent rounded-md text-gray-700 hover:text-gray-500 focus:outline-none text-xs tracking-wide dark:text-zinc-200 dark:hover:text-white">
                                        {{ __('messages.t_mark_as_read') }}
                                    </button>

                                </div>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
        
    </div>

</div>