<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_levels')
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
                                @lang('messages.t_levels')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

        {{-- Actions --}}
        <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4 justify-between">

            {{-- Create --}}
            <a href="{{ admin_url('levels/create') }}" class="btn p-2.5 hover:shadow-none ring-slate-300 dark:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-slate-300 dark:focus:ring-offset-zinc-600 space-x-2 rtl:space-x-reverse border">
                <x-icon class="w-6 h-6 text-gray-400 dark:text-zinc-300" name="plus" variant="solid" mini />
            </a>

        </div>

    </div>

    {{-- Success message --}}
    @if (session()->has('success'))
        <div class="rounded-md bg-green-50 p-4 mb-8">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                </div>
                <div class="ltr:ml-3 rtl:mr-3">
                    <h3 class="text-xs+ font-semibold text-green-600">
                        {{ session()->get('success') }}
                    </h3>
                </div>
            </div>
        </div>
    @endif

    {{-- Content --}}
    <div class="grid grid-cols-12 gap-6 mt-5">
        <div class="col-span-12 overflow-auto lg:overflow-visible">
            <table class="table table-report -mt-2">
                <thead>
                    <tr>

                        <th class="text-center">@lang('dashboard.t_badge_icon')</th>
                        <th class="text-center">@lang('messages.t_level')</th>
                        <th class="text-center">@lang('dashboard.t_level_order')</th>
                        <th class="text-center">@lang('messages.t_account_type')</th>
                        <th class="text-center">@lang('messages.t_total_users')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>
                    @forelse ($levels as $level)
                        <tr wire:key="levels-{{ $level->uid }}">
                        
                            {{-- Badge icon --}}
                            <td class="text-center">
                                <div class="h-10 w-10 inline-flex flex-shrink-0 relative mx-auto">
                                    @if ($level->badge)
                                        <img class="w-full h-full block" src="{{ src($level->badge) }}" alt="{{ $level->title }}">
                                    @else
                                        @php
                                            $faker = Faker\Factory::create();
                                            $color = $faker->rgbColor();
                                        @endphp
                                        <div class="flex items-center justify-center h-full w-full mask is-squircle text-sm uppercase dark:bg-navy-500 dark:text-navy-100 font-medium" style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                            {{ Str::substr($level->title, 0, 2) }}
                                        </div>   
                                    @endif

                                </div>
                            </td>

                            {{-- Level --}}
                            <td class="text-center">
                                <span class="px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap" style="color: {{ $level->level_color }};background-color: {{ $level->level_bg_color ? $level->level_bg_color : 'transparent' }};">
                                    {{ $level->title }}
                                </span>
                            </td>

                            {{-- Order --}}
                            <td class="text-center">
                                <div class="flex justify-center items-center gap-x-1">

                                    {{-- Input --}}
                                    <input wire:model="orders.{{ $level->id }}" type="number" class="max-w-[4rem] h-8 border-b-2 focus:ring-0 focus:outline-none border-t-0 border-x-0 border-slate-200 focus:border-primary-600 px-2 text-sm font-semibold text-zinc-600 dark:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:focus:border-primary-600">

                                    {{-- Save --}}
                                    <button wire:click="updateOrder({{ $level->id }})" class="h-8 w-8 inline-flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 rounded dark:bg-zinc-700 dark:text-gray-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                    </button>

                                </div>
                            </td>

                            {{-- Account type --}}
                            <td class="text-center">
                                @if ($level->account_type == 'seller')
                                    <span class="bg-blue-100 text-blue-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                        @lang('messages.t_freelancer')
                                    </span>
                                @else
                                    <span class="bg-red-100 text-red-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-xs whitespace-nowrap">
                                        @lang('messages.t_buyer')
                                    </span>
                                @endif
                            </td>

                            {{-- Total users --}}
                            <td class="text-center">
                                <span class="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                                    {{ $level->users_count }}
                                </span>
                            </td>

                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">

                                    {{-- Edit --}}
                                    <x-table.action-button 
                                        icon="pencil" 
                                        :title="__('messages.t_edit')"
                                        href="{{ admin_url('levels/edit/' . $level->uid) }}" />

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        icon="trash" 
                                        :title="__('messages.t_delete')"
                                        icon-color="text-red-600"
                                        href="{{ admin_url('levels/delete/' . $level->uid) }}" />

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

                                    {{-- Create --}}
                                    <a href="{{ admin_url('levels/create') }}" class="bw-button primary !bg-primary-600 focus:ring-primary-500/70 hover:!bg-primary-700 active:!bg-primary-700 focus:!ring cursor-pointer rounded-full inline-block mx-auto my-4 !px-10 !font-normal !text-[11px] !py-2.5 tracking-widest uppercase">
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
    @if ($levels->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $levels->links('pagination::tailwind') !!}
        </div>
    @endif

</div>