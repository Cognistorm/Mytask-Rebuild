<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Heading --}}
    <div class="lg:flex lg:items-center lg:justify-between mb-14">
    
        <div class="min-w-0 flex-1">

            {{-- Section heading --}}
            <h2 class="text-lg font-bold leading-7 text-zinc-700 dark:text-gray-50 sm:truncate sm:text-xl sm:tracking-tight">
                @lang('messages.t_countries')
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
                                @lang('messages.t_countries')
                            </span>
                        </div>
                    </li>
    
                </ol>
            </div>
            
        </div>

        {{-- Actions --}}
        <div class="mt-5 flex lg:mt-0 lg:ltr::ml-4 lg:rtl:mr-4 justify-between">

            {{-- Create --}}
            <a href="{{ admin_url('countries/create') }}" class="btn p-2.5 hover:shadow-none ring-slate-300 dark:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-slate-300 dark:focus:ring-offset-zinc-600 space-x-2 rtl:space-x-reverse border">
                <x-icon class="w-6 h-6 text-gray-400 dark:text-zinc-300" name="plus" variant="solid" mini />
            </a>

        </div>

    </div>

    {{-- Content --}}
    <ul role="list" class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">

        @foreach ($countries as $country)
            <li class="col-span-1 flex card !rounded-md" wire:key="admin-countries-{{ $country->code }}">

                {{-- Flag --}}
                <div class="flex-shrink-0 flex items-center justify-center w-16 text-sm font-medium bg-slate-100 dark:bg-zinc-800 ltr:dark:border-r rtl:dark:border-l dark:border-zinc-700 ltr:rounded-l-md rtl:rounded-r-md">
                    @if (file_exists(public_path('vendor/blade-flags/country-' . strtolower($country->code) . '.svg')))
                        <img src="{{ countryFlag($country->code) }}" alt="{{ $country->name }}" class="h-6">
                    @else
                        <span>{{ $country->code }}</span>
                    @endif
                </div>

                {{-- Country --}}
                <div class="flex flex-1 items-center justify-between truncate">
                    <div class="flex-1 truncate px-4 py-2 text-xs+">

                        {{-- Name --}}
                        <span class="font-semibold text-gray-900 hover:text-gray-600 dark:text-white block truncate pb-0.5">
                            {{ $country->name }}
                        </span>

                        {{-- Status --}}
                        @if ($country->is_active)
                            <p class="text-green-500 block text-xs">
                                @lang('messages.t_enabled')
                            </p>
                        @else
                            <p class="text-red-500 block text-xs">
                                @lang('messages.t_disabled')
                            </p>
                        @endif

                    </div>
                    <div class="flex-shrink-0 ltr:pr-2 rtl:pl-2">

                        {{-- Edit --}}
                        <a href="{{ admin_url('countries/edit/' . $country->id) }}" class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-transparent dark:ring-offset-zinc-800">
                            <svg class="h-4.5 w-4.5 fill-slate-500 dark:fill-zinc-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19H5V5H12V3H5M17.78,4C17.61,4 17.43,4.07 17.3,4.2L16.08,5.41L18.58,7.91L19.8,6.7C20.06,6.44 20.06,6 19.8,5.75L18.25,4.2C18.12,4.07 17.95,4 17.78,4M15.37,6.12L8,13.5V16H10.5L17.87,8.62L15.37,6.12Z" /></svg>
                        </a>

                    </div>
                </div>

            </li>
        @endforeach
        
    </ul>

    {{-- Pagination --}}
    @if ($countries->hasPages())
        <div class="bg-gray-100 px-4 py-5 sm:px-6 rounded-lg flex justify-center mt-8">
            {!! $countries->links('pagination::tailwind') !!}
        </div>
    @endif

</div>





