<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_comments')
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
                                @lang('messages.t_comments')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

    </div>

    {{-- Content --}}
    <div class="grid grid-cols-12 gap-6 mt-5">
        <div class="col-span-12 overflow-auto lg:overflow-visible">
            <table class="table table-report -mt-2">
                <thead>
                    <tr>

                        <th>@lang('messages.t_article')</th>
                        <th>@lang('messages.t_name')</th>
                        <th>@lang('messages.t_email_address')</th>
                        <th class="text-center">@lang('messages.t_date')</th>
                        <th class="text-center">@lang('messages.t_status')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>
                    @forelse ($comments as $comment)
                        <tr wire:key="comments-{{ $comment->uid }}">
                        
                            {{-- Article --}}
                            <td>
                                <div class="flex items-center">
                                    <div class="h-10 w-10 inline-flex flex-shrink-0 relative">
                                        @if ($comment->article->image)
                                            <img class="w-full h-full block mask is-squircle" src="{{ src($comment->article->image) }}" alt="{{ $comment->article->title }}">
                                        @else
                                            @php
                                                $faker = Faker\Factory::create();
                                                $color = $faker->rgbColor();
                                            @endphp
                                            <div class="flex items-center justify-center h-full w-full mask is-squircle text-sm uppercase dark:bg-navy-500 dark:text-navy-100 font-medium" style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                                {{ Str::substr($comment->article->title, 0, 2) }}
                                            </div>   
                                        @endif
                                    </div>
                                    <div class="ltr:pl-3 rtl:pr-3">
                                        <a href="{{ url('blog', $comment->article->slug) }}" target="_blank" class="font-semibold text-xs+ hover:text-primary-600 dark:hover:text-primary-600 dark:text-white truncate pb-1.5 block max-w-xs">
                                            {{ $comment->article->title }}
                                        </a>
                                        <div class="flex items-center text-xs font-normal text-gray-400 dark:text-zinc-300">
                                            <span class="hover:text-gray-600 dark:hover:text-zinc-100">{{ $comment->article->slug }}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {{-- Name --}}
                            <td>
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500">{{ $comment->name }}</span>
                            </td>

                            {{-- Email address --}}
                            <td>
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500">{{ $comment->email }}</span>
                            </td>

                            {{-- Date --}}
                            <td class="text-center">
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500">{{ format_date($comment->created_at, 'ago') }}</span>
                            </td>

                            {{-- Status --}}
                            <td class="text-center">
                                @switch($comment->status)

                                    {{-- Pending --}}
                                    @case('pending')
                                        <span class="bg-amber-100 text-amber-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                            @lang('messages.t_pending')
                                        </span>
                                    @break

                                    {{-- Active --}}
                                    @case('active')
                                        <span class="bg-green-100 text-green-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                            @lang('messages.t_active')
                                        </span>
                                    @break

                                    {{-- Hidden --}}
                                    @case('hidden')
                                        <span class="bg-gray-100 text-gray-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                            @lang('messages.t_hidden')
                                        </span>
                                    @break

                                @endswitch
                            </td>

                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">

                                    {{-- Edit --}}
                                    <x-table.action-button 
                                        icon="pencil" 
                                        :title="__('messages.t_edit_and_view')"
                                        href="{{ admin_url('blog/comments/edit/' . $comment->uid) }}" />

                                    {{-- Hide --}}
                                    @if ($comment->status !== 'hidden')
                                        <x-table.action-button 
                                            wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}"
                                            icon="eye-slash" 
                                            :title="__('messages.t_hide_comment')"
                                            action="hide('{{ $comment->id }}')" />
                                    @endif

                                    {{-- Approve --}}
                                    @if ($comment->status === 'pending')
                                        <x-table.action-button 
                                            wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}"
                                            icon="list-checks" 
                                            :title="__('messages.t_approve_comment')"
                                            icon-color="text-green-600"
                                            action="approve('{{ $comment->id }}')" />
                                    @endif

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        wire:confirm="{{ __('messages.t_are_u_sure_u_want_to_delete_this') }}"
                                        icon="trash" 
                                        :title="__('messages.t_delete_comment')"
                                        icon-color="text-red-600"
                                        action="delete('{{ $comment->id }}')" />

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
    @if ($comments->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $comments->links('pagination::tailwind') !!}
        </div>
    @endif

</div>