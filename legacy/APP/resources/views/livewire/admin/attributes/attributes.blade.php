<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('dashboard.t_attributes')
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
                                @lang('dashboard.t_attributes')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

        {{-- Actions --}}
        <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4 justify-between">

            {{-- Create --}}
            <a href="{{ admin_url('attributes/create') }}" class="btn p-2.5 hover:shadow-none ring-slate-300 dark:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-slate-300 dark:focus:ring-offset-zinc-600 space-x-2 rtl:space-x-reverse border">
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

                        <th>@lang('dashboard.t_attribute_name')</th>
                        <th>@lang('messages.t_category')</th>
                        <th class="text-center">@lang('dashboard.t_attribute_type')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>
                    @forelse ($attributes as $a)
                        <tr wire:key="attributes-{{ $a->uid }}">
                        
                            {{-- Name --}}
                            <td>
                                <div class="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                                    {{ $a->name }}

                                    {{-- Required? --}}
                                    @if ($a->is_required)
                                        <span class="text-red-500">*</span>
                                    @endif
                                </div>
                            </td>

                            {{-- Category --}}
                            <td>
                                <div class="text-xs font-semibold space-y-1.5 text-gray-500 tracking-wide">

                                    {{-- Parent category --}}
                                    @if ($a->category)
                                        <div class="flex items-center gap-x-1">
                                            <i class="ph-duotone ph-folder-open text-lg text-slate-600"></i>
                                            <a href="{{ url('categories', $a->category->slug) }}" target="_blank" class="hover:underline hover:text-primary-600 transition-all duration-200 ease-in-out">{{ $a->category->name }}</a>
                                        </div>
                                    @endif

                                    {{-- Subcategory --}}
                                    @if ($a->subcategory)
                                        <div class="flex items-center gap-x-1 ltr:ml-5 rtl:mr-5">
                                            <i class="ph-duotone ph-arrow-elbow-down-right text-lg text-slate-600"></i>
                                            <a href="{{ url('categories/' . $a->category->slug . '/' . $a->subcategory->slug) }}" target="_blank" class="hover:underline hover:text-primary-600 transition-all duration-200 ease-in-out">{{ $a->subcategory->name }}</a>
                                        </div>
                                    @endif

                                    {{-- childcategory --}}
                                    @if ($a->childcategory)
                                        <div class="flex items-center gap-x-1 ltr:ml-10 rtl:mr-10">
                                            <i class="ph-duotone ph-arrow-elbow-down-right text-lg text-slate-600"></i>
                                            <a href="{{ url('categories/' . $a->category->slug . '/' . $a->subcategory->slug . '/' . $a->childcategory->slug) }}" target="_blank" class="hover:underline hover:text-primary-600 transition-all duration-200 ease-in-out">{{ $a->childcategory->name }}</a>
                                        </div>
                                    @endif

                                </div>
                            </td>

                            {{-- Type --}}
                            <td class="text-center">

                                {{-- Checkbox --}}
                                @if ($a->type === 'checkbox')
                                    <div class="inline-flex items-center">
                                        <label class="relative flex items-center" for="attribute-element-checkbox-{{ $a->uid }}">
                                        <input
                                                @if ($a->is_disabled) disabled @endif
                                                @if ($a->is_checked) checked @endif
                                                type="checkbox"
                                                class="peer relative h-5 w-5 cursor-pointer appearance-none rounded-sm border-2 border-slate-200 transition-all enabled:checked:border-primary-600 enabled:checked:bg-primary-600 checked:before:bg-primary-600 enabled:checked:hover:bg-primary-600 disabled:checked:hover:bg-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed focus:ring-offset-0 focus:ring-2 focus:ring-opacity-25 focus:ring-primary-500"
                                                id="attribute-element-checkbox-{{ $a->uid }}" />
                                                <div class="pointer-events-none absolute top-2/4 ltr:left-2/4 rtl:right-2/4 -translate-y-2/4 ltr:-translate-x-2/4 rtl:translate-x-2/4 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" stroke-width="1"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                                            </div>
                                        </label>
                                    </div>
                                @endif

                                {{-- Select --}}
                                @if ($a->type === 'select')
                                    <x-forms.select-simple
                                        model="select"
                                        :placeholder="__('messages.t_select')">
                                        <x-slot:options>
                                            @foreach ($a->options as $option)
                                                <option value="{{ $option->attr_value }}">{{ $option->attr_text }}</option>
                                            @endforeach
                                        </x-slot:options>
                                    </x-forms.select-simple>
                                @endif
                                
                            </td>

                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">

                                    {{-- Edit --}}
                                    <x-table.action-button 
                                        icon="pencil" 
                                        :title="__('messages.t_edit')"
                                        href="{{ admin_url('attributes/edit/' . $a->uid) }}" />

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        icon="trash" 
                                        icon-color="text-red-600"
                                        :title="__('messages.t_delete')"
                                        href="{{ admin_url('attributes/delete/' . $a->uid) }}" />

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
                                    <a href="{{ admin_url('attributes/create') }}" class="bw-button primary !bg-primary-600 focus:ring-primary-500/70 hover:!bg-primary-700 active:!bg-primary-700 focus:!ring cursor-pointer rounded-full inline-block mx-auto my-4 !px-10 !font-normal !text-[11px] !py-2.5 tracking-widest uppercase">
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
    @if ($attributes->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $attributes->links('pagination::tailwind') !!}
        </div>
    @endif

</div>