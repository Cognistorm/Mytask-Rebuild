<div class="w-full" x-data="window.qJEjXlEwngQOsVK">
    {{-- Loading --}}

    <x-forms.loading/>

    {{-- Heading --}}

    <div class="mb-16">

        <div class="mx-auto max-w-7xl">

            <div class="lg:flex lg:items-center lg:justify-between">


                <div class="min-w-0 flex-1">


                    {{-- Section heading --}}

                    <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">

                        @lang('messages.t_conversations')

                    </h2>


                    {{-- Breadcrumbs --}}

                    <div class="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6 rtl:space-x-reverse">

                        <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">


                            {{-- Main home --}}

                            <li>

                                <div class="flex items-center">

                                    <a href="{{ url('/') }}"
                                       class="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-zinc-300 dark:hover:text-white">

                                        @lang('messages.t_home')

                                    </a>

                                </div>

                            </li>


                            {{-- dashboard --}}

                            <li aria-current="page">

                                <div class="flex items-center">

                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180"
                                         fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              clip-rule="evenodd"></path>
                                    </svg>

                                    <a href="{{ admin_url('/') }}"
                                       class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">

                                        @lang('messages.t_dashboard')

                                    </a>

                                </div>

                            </li>


                            {{-- Messages --}}

                            <li aria-current="page">

                                <div class="flex items-center">

                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180"
                                         fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                              clip-rule="evenodd"></path>
                                    </svg>

                                    <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">

                                        @lang('messages.t_messages')

                                    </span>

                                </div>

                            </li>


                        </ol>

                    </div>


                </div>

                {{-- Actions --}}

                <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4">

                    {{-- Settings --}}

                    <span class="">

                        <a href="{{ admin_url('settings/chat') }}"
                           class="relative inline-flex items-center px-4 py-3 border border-gray-300 dark:border-zinc-600 dark:hover:bg-zinc-700 dark:text-gray-200 bg-white dark:bg-zinc-800 text-[13px] font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600 shadow-sm rounded">

                            @lang('messages.t_settings')

                        </a>

                    </span>

                </div>
            </div>
        </div>
    </div>

    {{-- Content --}}
    <div class="flex gap-4">
        <input
                wire:model.live.debounce.300ms="from"
                type="text"
                placeholder="from.."
                class="focus:ring-blue-500 w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2"
        />

        <input
                wire:model.live.debounce.300ms="to"
                type="text"
                placeholder="from.."
                class="focus:ring-blue-500 w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2"
        />
    </div>

    <div class="w-full">
        @forelse($messages as $message)
            @if($message->from_id == $from)
                <div class="grid pb-11">
                    <div class="flex gap-2.5 mb-4">
                        <div id="avatar"
                             class="avatar p-6 w-10 h-11 flex items-center justify-center rounded-full bg-gray-300 text-white text-lg font-semibold">
                            {{ \Illuminate\Support\Str::limit($message->from->fullname, 1) }}
                        </div>
                        <div class="grid ml-1.5">
                            <h5 class="text-gray-900 text-sm font-semibold leading-snug pb-1">{{ $message->from->fullname }} {{$message->id}}</h5>
                            <div class="w-max grid">
                                <div class="px-3.5 py-2 bg-gray-100 rounded justify-start  items-center gap-3 inline-flex">
                                    <h5 class="text-gray-900 text-sm font-normal leading-snug">{{ $message->body }}</h5>
                                </div>
                                <div class="justify-end items-center inline-flex mb-2.5">
                                    <h6 class="text-gray-500 text-xs font-normal leading-4 py-1">{{ $message->created_at }}</h6>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            @endif
            @if($message->from_id == $to && $message->from_id != $from)
                <div class="flex gap-2.5 justify-end">
                    <div class="mr-1.5">
                        <div class="grid mb-2">
                            <h5 class="text-right text-gray-900 text-sm font-semibold leading-snug pb-1">{{ $message->from->fullname }} {{$message->id}}</h5>
                            <div class="px-3 py-2 bg-indigo-600 rounded">
                                <h2 class="text-white text-sm font-normal leading-snug">{{ $message->body }}</h2>
                            </div>
                            <div class="justify-start items-center inline-flex">
                                <h3 class="text-gray-500 text-xs font-normal leading-4 py-1">{{$message->created_at}}</h3>
                            </div>
                        </div>
                    </div>
                    <div id="avatar"
                         class="avatar p-6 w-10 h-11 flex items-center justify-center rounded-full bg-gray-300 text-white text-lg font-semibold">
                        {{ \Illuminate\Support\Str::limit($message->from->fullname, 1) }}
                    </div>
                </div>
            @endif
        @empty
            <p>აირჩიე იუზერები</p>
        @endforelse
        @if($messages->hasMorePages())
            <button wire:click.prevent="loadMore" type="button"
                    class="py-2.5 px-5 me-2 mb-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
                Load More ...
            </button>
        @endif
    </div>

    {{-- Pages --}}

</div>

@push('styles')

    <link rel="stylesheet" href="{{ url('js/plugins/file-icon-vectors/file-icon-vectors.min.css') }}"/>

@endpush