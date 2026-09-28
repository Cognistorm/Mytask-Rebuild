<div class="w-full" x-data="window.qMCrFTGlghBsWaU" x-init="initialize">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_messages')
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
                                @lang('messages.t_messages')
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

                        <th>@lang('messages.t_name')</th>
                        <th>@lang('messages.t_email_address')</th>
                        <th>@lang('messages.t_subject')</th>
                        <th class="text-center">@lang('messages.t_date')</th>
                        <th class="text-center">@lang('messages.t_status')</th>
                        <th class="text-center">@lang('messages.t_options')</th>

                    </tr>
                </thead>
                <tbody>
                    @forelse ($messages as $message)
                        <tr wire:key="messages-{{ $message->uid }}">
                        
                            {{-- Name --}}
                            <td>
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500 whitespace-nowrap">{{$message->name }}</span>
                            </td>

                            {{-- Email address --}}
                            <td>
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500 whitespace-nowrap">{{$message->email }}</span>
                            </td>

                            {{-- Subject --}}
                            <td>
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500">{{$message->subject }}</span>
                            </td>

                            {{-- Date --}}
                            <td class="text-center">
                                <span class="text-xs font-normal dark:text-zinc-300 text-gray-500 whitespace-nowrap">
                                    {{ format_date($message->created_at, 'ago') }}
                                </span>
                            </td>

                            {{-- Status --}}
                            <td class="text-center">

                                @if (!$message->is_seen && !$message->is_replied)
                                    <span class="bg-blue-100 text-blue-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                        @lang('messages.t_new')
                                    </span>
                                @elseif ($message->is_seen && !$message->is_replied)
                                    <span class="bg-gray-100 text-gray-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                        @lang('messages.t_seen')
                                    </span>
                                @else
                                    <span class="bg-green-100 text-green-600 px-4 inline-block py-1.5 rounded-3xl font-semibold text-[11px] whitespace-nowrap">
                                        @lang('messages.t_replied')
                                    </span>
                                @endif
                                
                            </td>

                            {{-- Options --}}
                            <td class="table-report__action">
                                <div class="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                                        
                                    {{-- Reply --}}
                                    <x-table.action-button 
                                        icon="paper-plane-tilt" 
                                        :title="__('messages.t_reply')"
                                        href="{{ admin_url('support/reply/' . $message->uid) }}" />

                                    {{-- Read message --}}
                                    <x-table.action-button 
                                        icon="eye" 
                                        :title="__('messages.t_read_message')"
                                        action="read('{{ $message->id }}')" />

                                    {{-- Delete --}}
                                    <x-table.action-button 
                                        wire:confirm="{{ __('messages.t_are_u_sure_u_want_to_delete_this') }}"
                                        icon="trash" 
                                        :title="__('messages.t_delete_message')"
                                        icon-color="text-red-600"
                                        action="delete('{{ $message->id }}')" />

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
    @if ($messages->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-bl-lg rounded-br-lg flex justify-center border-t-0 border-r border-l border-b">
            {!! $messages->links('pagination::tailwind') !!}
        </div>
    @endif

    {{-- Read message modal --}}
    <x-forms.modal id="read-message" target="read-message-btn" uid="modal_{{ uid() }}" placement="center-center" size="max-w-md">
    
        {{-- Header --}}
        <x-slot name="title">{{ __('messages.t_read_message') }}</x-slot>

        {{-- Content --}}
        <x-slot name="content">
            <div class="text-xs+ leading-7 text-gray-500 dark:text-zinc-300" x-html="message"></div>
        </x-slot>

    </x-forms.modal>

</div>

{{-- Inject Js --}}
@push('scripts')
    <script>
        function qMCrFTGlghBsWaU() {
            return {

                message: null,

                initialize() {

                    // Read message
                    document.addEventListener('livewire:initialized', () => {
                        @this.on('support-messages-read-response', (event) => {
                            this.message = event[0];
                        });
                    });

                }

            }
        }
        window.qMCrFTGlghBsWaU = qMCrFTGlghBsWaU();
    </script>
@endpush
