<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_newsletter_emails')
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
                                @lang('messages.t_newsletter_emails')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

        {{-- Export --}}
        <div class="min-w-[10rem] mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4 justify-between space-x-2 rtl:space-x-reverse">

            {{-- Export button --}}
            <button id="export-emails-btn" data-dropdown-toggle="export-emails-dropwon" class="border shadow-sm text-gray-500 bg-white hover:bg-gray-100 focus:outline-none font-semibold rounded text-xs+ tracking-wide px-5 py-2.5 inline-flex items-center dark:bg-zinc-600 dark:hover:bg-zinc-800 dark:border-transparent dark:text-zinc-200" type="button">
                <span>@lang('messages.t_export_emails')</span>
                <svg class="w-2 h-2 ltr:ml-2.5 rtl:mr-2.5 text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/></svg>
            </button>

            {{-- Export dropdown --}}
            <div id="export-emails-dropwon" class="z-10 hidden shadow-sm border bg-white dark:bg-zinc-800 dark:border-zinc-700 rounded-md w-44">
                <ul class="py-2 text-xs font-semibold text-gray-700 dark:text-zinc-200" aria-labelledby="export-emails-btn">

                    {{-- Export all --}}
                    <li>
                        <button type="button" wire:click="export('all')" class="w-full block px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-700 dark:hover:text-white ltr:text-left rtl:text-right">
                            @lang('messages.t_export_all')
                        </button>
                    </li>

                    {{-- Export pending --}}
                    <li>
                        <button type="button" wire:click="export('pending')" class="w-full block px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-700 dark:hover:text-white ltr:text-left rtl:text-right">
                            @lang('messages.t_export_pending')
                        </button>
                    </li>

                    {{-- Export verified --}}
                    <li>
                        <button type="button" wire:click="export('verified')" class="w-full block px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-700 dark:hover:text-white ltr:text-left rtl:text-right">
                            @lang('messages.t_export_verified')
                        </button>
                    </li>
                    
                </ul>
            </div>

        </div>

    </div>

    {{-- Content --}}
    <div class="grid grid-cols-12 gap-6 mt-5">
        <div class="col-span-12 overflow-auto lg:overflow-visible">
            <table class="table table-report -mt-2">
                <thead>
                    <tr>

                        <th>@lang('messages.t_email_address')</th>
                        <th>@lang('messages.t_ip_address')</th>
                        <th class="text-center">@lang('messages.t_date')</th>
                        <th class="text-center">@lang('messages.t_status')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>
                    @forelse ($lists as $list)
                        <tr wire:key="lists-{{ $list->uid }}">
                        
                            {{-- Email address --}}
                            <td>
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500">{{$list->email }}</span>
                            </td>

                            {{-- Ip address --}}
                            <td>
                                <a href="https://ip-api.com/#{{ $list->ip_address }}" target="_blank" class="text-xs font-normal text-primary-600 hover:underline">
                                    {{$list->ip_address }}
                                </a>
                            </td>

                            {{-- Date --}}
                            <td class="text-center">
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500">
                                    {{ format_date($list->created_at, 'ago') }}
                                </span>
                            </td>

                            {{-- Status --}}
                            <td class="text-center">
                                @switch($list->status)

                                    {{-- Pending --}}
                                    @case('pending')
                                        <span class="bg-amber-100 text-amber-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                            @lang('messages.t_pending')
                                        </span>
                                    @break

                                    {{-- Verified --}}
                                    @case('verified')
                                        <span class="bg-green-100 text-green-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                            @lang('messages.t_verified')
                                        </span>
                                    @break

                                @endswitch
                            </td>

                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                                        
                                    {{-- Send --}}
                                    <x-table.action-button 
                                        icon="paper-plane-tilt" 
                                        :title="__('messages.t_send_an_email')"
                                        href="{{ admin_url('newsletter/send/' . $list->uid) }}" />

                                    {{-- Resend verification --}}
                                    @if ($list->status === 'pending')
                                        <x-table.action-button 
                                            wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}"
                                            icon="repeat" 
                                            :title="__('messages.t_resend_verification')"
                                            action="resend('{{ $list->id }}')" />
                                    @endif

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        wire:confirm="{{ __('messages.t_are_u_sure_u_want_to_delete_this') }}"
                                        icon="trash" 
                                        :title="__('messages.t_delete')"
                                        icon-color="text-red-600"
                                        action="delete('{{ $list->id }}')" />

                                </div>
                            </td>

                        </tr>
                    @empty
                        <tr>
                            <td colspan="6">
                                <div class="text-center px-4 bw-empty-state py-10">

                                    {{-- Image --}}
                                    <img src="{{ asset('img/svg/no-results.svg') }}" class="h-44 rounded-full border w-44 object-cover border-slate-50 max-w-xs mx-auto mb-6">  
                                    
                                    {{-- Info --}}
                                    <div class="text-slate-600/70 dark:text-zinc-300 font-normal px-6">
                                        @lang('dashboard.t_no_results_table_hint')
                                    </div>

                                </div>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    {{-- Pagination --}}
    @if ($lists->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $lists->links('pagination::tailwind') !!}
        </div>
    @endif

</div>