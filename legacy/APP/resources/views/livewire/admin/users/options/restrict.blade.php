<div class="w-full">

    {{-- Generate fake color --}}
    @php
        $faker = Faker\Factory::create();
        $color = $faker->rgbColor();
    @endphp

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('dashboard.t_user_restrictions')
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
                                @lang('messages.t_users')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

    </div>

    {{-- Content --}}
    <div class="grid grid-cols-12 lg:gap-x-6 gap-y-6">

        {{-- New restriction --}}
        <div class="col-span-12 lg:col-span-6">
            <div class="bg-white shadow-sm border rounded-xl py-5 px-7 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">
                <x-form wire:submit="create">

                    {{-- Section title --}}
                    <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                        @lang('dashboard.t_add_restriction')
                    </h2>

                    {{-- Section body --}}
                    <div class="w-full">
                        <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                            {{-- Alert --}}
                            <div class="col-span-12">
                                <div class="py-2.5 px-3 rounded text-amber-700 bg-amber-100">
                                    <div class="flex items-center gap-x-3">
                                        <i class="ph-duotone ph-shield-warning text-xl"></i>
                                        <h3 class="font-semibold grow text-xs leading-5">
                                            @lang('dashboard.t_add_restriction_alert_explain')
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            {{-- Message --}}
                            <div class="col-span-12">
                                <x-forms.tinymce
                                    id="message"
                                    model="message" />
                            </div>

                            {{-- Files required --}}
                            <div class="col-span-12">
                                <x-bladewind.toggle
                                    :checked="$files_required"
                                    name="files_required"
                                    :label="__('dashboard.t_new_restriction_files_required_checkbox')"
                                    label_position="right" />
                            </div>

                        </div>
                    </div>

                    {{-- Section footer --}}
                    <div class="w-full mt-12">
                        <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                            @lang('messages.t_submit')
                        </x-bladewind.button>
                    </div>

                </x-form>
            </div>
        </div>

        {{-- List of restrictions --}}
        <div class="col-span-12 lg:col-span-6">
            <div class="bg-white shadow-sm border rounded-xl py-5 px-7 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">

                {{-- Section title --}}
                <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                    @lang('dashboard.t_restrictions_history')
                </h2>

                {{-- Section body --}}
                <div class="w-full">
                    @forelse ($restrictions as $r)
                        <div class="py-6 {{ !$loop->last ? 'border-b border-gray-200 dark:border-zinc-700' : '' }}" wire:key="user-restrictions-history-{{ $r->uid }}">
                            <div class="md:flex justify-between">
                                <div class="w-1/2">

                                    {{-- User --}}
                                    <p class="focus:outline-none text-xs+ leading-normal text-gray-400 dark:text-zinc-300 font-normal tracking-wide">
                                        @lang('messages.t_user')
                                    </p>
                                    <div class="pt-3 flex items-center">

                                        {{-- Avatar --}}
                                        <div class="h-8 w-8 inline-flex flex-shrink-0 relative">
                                            @if ($user->avatar)
                                                <img class="mask is-squircle object-cover w-full h-full block" src="{{ src($user->avatar) }}" alt="{{ $user->username }}">
                                            @else
                                                <div class="flex items-center justify-center h-full w-full mask is-squircle text-sm uppercase dark:bg-navy-500 dark:text-navy-100 font-medium" style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                                    {{ Str::substr($user->username, 0, 2) }}
                                                </div>   
                                            @endif
                                        </div>
                                        <div class="ltr:pl-2 rtl:pr-2 -mt-0.5">
                                            <p class="focus:outline-none text-xs font-bold tracking-wide leading-5 text-gray-800 dark:text-zinc-100">
                                                {{ $user->fullname ? $user->fullname : $user->username }}
                                            </p>
                                            <p class="focus:outline-none text-xs leading-3 pt-0.5 text-gray-500 dark:text-zinc-300">
                                                {{ $user->email }}
                                            </p>
                                        </div>
                                    </div>

                                    {{-- Actions --}}
                                    <p class="focus:outline-none text-xs+ leading-normal pt-9 text-gray-400 dark:text-zinc-300 font-normal tracking-wide">
                                        @lang('messages.t_actions')
                                    </p>
                                    <div class="focus:outline-none text-sm leading-normal pt-2 text-gray-800">
                                        <div class="flex items-center space-x-2 rtl:space-x-reverse">

                                            {{-- Reject --}}
                                            @if ($r->status === 'submitted')
                                                <x-table.action-button 
                                                    wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}"
                                                    icon="thumbs-down" 
                                                    :title="__('messages.t_reject')"
                                                    icon-color="text-red-400"
                                                    action="reject({{ $r->id }})" />
                                            @endif

                                            {{-- Approve --}}
                                            @if ($r->status === 'submitted')
                                                <x-table.action-button 
                                                    wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}"
                                                    icon="thumbs-up" 
                                                    :title="__('messages.t_approve')"
                                                    icon-color="text-green-400"
                                                    action="approve({{ $r->id }})" />
                                            @endif

                                            {{-- Files --}}
                                            @if (in_array($r->status, ['submitted', 'approved', 'rejected']) && $r->appeal)

                                                {{-- Button --}}
                                                <x-table.action-button 
                                                    icon="paperclip" 
                                                    :title="__('dashboard.t_restriction_response')"
                                                    id="modal-user-restrictions-appeal-button-{{ $r->id }}" />

                                                {{-- Modal --}}
                                                <x-forms.modal id="modal-user-restrictions-appeal-container-{{ $r->id }}" target="modal-user-restrictions-appeal-button-{{ $r->id }}" uid="modal_uid_appeal_{{ str_replace('-', '_', $r->uid) }}" placement="center-center" size="max-w-xl">

                                                    {{-- Modal heading --}}
                                                    <x-slot name="title">{{ __('dashboard.t_appeal_details') }}</x-slot>
                        
                                                    {{-- Modal content --}}
                                                    <x-slot name="content">
                                                        <dl class="sm:divide-y sm:divide-gray-200 dark:divide-zinc-600">

                                                            {{-- Response --}}
                                                            <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                                                                <dt class="text-xs+ font-normal text-gray-400 tracking-wide dark:text-zinc-300">
                                                                    @lang('messages.t_message')
                                                                </dt>
                                                                <dd class="mt-1 text-xs+ tracking-wide text-gray-900 dark:text-zinc-200 sm:col-span-2 sm:mt-0">
                                                                    {{ $r->appeal?->message }}
                                                                </dd>
                                                            </div>

                                                            {{-- Attachments --}}
                                                            @if ($r->appeal?->attachments && $r->files_required)
                                                                <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                                                                    <dt class="text-xs+ font-normal text-gray-400 tracking-wide dark:text-zinc-300">
                                                                        @lang('messages.t_attachments')
                                                                    </dt>
                                                                    <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                                                                        <ul role="list" class="divide-y divide-gray-200 rounded-md border border-gray-200 dark:border-zinc-600 dark:divide-zinc-600">
                                                                            @foreach ($r->appeal->attachments as $attachment)
                                                                                @if ($attachment?->file)
                                                                                    <li class="flex items-center justify-between py-3 ltr:pl-3 rtl:pr-3 ltr:pr-4 rtl:pl-4 text-xs">
                                                                                        <div class="flex w-0 flex-1 items-center">
                                                                                            <svg class="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clip-rule="evenodd"></path></svg>
                                                                                            <span class="ltr:ml-2 rtl:mr-2 w-0 flex-1 truncate text-gray-900 dark:text-zinc-300 font-semibold tracking-wide">
                                                                                                {{ $attachment->file?->uid }}.{{ $attachment->file?->file_extension }}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div class="ltr:ml-4 rtl:mr-4 flex-shrink-0">
                                                                                            <a href="{{ url('uploads/restrictions', $attachment->file?->uid) }}" target="_blank" class="font-semibold text-primary-600 hover:text-primary-500">
                                                                                                @lang('messages.t_download')
                                                                                            </a>
                                                                                        </div>
                                                                                    </li>
                                                                                @endif
                                                                            @endforeach
                                                                        </ul>
                                                                    </dd>
                                                                </div>
                                                            @endif

                                                        </dl>
                                                    </x-slot>
                        
                                                </x-forms.modal>

                                            @endif

                                            {{-- Read --}}
                                            <x-table.action-button 
                                                icon="clipboard-text" 
                                                :title="__('messages.t_details')"
                                                id="modal-user-restrictions-details-button-{{ $r->id }}" />

                                            {{-- Rad modal --}}
                                            <x-forms.modal id="modal-user-restrictions-details-container-{{ $r->id }}" target="modal-user-restrictions-details-button-{{ $r->id }}" uid="modal_uid_read_{{ str_replace('-', '_', $r->uid) }}" placement="center-center" size="max-w-lg">

                                                {{-- Modal heading --}}
                                                <x-slot name="title">{{ __('dashboard.t_restriction_details') }}</x-slot>
                    
                                                {{-- Modal content --}}
                                                <x-slot name="content">
                                                    {!! $r->message !!}
                                                </x-slot>
                    
                                            </x-forms.modal>

                                            {{-- Delete --}}
                                            @if (in_array($r->status, ['pending', 'rejected', 'approved']))
                                                <x-table.action-button 
                                                    wire:confirm="{{ __('dashboard.t_are_u_sure_want_proceed') }}"
                                                    icon="trash" 
                                                    :title="__('messages.t_delete')"
                                                    icon-color="text-red-400"
                                                    action="delete({{ $r->id }})" />
                                            @endif

                                        </div>
                                    </div>

                                </div>
                                <div class="w-1/2 md:ltr:pl-12 md:rtl:pr-12 md:pt-0 pt-4">

                                    {{-- Date --}}
                                    <p class="focus:outline-none text-xs+ leading-normal text-gray-400 dark:text-zinc-300 font-normal tracking-wide">
                                        @lang('dashboard.t_restriction_date')
                                    </p>
                                    <p class="focus:outline-none text-xs font-bold tracking-wide leading-5 text-gray-800 dark:text-zinc-100 pt-3">
                                        {{ format_date($r->created_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}
                                    </p>
                                    <p class="focus:outline-none text-xs leading-3 pt-0.5 text-gray-500 dark:text-zinc-300">
                                        {{ format_date($r->created_at) }}
                                    </p>

                                    {{-- Status --}}
                                    <p class="focus:outline-none text-xs+ leading-normal pt-9 text-gray-400 dark:text-zinc-300 font-normal tracking-wide">
                                        @lang('messages.t_status')
                                    </p>
                                    <div class="focus:outline-none pt-2">
                                        @switch($r->status)

                                            {{-- Pending --}}
                                            @case('pending')
                                                <div class="whitespace-nowrap flex items-center text-xs font-semibold text-amber-500 dark:text-amber-400 lowercase tracking-wide ltr:-ml-2.5 rtl:-mr-2.5 -mt-1">
                                                    <i class="ph-duotone ph-dot text-3xl mt-[4.5px] text-amber-600 ltr:-mr-1 rtl:-ml-1"></i>
                                                    <span>@lang('messages.t_pending')</span>
                                                </div>
                                            @break

                                            {{-- Approved --}}
                                            @case('approved')
                                                <div class="whitespace-nowrap flex items-center text-xs font-semibold text-green-500 dark:text-green-400 lowercase tracking-wide ltr:-ml-2.5 rtl:-mr-2.5 -mt-1">
                                                    <i class="ph-duotone ph-dot text-3xl mt-[4.5px] text-green-600 ltr:-mr-1 rtl:-ml-1"></i>
                                                    <span>@lang('dashboard.t_restriction_resolved')</span>
                                                </div>
                                            @break

                                            {{-- Rejected --}}
                                            @case('rejected')
                                                <div class="whitespace-nowrap flex items-center text-xs font-semibold text-red-500 dark:text-red-400 lowercase tracking-wide ltr:-ml-2.5 rtl:-mr-2.5 -mt-1">
                                                    <i class="ph-duotone ph-dot text-3xl mt-[4.5px] text-red-600 ltr:-mr-1 rtl:-ml-1"></i>
                                                    <span>@lang('messages.t_rejected')</span>
                                                </div>
                                            @break
                                            
                                            {{-- Submitted --}}
                                            @case('submitted')
                                                <div class="whitespace-nowrap flex items-center text-xs font-semibold text-blue-500 dark:text-blue-400 lowercase tracking-wide ltr:-ml-2.5 rtl:-mr-2.5 -mt-1">
                                                    <i class="ph-duotone ph-dot text-3xl mt-[4.5px] text-blue-600 ltr:-mr-1 rtl:-ml-1"></i>
                                                    <span>@lang('dashboard.t_new_appeal')</span>
                                                </div>
                                            @break
                                                
                                        @endswitch    
                                    </div>

                                </div>
                            </div>
                        </div>
                    @empty

                        {{-- No data --}}
                        <div class="flex flex-col items-center space-y-2 border-t pt-5 max-w-sm mx-auto border-gray-100 dark:border-zinc-700"> 
                            <i class="ph-duotone ph-archive text-5xl text-slate-400 dark:text-zinc-400"></i>
                            <span class="text-xs+ text-slate-500 tracking-wide dark:text-zinc-300">@lang('messages.t_no_data_to_show_now')</span>
                        </div>

                    @endforelse
                </div>

            </div>
        </div>

    </div>

</div>