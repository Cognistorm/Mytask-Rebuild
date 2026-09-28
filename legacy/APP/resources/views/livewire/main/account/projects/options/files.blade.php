<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Header --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mb-10">
        <nav class="justify-between px-4 py-3 text-gray-700 border border-gray-100 rounded-lg shadow-sm sm:flex sm:px-5 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-none" aria-label="Breadcrumb">

            {{-- Menu --}}
            <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">

                {{-- Main home --}}
                <li>
                    <div class="flex items-center">
                        <a href="{{ url('/') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_home')
                        </a>
                    </div>
                </li>

                {{-- Account --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                        <a href="{{ url('account/projects') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_projects')
                        </a>
                    </div>
                </li>

                {{-- Project Files --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                        <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">
                            @lang('messages.t_project_files')
                        </span>
                    </div>
                </li>

            </ol>

            {{-- Action buttons --}}
            <div class="flex items-center">
                {{-- Back to projects --}}
                <a href="{{ url('/account/projects/payments/' . $this->project->uid) }}" class="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold tracking-widest text-gray-700 uppercase transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md shadow-sm hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:text-gray-800 active:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-white">
                    @lang('messages.t_back_to_projects')
                </a>
            </div>

        </nav>
    </div>

    {{-- Content --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div class="grid grid-cols-12 md:gap-x-6 gap-y-6">

            {{-- Project info --}}
            <div class="col-span-12">
                <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700">
                    <div class="p-6">

                        {{-- Section header --}}
                        <div class="mb-6">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                @lang('messages.t_delivered_work')
                            </h3>
                        </div>

                        {{-- Work deliveries --}}
                        @if(count($workDeliveries) > 0)
                            <div class="space-y-4">
                                @foreach($workDeliveries as $work)
                                    <div class="border border-gray-200 dark:border-zinc-600 rounded-lg p-4">

                                        {{-- Work header --}}
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="flex items-center space-x-3">
                                                <div class="flex-shrink-0">
                                                    <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                                                        <svg class="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        @if($work->milestone)
                                                            {{ $work->milestone->title }}
                                                        @else
                                                            @lang('messages.t_final_delivery')
                                                        @endif
                                                    </h4>
                                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                                        {{ $work->delivered_at->format('d/m/Y H:i') }}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {{-- Quick response --}}
                                        @if($work->quick_response)
                                            <div class="mb-3">
                                                <p class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-700 rounded-lg p-3">
                                                    {{ $work->quick_response }}
                                                </p>
                                            </div>
                                        @endif

                                        {{-- Attached file --}}
                                        @if($work->attached_work)
                                            <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-700 rounded-lg p-3">
                                                <div class="flex items-center space-x-3">
                                                    <div class="flex-shrink-0">
                                                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            @lang('messages.t_attached_file')
                                                        </p>
                                                        <p class="text-xs text-gray-500 dark:text-gray-400">
                                                            {{ strtoupper($work->attached_work['extension']) }} • {{ format_bytes($work->attached_work['size']) }}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button wire:click="downloadFile('{{ $work->uid }}')" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-900 dark:text-primary-200 dark:hover:bg-primary-800">
                                                    <svg class="w-4 h-4 ltr:mr-1 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                    @lang('messages.t_download')
                                                </button>
                                            </div>
                                        @endif

                                    </div>
                                @endforeach
                            </div>
                        @else
                            <div class="text-center py-8">
                                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">@lang('messages.t_freelancer_hasnt_delivered_work_yet')</h3>
                            </div>
                        @endif

                    </div>
                </div>
            </div>

        </div>
    </div>

</div>
