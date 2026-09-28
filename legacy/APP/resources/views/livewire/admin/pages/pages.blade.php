<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_pages')
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
                                @lang('messages.t_pages')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

        {{-- Actions --}}
        <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4 justify-between">

            {{-- Create --}}
            <a href="{{ admin_url('pages/create') }}" class="btn p-2.5 hover:shadow-none ring-slate-300 dark:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-slate-300 dark:focus:ring-offset-zinc-600 space-x-2 rtl:space-x-reverse border">
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

                        <th>@lang('messages.t_title')</th>
                        <th>@lang('messages.t_slug')</th>
                        <th class="text-center">@lang('dashboard.t_type')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>
                    @forelse ($pages as $page)
                        <tr wire:key="pages-{{ $page->uid }}">
                        
                            {{-- Title --}}
                            <td>
                                <span class="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                                    {{ $page->title }}
                                </span>
                            </td>

                            {{-- Slug --}}
                            <td>
                                <span class="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                                    {{ $page->slug }}
                                </span>
                            </td>

                            {{-- Type --}}
                            <td class="text-center">
                                
                                {{-- Link --}}
                                @if ($page->is_link && $page->link)
                                    <span class="bg-blue-100 text-blue-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] tracking-wide whitespace-nowrap">
                                        @lang('messages.t_link')
                                    </span>
                                @endif

                                {{-- Page --}}
                                @if (!$page->is_link && !$page->link)
                                    <span class="bg-gray-100 text-gray-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] tracking-wide whitespace-nowrap">
                                        @lang('dashboard.t_page')
                                    </span>
                                @endif

                            </td>

                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">

                                    {{-- View --}}
                                    <x-table.action-button 
                                        target="_blank"
                                        icon="eye" 
                                        :title="__('messages.t_view')"
                                        href="{{ $page->is_link ? $page->link : url('page', $page->slug) }}" />

                                    {{-- Edit --}}
                                    <x-table.action-button 
                                        icon="pencil" 
                                        :title="__('messages.t_edit')"
                                        href="{{ admin_url('pages/edit/' . $page->uid) }}" />

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        wire:confirm="{{ __('messages.t_are_u_sure_u_want_to_delete_this') }}"
                                        icon="trash" 
                                        :title="__('messages.t_delete')"
                                        icon-color="text-red-600"
                                        action="delete('{{ $page->id }}')" />

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
                                    <a href="{{ admin_url('pages/create') }}" class="bw-button primary !bg-primary-600 focus:ring-primary-500/70 hover:!bg-primary-700 active:!bg-primary-700 focus:!ring cursor-pointer rounded-full inline-block mx-auto my-4 !px-10 !font-normal !text-[11px] !py-2.5 tracking-widest uppercase dark:focus:ring-offset-0 dark:focus:ring-offset-transparent">
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
    @if ($pages->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $pages->links('pagination::tailwind') !!}
        </div>
    @endif

</div>