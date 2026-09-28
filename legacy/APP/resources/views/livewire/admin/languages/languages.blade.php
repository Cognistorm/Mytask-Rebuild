<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_languages')
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
                                @lang('messages.t_languages')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

        {{-- Actions --}}
        <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4 justify-between">

            {{-- Create --}}
            <a href="{{ admin_url('languages/create') }}" class="btn p-2.5 hover:shadow-none ring-slate-300 dark:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-slate-300 dark:focus:ring-offset-zinc-600 space-x-2 rtl:space-x-reverse border">
                <x-icon class="w-6 h-6 text-gray-400 dark:text-zinc-300" name="plus" variant="solid" mini />
            </a>

        </div>

    </div>

    {{-- Content --}}
    <div class="grid grid-cols-12 gap-6 mt-5">
        <div class="col-span-12 overflow-auto lg:overflow-visible">
            <table class="table table-report -mt-2">
                <thead>
                    <tr>

                        <th>@lang('messages.t_language')</th>
                        <th class="text-center">@lang('messages.t_language_code')</th>
                        <th class="text-center">@lang('messages.t_rtl')</th>
                        <th class="text-center">@lang('messages.t_status')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>
                    @forelse ($languages as $lang)
                        <tr wire:key="languages-{{ $lang->uid }}">
                        
                            {{-- Language --}}
                            <td>
                                <div class="flex items-center">
                                    <img class="h-3" src="{{ countryFlag($lang->country_code) }}" alt="{{ $lang->name }}">
                                    <p class="text-sm font-semibold text-gray-600 dark:text-zinc-300 ltr:ml-2 rtl:mr-2">{{ $lang->name }}</p>
                                </div>
                            </td>

                            {{-- Language code --}}
                            <td class="text-center">
                                <p class="font-semibold text-xs+ dark:text-zinc-300">{{ $lang->language_code }}</p>
                            </td>

                            {{-- RTL --}}
                            <td class="text-center">

                                {{-- Enabled --}}
                                @if ($lang->force_rtl)
                                    <span class="px-4 py-1 text-[10px] uppercase tracking-wide rounded-2xl font-semibold text-green-500 bg-green-50 dark:bg-zinc-700 dark:text-zinc-200">
                                        {{ __('messages.t_enabled') }}
                                    </span>
                                @else
                                    <span class="px-4 py-1 text-[10px] uppercase tracking-wide rounded-2xl font-semibold text-red-500 bg-red-50 dark:bg-zinc-700 dark:text-zinc-200">
                                        {{ __('messages.t_disabled') }}
                                    </span>
                                @endif

                            </td>

                            {{-- Status --}}
                            <td class="text-center">

                                {{-- Active --}}
                                @if ($lang->is_active)
                                    <span class="px-4 py-1 text-[10px] uppercase tracking-wide rounded-2xl font-semibold text-green-500 bg-green-50 dark:bg-zinc-700 dark:text-zinc-200">
                                        {{ __('messages.t_active') }}
                                    </span>
                                @else
                                    <span class="px-4 py-1 text-[10px] uppercase tracking-wide rounded-2xl font-semibold text-red-500 bg-red-50 dark:bg-zinc-700 dark:text-zinc-200">
                                        {{ __('messages.t_inactive') }}
                                    </span>
                                @endif

                            </td>

                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">

                                    {{-- Translate --}}
                                    <x-table.action-button
                                        icon="translate" 
                                        :title="__('messages.t_edit_translation')"
                                        href="{{ admin_url('languages/translate/' . $lang->uid) }}" />

                                    {{-- Edit --}}
                                    <x-table.action-button 
                                        icon="pencil" 
                                        :title="__('messages.t_edit_language')"
                                        href="{{ admin_url('languages/edit/' . $lang->uid) }}" />

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        wire:confirm="{{ __('messages.t_are_u_sure_u_want_to_delete_this') }}"
                                        icon="trash" 
                                        :title="__('messages.t_delete_language')"
                                        icon-color="text-red-600"
                                        action="delete('{{ $lang->id }}')" />

                                </div>
                            </td>

                        </tr>
                    @empty
                        <tr>
                            <td colspan="5">
                                <div class="text-center px-4 bw-empty-state py-10">

                                    {{-- Image --}}
                                    <img src="{{ asset('img/svg/no-results.svg') }}" class="h-44 rounded-full border w-44 object-cover border-slate-50 max-w-xs mx-auto mb-6">  
                                    
                                    {{-- Info --}}
                                    <div class="text-slate-600/70 dark:text-zinc-300 font-normal px-6">
                                        @lang('dashboard.t_no_results_table_hint')
                                    </div> 

                                    {{-- Create --}}
                                    <a href="{{ admin_url('packages/create') }}" class="bw-button primary !bg-primary-600 focus:ring-primary-500/70 hover:!bg-primary-700 active:!bg-primary-700 focus:!ring cursor-pointer rounded-full inline-block mx-auto my-4 !px-10 !font-normal !text-[11px] !py-2.5 tracking-widest uppercase">
                                        <span class="grow">@lang('messages.t_create')</span>
                                    </a>

                                </div>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    {{-- Pagination --}}
    @if ($languages->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $languages->links('pagination::tailwind') !!}
        </div>
    @endif

</div>