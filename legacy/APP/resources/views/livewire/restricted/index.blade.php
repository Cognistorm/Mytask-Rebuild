<div class="w-full sm:mx-auto sm:max-w-2xl">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Content --}}
    <div class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Section head --}}
        <div class="flex items-center flex-col justify-center gap-4 {{ $restrictions?->count() ? 'pb-6 border-slate-100 dark:border-zinc-700 border-b mb-8' : '' }}">
            <div class="{{ auth()->user()->is_restricted ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500' }} flex h-20 items-center justify-center rounded-full shrink-0 text-3xl w-20">
                @if (auth()->user()->is_restricted)
                    <i class="ph-duotone ph-shield-warning"></i>
                @else
                    <i class="ph-duotone ph-shield-check"></i>
                @endif
            </div>
            <div class="text-muted-700 block text-xl font-semibold text-center">
                <h3 class="text-base font-bold text-zinc-700 dark:text-white pb-1 capitalize">
                    @lang('messages.t_restrictions_removal_center')
                </h3>
            </div>
        </div>
        
        @if ($restrictions?->count())
            
            {{-- List of restrictions --}}
            <ul role="list" class="divide-y divide-gray-100 dark:divide-zinc-700">
                @foreach ($restrictions as $r)
                    <li wire:key="restrictions-{{ $r->uid }}" class="relative py-5 sm:py-8">
                        <div class="flex items-center justify-between space-x-4 rtl:space-x-reverse">
                            
                            {{-- Status/Date --}}
                            <div class="min-w-0 space-y-3">
        
                                {{-- Status --}}
                                @switch($r->status)
        
                                    {{-- Pending --}}
                                    @case('pending')
                                        <div class="flex items-center space-x-3 rtl:space-x-reverse">
                                            <span class="h-4 w-4 bg-amber-100 rounded-full flex items-center justify-center">
                                                <span class="h-2 w-2 bg-amber-500 rounded-full"></span>
                                            </span>
                                            <h2 class="text-xs+ font-semibold text-amber-600 lowercase">
                                                @lang('messages.t_pending')
                                            </h2>
                                        </div>
                                    @break
        
                                    {{-- Resolved --}}
                                    @case('approved')
                                        <div class="flex items-center space-x-3 rtl:space-x-reverse">
                                            <span class="h-4 w-4 bg-green-100 rounded-full flex items-center justify-center">
                                                <span class="h-2 w-2 bg-green-400 rounded-full"></span>
                                            </span>
                                            <h2 class="text-xs+ font-semibold text-green-600 lowercase">
                                                @lang('messages.t_restriction_resolved')
                                            </h2>
                                        </div>
                                    @break
        
                                    {{-- Rejected --}}
                                    @case('rejected')
                                        <div class="flex items-center space-x-3 rtl:space-x-reverse">
                                            <span class="h-4 w-4 bg-red-100 rounded-full flex items-center justify-center">
                                                <span class="h-2 w-2 bg-red-400 rounded-full"></span>
                                            </span>
                                            <h2 class="text-xs+ font-semibold text-red-600 lowercase">
                                                @lang('messages.t_restriction_rejected')
                                            </h2>
                                        </div>
                                    @break
        
                                    {{-- Submitted --}}
                                    @case('submitted')
                                        <div class="flex items-center space-x-3 rtl:space-x-reverse">
                                            <span class="h-4 w-4 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span class="h-2 w-2 bg-blue-400 rounded-full"></span>
                                            </span>
                                            <h2 class="text-xs+ font-semibold text-blue-600 lowercase">
                                                @lang('messages.t_restriction_submitted')
                                            </h2>
                                        </div>
                                    @break
                                        
                                @endswitch
        
                                {{-- Date --}}
                                <div class="relative flex items-center space-x-2.5 rtl:space-x-reverse">
                                    <i class="ph-duotone ph-clock-clockwise text-xl flex-shrink-0 text-gray-300 dark:text-zinc-400"></i>
                                    <span class="truncate text-xs font-normal text-gray-400 dark:text-zinc-400">
                                        {{ format_date($r->created_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}
                                    </span>
                                </div>
        
                            </div>
        
                            <div class="sm:hidden">
                                <svg class="h-5 w-5 text-gray-400" x-description="Heroicon name: mini/chevron-right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            
                            {{-- Details --}}
                            <div class="flex flex-shrink-0 flex-col items-center">

                                {{-- Actions --}}
                                <div class="flex-none inline-flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse transform transition ease-out duration-150 origin-right opacity-100 translate-x-0">
                                    
                                    {{-- Read more --}}
                                    <button id="modal-restrictions-details-button-{{ $r->uid }}" type="button" class="inline-flex items-center rounded font-semibold focus:outline-none align-middle px-2.5 py-2 leading-5 text-xs overflow-hidden text-gray-500 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-600 active:bg-gray-50 dark:active:bg-zinc-600 focus:ring focus:ring-gray-500 dark:focus:ring-zinc-500 focus:ring-opacity-25">
                                        <span class="inline-block ltr:mr-1.5 rtl:ml-1.5">
                                            @lang('messages.t_restriction_read_reason')
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" class="inline-block w-3.5 h-3.5 rtl:rotate-180 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                                    </button>

                                    {{-- Request appeal --}}
                                    @if ($r->status == 'pending')
                                        <button id="modal-restrictions-appeal-button-{{ $r->uid }}" type="button" class="inline-flex items-center rounded font-semibold focus:outline-none align-middle px-2.5 py-2 leading-5 text-xs overflow-hidden text-gray-500 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 active:bg-gray-50 dark:active:bg-zinc-600 focus:ring focus:ring-gray-500 dark:focus:ring-zinc-500 focus:ring-opacity-25">
                                            <span class="inline-block ltr:mr-1.5 rtl:ml-1.5">
                                                @lang('messages.t_appeal_the_closure')
                                            </span>
                                            <svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-3.5 w-3.5 opacity-70" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd"/></svg>
                                        </button>
                                    @endif

                                </div>

                                {{-- Rad modal --}}
                                <x-forms.modal id="modal-restrictions-details-container-{{ $r->uid }}" target="modal-restrictions-details-button-{{ $r->uid }}" uid="modal_details_uid_{{ str_replace('-', '_', $r->uid) }}" placement="center-center" size="max-w-lg">

                                    {{-- Modal heading --}}
                                    <x-slot name="title">{{ __('messages.t_reason') }}</x-slot>
        
                                    {{-- Modal content --}}
                                    <x-slot name="content">
                                        <div class="w-full dark:text-zinc-300">
                                            {!! $r->message !!}
                                        </div>
                                    </x-slot>
        
                                </x-forms.modal>

                                {{-- Appeal modal --}}
                                @if ($r->status == 'pending')
                                    <x-forms.modal id="modal-restrictions-appeal-container-{{ $r->uid }}" target="modal-restrictions-appeal-button-{{ $r->uid }}" uid="modal_appeal_uid_{{ str_replace('-', '_', $r->uid) }}" placement="center-center" size="max-w-xl">

                                        {{-- Modal heading --}}
                                        <x-slot name="title">{{ __('messages.t_appeal_the_closure') }}</x-slot>
            
                                        {{-- Modal content --}}
                                        <x-slot name="content">
                                            <x-form wire:submit="appeal('{{ $r->uid }}')" has-files class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                                                {{-- Message --}}
                                                <div class="col-span-12">
                                                    <x-forms.textarea required
                                                        :placeholder="__('messages.t_type_ur_response_here')"
                                                        :rows="6"
                                                        model="message"
                                                        icon="text-columns" />
                                                </div>

                                                {{-- Files --}}
                                                @if ($r->files_required)
                                                    
                                                    {{-- Set files fields --}}
                                                    <div class="col-span-12">

                                                        {{-- Label --}}
                                                        <div class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate text-zinc-500 dark:text-white mb-4">

                                                            {{-- Label text --}}
                                                            @lang('messages.t_attach_a_file')
                                                
                                                            {{-- Required --}}
                                                            <span class="font-bold text-red-400">*</span>
                                                
                                                        </div>

                                                        {{-- Files --}}
                                                        @for ($i = 0; $i < settings('media')->restrictions_max_files; $i++)
                                                            <div class="mb-4" wire:key="restrictions-files-{{ $i }}-{{ $r->uid }}">
                                                                <x-forms.file-input model="files.{{ $i }}" :accept="false" />
                                                            </div>
                                                        @endfor

                                                    </div>

                                                    {{-- Alert --}}
                                                    <div class="col-span-12 -mt-2">
                                                        <div class="py-2.5 px-3 rounded text-red-700 bg-red-100">
                                                            <div class="flex items-center gap-x-3">
                                                                <i class="ph-duotone ph-warning-octagon text-xl"></i>
                                                                <h3 class="font-semibold grow text-xs leading-5">
                                                                    @lang('messages.t_restrictions_files_allowed_info_explain', ['size' => settings('media')->restrictions_max_size, 'extensions' => settings('media')->restrictions_allowed_extensions])
                                                                </h3>
                                                            </div>
                                                        </div>
                                                    </div>

                                                @endif

                                                {{-- Submit --}}
                                                <div class="col-span-12 mt-4">
                                                    <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                                                        @lang('messages.t_submit')
                                                    </x-bladewind.button>
                                                </div>

                                            </x-form>
                                        </x-slot>
            
                                    </x-forms.modal>
                                @endif
        
                            </div>
                        </div>
                    </li>
                @endforeach
            </ul>
        
            {{-- Pages --}}
            @if ($restrictions->hasPages())
                <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
                    {!! $restrictions->links('pagination::tailwind') !!}
                </div>
            @endif
            
        @endif

    </div>

</div>