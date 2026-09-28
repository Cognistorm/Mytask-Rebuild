<div class="w-full">

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_edit_translation_for_lang_name', ['lang' => $language->name])
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
                                @lang('messages.t_edit_translation')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

    </div>

    {{-- ALERT --}}
    <div class="rounded-md bg-red-100 p-4 mb-8">
        <div class="flex">
        <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/> </svg>
        </div>
        <div class="ltr:ml-3 rtl:mr-3">
            <div class="text-xs font-medium text-red-700">
                <ul role="list" class="list-disc ltr:pl-5 rtl:pr-5 space-y-3">
                    <li>Placeholders that are prefixed with a : must not be edited at any condition. These parameters in translation strings will be automatically replaced while rendering your application. For example, Hello :username it will be Hello {{ auth('admin')->user()->username }}</li>
                    <li>DO NOT use any characters like " , ' , \ or ` because this may cause a fatal error on your system</li>
                </ul>
            </div>
        </div>
        </div>
    </div>

    {{-- Search --}}
    <form wire:submit="search" class="mb-8">
        <label for="translation-searching" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
        <div class="relative">

            {{-- Icon --}}
            <div class="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-4 rtl:pr-4 pointer-events-none">
                <svg class="w-4 h-4 text-gray-400 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/></svg>
            </div>

            {{-- Input --}}
            <input wire:model="q" type="search" id="translation-searching" class="block w-full py-4 ltr:pl-10 rtl:pr-10 text-xs font-semibold text-gray-900 border border-gray-300 rounded-md bg-gray-50 focus:ring-primary-600 focus:border-primary-600 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-600 dark:focus:border-primary-600" placeholder="{{ __('messages.t_search') }}" required>

            {{-- Submit --}}
            <button wire:loading.attr="disabled" wire:target="search" type="submit" class="text-white absolute ltr:right-2.5 rtl:left-2.5 bottom-2 bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 rounded text-xs font-semibold px-4 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-700 h-8 leading-3 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-zinc-600 dark:disabled:text-zinc-300">
                @lang('messages.t_search')
            </button>

        </div>
    </form>

    {{-- Strings --}}
    <div class="grid grid-cols-12 md:gap-x-6 gap-y-8">

        @foreach ($translation as $key => $value)
            <div class="col-span-12 md:col-span-6" wire:key="translation-string-{{ $key }}">
                <div class="flex">
                    <div class="min-w-0 flex-1">
                        <div class="relative">
                            <div class="overflow-hidden rounded-lg shadow-sm shadow-gray-100 border border-gray-200 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 focus-within:outline-none dark:border-zinc-600 dark:shadow-none">

                                {{-- Textarea --}}
                                <textarea wire:model="data.{{ $key }}" rows="3" class="block border-0 focus:ring-0 font-semibold py-3 resize-none rounded-t-lg text-gray-500 text-xs tracking-wide w-full leading-6 dark:bg-zinc-600 dark:text-zinc-200" wire:target="update('{{ $key }}')" wire:loading.class="bg-gray-100 cursor-not-allowed" wire:loading.attr="disabled"></textarea>

                                {{-- Space --}}
                                <div class="py-2" aria-hidden="true"><div class="py-px"><div class="h-7"></div></div></div>

                            </div>
                            <div class="mx-px mb-px absolute inset-x-0 bottom-0 flex justify-between py-2 px-3 bg-white border-t border-gray-50 rounded-b-lg dark:bg-zinc-700 dark:border-transparent">
                                <div class="flex items-center space-x-5 rtl:space-x-reverse">
                                    <div class="flex items-center text-xs font-normal text-gray-400 gap-x-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300 mt-px" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd"/></svg>
                                        <span>{{ $key }}</span>
                                    </div>
                                </div>

                                {{-- Save --}}
                                <div class="flex-shrink-0">
                                    <button wire:click="update('{{ $key }}')" wire:target="update('{{ $key }}')" wire:loading.attr="disabled" type="button" class="active:bg-white active:border-white active:shadow-none bg-white border border-gray-300 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-25 font-semibold hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 inline-flex items-center justify-center leading-5 px-4 py-1 rounded text-gray-800 text-xs tracking-wide min-w-[5rem] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-zinc-600 dark:text-zinc-300 dark:border-transparent dark:hover:bg-zinc-800">

                                        {{-- Loading indicator --}}
                                        <div wire:loading wire:target="update('{{ $key }}')">
                                            <svg role="status" class="inline w-4 h-4 text-gray-700 animate-spin -mt-0.5" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                                            </svg>
                                        </div>

                                        {{-- Button text --}}
                                        <div wire:loading.remove wire:target="update('{{ $key }}')">
                                            @lang('dashboard.t_save')
                                        </div>

                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        @endforeach

    </div>

    {{-- Pagination --}}
    @if ($translation->hasPages())
        <div class="mt-10 px-4 py-5 sm:px-6 flex justify-center bg-white border border-gray-100 focus:outline-none rounded shadow-sm">
            {!! $translation->links('pagination::tailwind') !!}
        </div>
    @endif

</div>
