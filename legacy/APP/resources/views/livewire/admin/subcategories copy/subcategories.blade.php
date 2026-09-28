<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_subcategories')
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
                                @lang('messages.t_subcategories')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

        {{-- Actions --}}
        <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4 justify-between">

            {{-- Create --}}
            <a wire:navigate href="{{ admin_url('subcategories/create') }}" class="btn p-2.5 hover:shadow-none ring-slate-300 dark:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-slate-300 dark:focus:ring-offset-zinc-600 space-x-2 rtl:space-x-reverse border">
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

                        <th>@lang('messages.t_subcategory')</th>
                        <th>@lang('messages.t_category')</th>
                        <th class="text-center">@lang('messages.t_gigs')</th>
                        <th class="text-center">@lang('messages.t_projects')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>

                    @foreach ($subcategories as $subcategory)
                        <tr wire:key="subcategories-{{ $subcategory->uid }}">

                            {{-- Subcategory --}}
                            <td>
                                <div class="flex items-center space-x-3 rtl:space-x-reverse">
                                    <div class="h-10 w-10 inline-flex flex-shrink-0 relative">
                                        @if ($subcategory->icon)
                                            <img class="mask is-squircle object-cover w-full h-full block" src="{{ src($subcategory->icon) }}" alt="{{ $subcategory->name }}">
                                        @else
                                            @php
                                                $faker = Faker\Factory::create();
                                                $color = $faker->rgbColor();
                                            @endphp
                                            <div class="flex items-center justify-center h-full w-full mask is-squircle text-sm uppercase dark:bg-navy-500 dark:text-navy-100 font-medium" style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                                {{ Str::substr($subcategory->name, 0, 2) }}
                                            </div>   
                                        @endif
                                    </div>
                                    <div>
                                        <a href="{{ url('categories/' . $subcategory->parent->slug . '/' . $subcategory->slug) }}" target="_blank" class="text-sm font-semibold whitespace-nowrap dark:text-zinc-100">
                                            {{ $subcategory->name }}
                                        </a>
                                        <div class="text-slate-500 text-xs whitespace-nowrap mt-px dark:text-zinc-300">
                                            {{ $subcategory->slug }}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {{-- Category --}}
                            <td>
                                <div class="flex items-center space-x-3 rtl:space-x-reverse">
                                    <div class="h-10 w-10 inline-flex flex-shrink-0 relative">
                                        @if ($subcategory->parent->icon)
                                            <img class="mask is-squircle object-cover w-full h-full block" src="{{ src($subcategory->parent->icon) }}" alt="{{ $subcategory->parent->name }}">
                                        @else
                                            @php
                                                $faker = Faker\Factory::create();
                                                $color = $faker->rgbColor();
                                            @endphp
                                            <div class="flex items-center justify-center h-full w-full mask is-squircle text-sm uppercase dark:bg-navy-500 dark:text-navy-100 font-medium" style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                                {{ Str::substr($subcategory->parent->name, 0, 2) }}
                                            </div>   
                                        @endif
                                    </div>
                                    <div>
                                        <a href="{{ url('categories', $subcategory->parent->slug) }}" target="_blank" class="text-sm font-semibold whitespace-nowrap dark:text-zinc-100">
                                            {{ $subcategory->parent->name }}
                                        </a>
                                        <div class="text-slate-500 text-xs whitespace-nowrap mt-px dark:text-zinc-300">
                                            {{ $subcategory->parent->slug }}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {{-- Total gigs --}}
                            <td class="text-center">
                                <span class="text-sm font-semibold text-gray-500 dark:text-zinc-300">{{ $subcategory->gigs_count }}</span>
                            </td>

                            {{-- Total projects --}}
                            <td class="text-center">
                                <span class="text-sm font-semibold text-gray-500 dark:text-zinc-300">{{ $subcategory->projects_count }}</span>
                            </td>
                            
                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">

                                    {{-- Edit --}}
                                    <x-table.action-button 
                                        icon="pencil" 
                                        :title="__('messages.t_edit')"
                                        href="{{ admin_url('subcategories/edit/' . $subcategory->uid) }}" />

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        icon="trash" 
                                        :title="__('messages.t_delete')"
                                        icon-color="text-red-600"
                                        action="delete('{{ $subcategory->uid }}', true)" />

                                </div>
                            </td>
                        </tr>
                    @endforeach

                </tbody>
            </table>
        </div>
    </div>

    {{-- Pagination --}}
    @if ($subcategories->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $subcategories->links('pagination::tailwind') !!}
        </div>
    @endif

</div>