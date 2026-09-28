<!DOCTYPE html>

<html lang="{{ app()->getLocale() }}" dir="{{ config()->get('direction') }}">


<head>


    {{-- Meta tags --}}

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">

    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <meta name="csrf-token" content="{{ csrf_token() }}">


    {{-- Generate seo tags --}}

    {!! SEO::generate() !!}



    {{-- Favicon --}}

    <link rel="icon" type="image/png" href="{{ src( settings('general')->favicon ) }}"/>


    {{-- App.css --}}

    @vite('resources/css/app.css')



    @wireUiScripts



    {{-- Css styles --}}

    <link href="{{ asset('vendor/bladewind/css/animate.min.css') }}" rel="stylesheet"/>

    <link href="{{ asset('vendor/bladewind/css/bladewind-ui.min.css') }}" rel="stylesheet"/>


    {{-- Custom fonts --}}

    {!! settings('appearance')->font_link !!}



    {{-- Custom css --}}

    <style>

        :root {

            --color-primary-h: {{ hex2hsl( settings('appearance')->colors['primary'] )[0] }};

            --color-primary-s: {{ hex2hsl( settings('appearance')->colors['primary'] )[1] }}%;

            --color-primary-l: {{ hex2hsl( settings('appearance')->colors['primary'] )[2] }}%;

        }

        html {

            font-family: @php echo settings('appearance')->font_family @endphp, sans-serif !important;

        }

    </style>


    {{-- Inject custom css --}}

    @stack('styles')



    {{-- JavaScript variables --}}

    <script>

        __var_app_url = "{{ url('/') }}";

        __var_app_locale = "{{ app()->getLocale() }}";

        __var_rtl = @js(config()->get('direction') === 'ltr' ? false : true);

        __var_primary_color = "{{ settings('appearance')->colors['primary'] }}";

        __var_axios_base_url = "{{ url('/') }}/";

        __var_currency_code = "{{ settings('currency')->code }}";

    </script>


    {{-- Livewire styles --}}

    @livewireStyles



    {{-- Custom head code --}}

    @if (settings('appearance')->custom_code_head_admin_layout)

        {!! settings('appearance')->custom_code_head_admin_layout !!}

    @endif


    <script src="https://unpkg.com/@phosphor-icons/web@2.0.3"></script>


    {{-- App.js --}}

    @vite(['resources/js/app.js'])


</head>


<body class="!overflow-x-hidden">


{{-- Notification --}}

<x-notifications position="top-center" z-index="z-[60]"/>


{{-- Dialog --}}

<x-dialog z-index="z-50" blur="sm"/>


{{-- Container --}}

<div x-cloak x-data="{ userDropdownOpen: false, mobileSidebarOpen: false, desktopSidebarOpen: true }"
     x-bind:class="{'flex flex-col mx-auto w-full min-h-screen bg-[#fdfdfd] dark:bg-zinc-700 relative z-10': true,'lg:ltr:pl-64 lg:rtl:pr-64': desktopSidebarOpen}">


    {{-- PHP variables --}}

    @php



        // Get primary logo

        $logo             = src(settings('general')->logo);



        // Get dark logo

        $logo_dark        = src(settings('general')->logo_dark);



        // Get transparent logo

        $logo_transparent = src(settings('general')->logo_transparent);



        // Get logo's height

        $logo_height      = isset(settings('appearance')->sizes['header_desktop_logo_height']) ? settings('appearance')->sizes['header_desktop_logo_height'] : 50;



        // Get site title

        $site_title       = settings('general')->title;



    @endphp



    {{-- Sidebar --}}

    <nav x-bind:class="{

                    'flex flex-col fixed top-0 ltr:left-0 rtl:right-0 bottom-0 w-full lg:!w-64 h-full bg-white dark:bg-zinc-800 ltr:border-r rtl:border-l border-gray-200 dark:border-transparent z-50 transform transition-transform duration-500 ease-out': true,

                    '-translate-x-full': !mobileSidebarOpen,

                    'translate-x-0': mobileSidebarOpen,

                    'lg:-translate-x-full': !desktopSidebarOpen,

                    'lg:translate-x-0': desktopSidebarOpen,

                }">


        {{-- Sidebar Header --}}

        <div class="h-16 flex-none flex items-center justify-between lg:justify-center px-4 w-full">


            {{-- Logo --}}

            @if (current_theme() == 'dark' && settings('general')->logo_dark)

                <a href="{{ admin_url('/') }}" class="block">

                    <img width="150" height="{{ $logo_height }}" src="{{ $logo_dark }}" alt="{{ $site_title }}"
                         style="height:{{ $logo_height }}px;width:auto">

                </a>

            @else

                <a href="{{ admin_url('/') }}" class="block">

                    <img width="150" height="{{ $logo_height }}" src="{{ src(settings('general')->logo) }}"
                         alt="{{ $site_title }}" style="height:{{ $logo_height }}px;width:auto">

                </a>

            @endif



            {{-- Close Sidebar on Mobile --}}

            <div class="lg:hidden">

                <button

                        type="button"

                        class="inline-flex justify-center items-center space-x-2 rtl:space-x-reverse border font-semibold focus:outline-none px-3 py-2 leading-5 text-sm rounded border-transparent text-red-600 hover:text-red-400 focus:ring focus:ring-red-500 focus:ring-opacity-50 active:text-red-600"

                        x-on:click="mobileSidebarOpen = false">

                    <svg class="inline-block w-5 h-5 -mx-1" fill="currentColor" viewBox="0 0 20 20"
                         xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clip-rule="evenodd"/>
                    </svg>

                </button>

            </div>


        </div>


        {{-- Sidebar --}}

        @livewire('admin.includes.sidebar')


    </nav>


    {{-- Header --}}

    <header x-bind:class="{

                    'flex flex-none items-center h-16 bg-white dark:bg-zinc-800 shadow-sm fixed top-0 right-0 left-0 z-30': true,

                    'lg:ltr:pl-64 lg:rtl:pr-64': desktopSidebarOpen

                }"

    >

        <div class="flex justify-between max-w-10xl mx-auto px-4 lg:px-8 w-full">


            {{-- Left section --}}

            <div class="flex items-center space-x-2 rtl:space-x-reverse">


                {{-- Toggle Sidebar on Desktop --}}

                <div class="hidden lg:block">

                    <button

                            type="button"

                            class="inline-flex justify-center items-center space-x-2 rtl:space-x-reverse border font-semibold focus:outline-none px-3 py-2 leading-6 rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"

                            x-on:click="desktopSidebarOpen = !desktopSidebarOpen">

                        <svg class="inline-block w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                  clip-rule="evenodd"/>
                        </svg>

                    </button>

                </div>


                {{-- Toggle Sidebar on Mobile --}}

                <div class="lg:hidden">

                    <button

                            type="button"

                            class="inline-flex justify-center items-center space-x-2 border font-semibold focus:outline-none px-3 py-2 leading-6 rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"

                            x-on:click="mobileSidebarOpen = true">

                        <svg class="inline-block w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                  clip-rule="evenodd"/>
                        </svg>

                    </button>

                </div>


                {{-- Search --}}

                {{-- <div class="hidden sm:block"><form onsubmit="return!1"><input type="text" class="w-full block border border-gray-200 rounded px-3 py-2 leading-5 text-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50" id="tk-form-layouts-search" placeholder="Search.."></form></div><div class="sm:hidden"><button type="button" class="inline-flex justify-center items-center space-x-2 border font-semibold focus:outline-none px-3 py-2 leading-5 text-sm rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none"><svg class="hi-solid hi-search inline-block w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg></button></div> --}}


            </div>


            {{-- Right section --}}

            <div class="flex items-center space-x-2 rtl:space-x-reverse">


                {{-- Get notifications --}}

                @php

                    $notifications = pending_admin_notifications();

                @endphp



                {{-- Notification button --}}

                <button type="button"
                        class=" relative inline-flex justify-center items-center space-x-2 border font-semibold focus:outline-none px-3 py-2 leading-5 text-sm rounded border-gray-300 bg-white text-gray-700 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        data-drawer-target="notifications-drawer" data-drawer-show="notifications-drawer"
                        aria-controls="notifications-drawer" data-drawer-placement="right" data-drawer-backdrop="false">

                    <svg class="inline-block w-5 h-5" stroke="currentColor" fill="none" viewBox="0 0 24 24"
                         xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>

                    @if (isset($notifications['total']) && (int)$notifications['total'] > 0)

                        <span class="flex items-center justify-center">

                                    <span class="animate-ping inline-flex items-center justify-center h-3 w-3 rounded-full bg-red-300 opacity-75"></span>

                                    <span class="relative inline-flex items-center justify-center rounded-full h-2 w-2 bg-red-400 ltr:-ml-2.5 rtl:-mr-2.5 mt-px"></span>

                                </span>

                    @endif

                </button>


                {{-- Notifications drawer --}}

                <div id="notifications-drawer"
                     class="fixed top-0 ltr:right-0 rtl:left-0 z-[60] h-screen px-6 py-4 overflow-y-auto transition-transform translate-x-full bg-white w-96 dark:bg-zinc-800 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-zinc-900 dark:scrollbar-track-zinc-600 ltr:border-l rtl:border-r dark:border-zinc-700"
                     tabindex="-1" aria-labelledby="notifications-drawer-label">

                    <div class="h-screen">


                        {{-- Head --}}

                        <div class="flex items-center justify-between">

                            <p tabindex="0"
                               class="focus:outline-none text-base font-bold leading-6 text-zinc-800 dark:text-zinc-200">

                                @lang('messages.t_notifications')

                            </p>

                            <button role="button" aria-label="close modal"
                                    class="cursor-pointer flex focus:outline-none focus:ring-0 h-8 hover:bg-slate-100 items-center justify-center rounded-full w-8 dark:text-zinc-300 dark:hover:bg-zinc-600"
                                    data-drawer-hide="notifications-drawer" aria-controls="notifications-drawer">

                                <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd"
                                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                          clip-rule="evenodd"></path>
                                </svg>

                            </button>

                        </div>


                        {{-- Body --}}

                        <div class="py-10 space-y-6">


                            {{-- Pending users --}}

                            @if ($notifications['count_pending_users'])

                                <a href="{{ admin_url('users') }}"
                                   class="w-full p-3 bg-red-100 text-red-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-red-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_users')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-red-200 border border-red-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_users'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending deposit transactions --}}

                            @if ($notifications['count_pending_deposit_transactions'])

                                <a href="{{ admin_url('users/transactions') }}"
                                   class="w-full p-3 bg-amber-100 text-amber-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-amber-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M404 160H108c-33.1 0-60 26.9-60 60v168c0 33.1 26.9 60 60 60h296c33.1 0 60-26.9 60-60V220c0-33.1-26.9-60-60-60zM342.9 65L108 110.9c-18 4-44 22.1-44 44.1 0 0 15-19 49-19h287v-20.5c0-12.6-5-28.7-13.9-37.6-11.3-11.3-27.5-16.2-43.2-12.9z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_deposit_transactions')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-amber-200 border border-amber-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_deposit_transactions'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending gigs --}}

                            @if ($notifications['count_pending_gigs'])

                                <a href="{{ admin_url('gigs') }}"
                                   class="w-full p-3 bg-green-100 text-green-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-green-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"></path>
                                            <path fill-rule="evenodd"
                                                  d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                                                  clip-rule="evenodd"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_gigs')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-green-200 border border-green-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_gigs'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending projects --}}

                            @if ($notifications['count_pending_projects'])

                                <a href="{{ admin_url('projects') }}"
                                   class="w-full p-3 bg-orange-100 text-orange-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-orange-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd"
                                                  d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                                                  clip-rule="evenodd"></path>
                                            <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_projects')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-orange-200 border border-orange-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_projects'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending bid subscription --}}

                            @if ($notifications['count_pending_bids_subscriptions'])

                                <a href="{{ admin_url('projects/bids/subscriptions') }}"
                                   class="w-full p-3 bg-purple-100 text-purple-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-purple-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M461.8 53.6c-.4-1.7-1.6-3-3.3-3.4-54.4-13.3-180.1 34.1-248.2 102.2-13.3 13.3-24.2 26.4-33.1 39.1-21-1.9-42-.3-59.9 7.5-50.5 22.2-65.2 80.2-69.3 105.1-1 5.9 3.9 11 9.8 10.4l81.1-8.9c.1 7.8.6 14 1.1 18.3.4 4.2 2.3 8.1 5.3 11.1l31.4 31.4c3 3 6.9 4.9 11.1 5.3 4.3.5 10.5 1 18.2 1.1l-8.9 81c-.6 5.9 4.5 10.8 10.4 9.8 24.9-4 83-18.7 105.1-69.2 7.8-17.9 9.4-38.8 7.6-59.7 12.7-8.9 25.9-19.8 39.2-33.1 68.4-68 115.5-190.9 102.4-248zM298.6 213.5c-16.7-16.7-16.7-43.7 0-60.4 16.7-16.7 43.7-16.7 60.4 0 16.7 16.7 16.7 43.7 0 60.4-16.7 16.7-43.7 16.7-60.4 0z"></path>
                                            <path d="M174.5 380.5c-4.2 4.2-11.7 6.6-19.8 8-18.2 3.1-34.1-12.8-31-31 1.4-8.1 3.7-15.6 7.9-19.7l.1-.1c2.3-2.3.4-6.1-2.8-5.7-9.8 1.2-19.4 5.6-26.9 13.1-18 18-19.7 84.8-19.7 84.8s66.9-1.7 84.9-19.7c7.6-7.6 11.9-17.1 13.1-26.9.3-3.2-3.6-5.1-5.8-2.8z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_bids_subscriptions')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-purple-200 border border-purple-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_bids_subscriptions'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending reported bids --}}

                            @if ($notifications['count_reported_bids'])

                                <a href="{{ admin_url('reports/bids') }}"
                                   class="w-full p-3 bg-neutral-100 text-neutral-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-neutral-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd"
                                                  d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                                                  clip-rule="evenodd"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_reported_bids')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-neutral-200 border border-neutral-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_reported_bids'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending reported bids --}}

                            @if ($notifications['count_pending_offers'])

                                <a href="{{ admin_url('offers') }}"
                                   class="w-full p-3 bg-violet-100 text-violet-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-violet-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2 3h20v4H2zm17 5H3v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8h-2zm-3 6H8v-2h8v2z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_offers_pending_approval')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-violet-200 border border-violet-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_offers'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending projects subscriptions --}}

                            @if ($notifications['count_pending_projects_subscriptions'])

                                <a href="{{ admin_url('projects/subscriptions') }}"
                                   class="w-full p-3 bg-pink-100 text-pink-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-pink-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M160 894c0 17.7 14.3 32 32 32h286V550H160v344zm386 32h286c17.7 0 32-14.3 32-32V550H546v376zm334-616H732.4c13.6-21.4 21.6-46.8 21.6-74 0-76.1-61.9-138-138-138-41.4 0-78.7 18.4-104 47.4-25.3-29-62.6-47.4-104-47.4-76.1 0-138 61.9-138 138 0 27.2 7.9 52.6 21.6 74H144c-17.7 0-32 14.3-32 32v140h366V310h68v172h366V342c0-17.7-14.3-32-32-32zm-402-4h-70c-38.6 0-70-31.4-70-70s31.4-70 70-70 70 31.4 70 70v70zm138 0h-70v-70c0-38.6 31.4-70 70-70s70 31.4 70 70-31.4 70-70 70z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_projects_subscriptions')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-pink-200 border border-pink-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_projects_subscriptions'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending refunds --}}

                            @if ($notifications['count_pending_refunds'])

                                <a href="{{ admin_url('refunds') }}"
                                   class="w-full p-3 bg-sky-100 text-sky-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-sky-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd"
                                                  d="M12 1.5c-1.921 0-3.816.111-5.68.327-1.497.174-2.57 1.46-2.57 2.93V21.75a.75.75 0 001.029.696l3.471-1.388 3.472 1.388a.75.75 0 00.556 0l3.472-1.388 3.471 1.388a.75.75 0 001.029-.696V4.757c0-1.47-1.073-2.756-2.57-2.93A49.255 49.255 0 0012 1.5zm-.97 6.53a.75.75 0 10-1.06-1.06L7.72 9.22a.75.75 0 000 1.06l2.25 2.25a.75.75 0 101.06-1.06l-.97-.97h3.065a1.875 1.875 0 010 3.75H12a.75.75 0 000 1.5h1.125a3.375 3.375 0 100-6.75h-3.064l.97-.97z"
                                                  clip-rule="evenodd"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_refunds')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-sky-200 border border-sky-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_refunds'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending reported gigs --}}

                            @if ($notifications['count_reported_gigs'])

                                <a href="{{ admin_url('reports/gigs') }}"
                                   class="w-full p-3 bg-lime-100 text-lime-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-lime-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="none" stroke-width="2"
                                             viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                            <path d="M11.99 1.968c1.023 0 1.97 .521 2.512 1.359l.103 .172l7.1 12.25l.062 .126a3 3 0 0 1 -2.568 4.117l-.199 .008h-14l-.049 -.003l-.112 .002a3 3 0 0 1 -2.268 -1.226l-.109 -.16a3 3 0 0 1 -.32 -2.545l.072 -.194l.06 -.125l7.092 -12.233a3 3 0 0 1 2.625 -1.548zm.02 12.032l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007zm-.01 -6a1 1 0 0 0 -.993 .883l-.007 .117v2l.007 .117a1 1 0 0 0 1.986 0l.007 -.117v-2l-.007 -.117a1 1 0 0 0 -.993 -.883z"
                                                  stroke-width="0" fill="currentColor"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_reported_gigs')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-lime-200 border border-lime-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_reported_gigs'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending reported projects --}}

                            @if ($notifications['count_reported_projects'])

                                <a href="{{ admin_url('reports/projects') }}"
                                   class="w-full p-3 bg-indigo-100 text-indigo-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-indigo-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <g>
                                                <path fill="none" d="M0 0h24v24H0z"></path>
                                                <path d="M12.414 5H21a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7.414l2 2zM11 9v2h2V9h-2zm0 3v5h2v-5h-2z"></path>
                                            </g>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_reported_projects')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-indigo-200 border border-indigo-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_reported_projects'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending reported users --}}

                            @if ($notifications['count_reported_users'])

                                <a href="{{ admin_url('reports/users') }}"
                                   class="w-full p-3 bg-yellow-100 text-yellow-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-yellow-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <g>
                                                <path fill="none" d="M0 0h24v24H0z"></path>
                                                <path d="M14 14.252V22H4a8 8 0 0 1 10-7.748zM12 13c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6zm7 3.586l2.121-2.122 1.415 1.415L20.414 18l2.122 2.121-1.415 1.415L19 19.414l-2.121 2.122-1.415-1.415L17.586 18l-2.122-2.121 1.415-1.415L19 16.586z"></path>
                                            </g>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_reported_users')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-yellow-200 border border-yellow-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_reported_users'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending support messages --}}

                            @if ($notifications['count_new_support_messages'])

                                <a href="{{ admin_url('support') }}"
                                   class="w-full p-3 bg-blue-100 text-blue-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-blue-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <g>
                                                <path fill="none" d="M0 0h24v24H0z"></path>
                                                <path d="M2 8.994A5.99 5.99 0 0 1 8 3h8c3.313 0 6 2.695 6 5.994V21H8c-3.313 0-6-2.695-6-5.994V8.994zM14 11v2h2v-2h-2zm-6 0v2h2v-2H8z"></path>
                                            </g>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_support_messages')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-blue-200 border border-blue-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_new_support_messages'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending payouts --}}

                            @if ($notifications['count_pending_payouts'])

                                <a href="{{ admin_url('withdrawals') }}"
                                   class="w-full p-3 bg-fuchsia-100 text-fuchsia-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-fuchsia-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 640 512" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M608 32H32C14.33 32 0 46.33 0 64v384c0 17.67 14.33 32 32 32h576c17.67 0 32-14.33 32-32V64c0-17.67-14.33-32-32-32zM176 327.88V344c0 4.42-3.58 8-8 8h-16c-4.42 0-8-3.58-8-8v-16.29c-11.29-.58-22.27-4.52-31.37-11.35-3.9-2.93-4.1-8.77-.57-12.14l11.75-11.21c2.77-2.64 6.89-2.76 10.13-.73 3.87 2.42 8.26 3.72 12.82 3.72h28.11c6.5 0 11.8-5.92 11.8-13.19 0-5.95-3.61-11.19-8.77-12.73l-45-13.5c-18.59-5.58-31.58-23.42-31.58-43.39 0-24.52 19.05-44.44 42.67-45.07V152c0-4.42 3.58-8 8-8h16c4.42 0 8 3.58 8 8v16.29c11.29.58 22.27 4.51 31.37 11.35 3.9 2.93 4.1 8.77.57 12.14l-11.75 11.21c-2.77 2.64-6.89 2.76-10.13.73-3.87-2.43-8.26-3.72-12.82-3.72h-28.11c-6.5 0-11.8 5.92-11.8 13.19 0 5.95 3.61 11.19 8.77 12.73l45 13.5c18.59 5.58 31.58 23.42 31.58 43.39 0 24.53-19.05 44.44-42.67 45.07zM416 312c0 4.42-3.58 8-8 8H296c-4.42 0-8-3.58-8-8v-16c0-4.42 3.58-8 8-8h112c4.42 0 8 3.58 8 8v16zm160 0c0 4.42-3.58 8-8 8h-80c-4.42 0-8-3.58-8-8v-16c0-4.42 3.58-8 8-8h80c4.42 0 8 3.58 8 8v16zm0-96c0 4.42-3.58 8-8 8H296c-4.42 0-8-3.58-8-8v-16c0-4.42 3.58-8 8-8h272c4.42 0 8 3.58 8 8v16z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_withdrawals')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-fuchsia-200 border border-fuchsia-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_payouts'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending portfolio projects --}}

                            @if ($notifications['count_pending_portfolio_projects'])

                                <a href="{{ admin_url('portfolios') }}"
                                   class="w-full p-3 bg-zinc-100 text-zinc-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-zinc-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <g>
                                                <path fill="none" d="M0 0H24V24H0z"></path>
                                                <path d="M20 3c.552 0 1 .448 1 1v1.757l-2 2V5H5v8.1l4-4 4.328 4.329-1.327 1.327-.006 4.239 4.246.006 1.33-1.33L18.899 19H19v-2.758l2-2V20c0 .552-.448 1-1 1H4c-.552 0-1-.448-1-1V4c0-.552.448-1 1-1h16zm1.778 4.808l1.414 1.414L15.414 17l-1.416-.002.002-1.412 7.778-7.778zM15.5 7c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5S14 9.328 14 8.5 14.672 7 15.5 7z"></path>
                                            </g>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_portfolios')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-zinc-200 border border-zinc-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_portfolio_projects'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending verifications --}}

                            @if ($notifications['count_pending_verifications'])

                                <a href="{{ admin_url('verifications') }}"
                                   class="w-full p-3 bg-teal-100 text-teal-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-teal-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd"
                                                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                  clip-rule="evenodd"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_verifications')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-teal-200 border border-teal-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_verifications'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending checkout payments --}}

                            @if ($notifications['count_pending_checkout_payments'])

                                <a href="{{ admin_url('invoices') }}"
                                   class="w-full p-3 bg-slate-100 text-slate-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-slate-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_checkout_payments')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-slate-200 border border-slate-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_checkout_payments'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif



                            {{-- Pending Bids --}}

                            @if ($notifications['count_pending_bids'])

                                <a href="{{ admin_url('projects/bids') }}"
                                   class="w-full p-3 bg-rose-100 text-rose-700 rounded flex items-center hover:bg-opacity-50">


                                    {{-- Icon --}}

                                    <div class="focus:outline-none w-8 h-8 border rounded-full border-rose-200 flex items-center flex-shrink-0 justify-center">

                                        <svg class="h-4 w-4" stroke="currentColor" fill="currentColor" stroke-width="0"
                                             viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
                                        </svg>

                                    </div>


                                    {{-- Notification --}}

                                    <div class="ltr:pl-3 rtl:pr-3 w-full flex items-center justify-between">


                                        {{-- Message --}}

                                        <p class="focus:outline-none text-sm leading-none">

                                            @lang('messages.t_pending_bids')

                                        </p>


                                        {{-- Total --}}

                                        <p class="bg-rose-200 border border-rose-300 flex focus:outline-none font-bold h-6 items-center justify-center p-1 rounded-full text-xs w-6">

                                            {{ $notifications['count_pending_bids'] }}

                                        </p>


                                    </div>

                                </a>

                            @endif


                        </div>


                    </div>

                </div>


                {{-- Admin menu --}}

                <div class="relative inline-block">


                    {{-- Button --}}

                    <button

                            type="button"

                            class="inline-flex justify-center items-center space-x-2 border font-semibold focus:outline-none px-3 py-2 leading-5 text-sm rounded border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"

                            aria-haspopup="true"

                            x-bind:aria-expanded="userDropdownOpen"

                            x-on:click="userDropdownOpen = true">

                        <span>{{ auth('admin')->user()->username }}</span>

                        <svg class="inline-block w-5 h-5 opacity-50" fill="currentColor" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                  clip-rule="evenodd"/>
                        </svg>

                    </button>


                    {{-- Dromdown --}}

                    <div

                            x-show="userDropdownOpen"

                            x-transition:enter="transition ease-out duration-150"

                            x-transition:enter-start="transform opacity-0 scale-75"

                            x-transition:enter-end="transform opacity-100 scale-100"

                            x-transition:leave="transition ease-in duration-100"

                            x-transition:leave-start="transform opacity-100 scale-100"

                            x-transition:leave-end="transform opacity-0 scale-75"

                            x-on:click.outside="userDropdownOpen = false"

                            role="menu"

                            class="absolute ltr:right-0 rtl:left-0 ltr:origin-top-right rtl:origin-top-left mt-2 w-48 shadow-xl rounded z-1">

                        <div class="bg-white ring-1 ring-black ring-opacity-5 rounded divide-y divide-gray-100 dark:bg-zinc-900 dark:divide-zinc-800">

                            <div class="p-2 space-y-1">


                                {{-- Quick support --}}

                                <a href="mailto:mredwardhendrix@gmail.com" target="_blank"
                                   class="flex items-center space-x-2 rtl:space-x-reverse rounded py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:bg-gray-100 focus:text-gray-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:focus:bg-zinc-800 dark:focus:text-zinc-200">

                                    <svg xmlns="http://www.w3.org/2000/svg" class="inline-block w-5 h-5 opacity-50"
                                         viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                              clip-rule="evenodd"/>
                                    </svg>

                                    <span>@lang('messages.t_fast_support')</span>

                                </a>


                                {{-- Edit profile --}}

                                <a href="{{ admin_url('profile') }}"
                                   class="flex items-center space-x-2 rtl:space-x-reverse rounded py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:bg-gray-100 focus:text-gray-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:focus:bg-zinc-800 dark:focus:text-zinc-200">

                                    <svg xmlns="http://www.w3.org/2000/svg" class="inline-block w-5 h-5 opacity-50"
                                         viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                                              clip-rule="evenodd"/>
                                    </svg>

                                    <span>@lang('messages.t_edit_profile')</span>

                                </a>


                                {{-- Go to homepage --}}

                                <a href="{{ url('/') }}" target="_blank"
                                   class="flex items-center space-x-2 rtl:space-x-reverse rounded py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:bg-gray-100 focus:text-gray-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:focus:bg-zinc-800 dark:focus:text-zinc-200">

                                    <svg xmlns="http://www.w3.org/2000/svg" class="inline-block w-5 h-5 opacity-50"
                                         viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                                    </svg>

                                    <span>@lang('messages.t_go_homepage')</span>

                                </a>


                            </div>


                            <div class="p-2 space-y-1">


                                {{-- Logout --}}

                                <a href="{{ admin_url('logout') }}" target="_blank"
                                   class="flex items-center space-x-2 rtl:space-x-reverse rounded py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:bg-gray-100 focus:text-gray-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:focus:bg-zinc-800 dark:focus:text-zinc-200">

                                    <svg class="inline-block w-5 h-5 opacity-50" fill="currentColor" viewBox="0 0 20 20"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd"
                                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                              clip-rule="evenodd"/>
                                    </svg>

                                    <span>@lang('messages.t_logout')</span>

                                </a>


                            </div>

                        </div>

                    </div>


                </div>


            </div>


        </div>

    </header>


    {{-- Content --}}

    <main id="page-content" class="flex flex-auto flex-col max-w-full pt-16">

        <div class="mx-auto p-4 lg:p-16 w-full">

            {{ $slot }}

        </div>

    </main>


    {{-- Footer --}}

    <footer id="page-footer"
            class="flex flex-none items-center bg-white border-t dark:bg-zinc-900 dark:border-zinc-700">

        <div class="text-center flex flex-col md:ltr:text-left md:rtl:text-right md:flex-row md:justify-between text-xs text-gray-500 dark:text-zinc-400 max-w-10xl mx-auto px-4 lg:px-8 w-full font-semibold">

            <div class="pt-3 md:pb-4"></div>

            <div class="pb-4 pt-1 md:pt-4 inline-flex items-center justify-center">

                {{ config('app.name') }} {{ config('global.version') }}

            </div>

        </div>

    </footer>


</div>


{{-- Global admin search --}}

@livewire('livewire-ui-spotlight')



{{-- JavaScript variables --}}

<script>

    __var_app_url = "{{ url('/') }}";

    __var_app_locale = "{{ app()->getLocale() }}";

    __var_rtl = @js(config()->get('direction') === 'ltr' ? false : true);

    __var_primary_color = "{{ settings('appearance')->colors['primary'] }}";

    __var_axios_base_url = "{{ url('/') }}/";

    __var_currency_code = "{{ settings('currency')->code }}";

</script>


{{-- Livewire --}}

@livewireScriptConfig



{{-- Custom footer code --}}

@if (settings('appearance')->custom_code_footer_admin_layout)

    {!! settings('appearance')->custom_code_footer_admin_layout !!}

@endif



{{-- Laravel components --}}

<fc:scripts/>


{{-- SweetAlert --}}

<x-livewire-alert::scripts/>


{{-- JS Plugins --}}

<script src="{{ asset('vendor/bladewind/js/helpers.js') }}"></script>


{{-- Custom js --}}

@stack('scripts')



{{-- Livewire Events --}}

<script>

    document.addEventListener('livewire:initialized', () => {


        // Refresh

        window.addEventListener('refresh', () => {

            location.reload();

        });


    });

</script>


</body>

</html>