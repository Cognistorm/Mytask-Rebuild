<!DOCTYPE html>

<html lang="{{ app()->getLocale() }}"
      dir="{{ config()->get('direction') }}" @class(['dark' => current_theme() === 'dark'])>


<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">

    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <meta name="csrf-token" content="{{ csrf_token() }}">


    {{-- Generate seo tags --}}

    {!! SEO::generate() !!}

    {!! JsonLd::generate() !!}



    {{-- Custom fonts --}}

    {!! settings('appearance')->font_link !!}



    {{-- Favicon --}}

    <link rel="icon" type="image/png" href="{{ src( settings('general')->favicon ) }}"/>


    {{-- Preload hero section image --}}

    @if (settings('hero')->enable_bg_img)

        {{-- Small background --}}

        @if (settings('hero')->background_small)

            <link rel="preload prefetch" as="image" href="{{ src(settings('hero')->background_small) }}"
                  type="image/webp"/>

        @endif



        {{-- Medium background --}}

        @if (settings('hero')->background_medium)

            <link rel="preload prefetch" as="image" href="{{ src(settings('hero')->background_medium) }}"
                  type="image/webp"/>

        @endif



        {{-- Large background --}}

        @if (settings('hero')->background_large)

            <link rel="preload prefetch" as="image" href="{{ src(settings('hero')->background_large) }}"
                  type="image/webp"/>

        @endif

    @endif



    {{-- Fonts --}}

    <link rel="preconnect" href="https://fonts.googleapis.com">

    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>


    {{-- Livewire styles --}}

    @livewireStyles



    {{-- Styles --}}

    <link rel="preload" href="{{ mix('css/app.css') }}" as="style">

    <link rel="stylesheet" href="{{ mix('css/app.css') }}">


    {{-- Preload Livewire --}}

    <link rel="preload" href="{{ livewire_asset_path() }}" as="script">


    {{-- Custom css --}}

    <style>

        :root {

            --color-primary: {{ settings('appearance')->colors['primary'] }};

            --color-primary-h: {{ hex2hsl( settings('appearance')->colors['primary'] )[0] }};

            --color-primary-s: {{ hex2hsl( settings('appearance')->colors['primary'] )[1] }}%;

            --color-primary-l: {{ hex2hsl( settings('appearance')->colors['primary'] )[2] }}%;

        }

        html {

            font-family: @php echo settings('appearance')->font_family @endphp, sans-serif !important;

        }

        .fileuploader, .fileuploader-popup {

            font-family: @php echo settings('appearance')->font_family @endphp, sans-serif !important;

        }

        .home-hero-section {

            background-color: {{ settings('hero')->bg_color }};

            background-repeat: no-repeat;

            background-position: center center;

            background-size: cover;

            height: {{ settings('hero')->bg_large_height }}px;

        }


        {{-- Check if background image enabled --}}

        @if (settings('hero')->enable_bg_img)



            {{-- Background image for small devices --}}

            @if (settings('hero')->background_small)



@media only screen and (max-width: 600px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_small) }}');

                height: {{ settings('hero')->bg_small_height }}px;

            }

        }


        @endif



        {{-- Background image for medium devices --}}

        @if (settings('hero')->background_medium)



@media only screen and (min-width: 600px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_medium) }}')

            }

        }


        @endif



        {{-- Background image for large devices --}}

        @if (settings('hero')->background_large)



@media only screen and (min-width: 768px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_large) }}');

            }

        }


        @endif



        {{-- Background image for large devices --}}

        @if (settings('hero')->background_large)



@media only screen and (min-width: 992px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_large) }}');

            }

        }


        @endif



        {{-- Background image for large devices --}}

        @if (settings('hero')->background_large)



@media only screen and (min-width: 1200px) {

            .home-hero-section {

                background-image: url('{{ src(settings('hero')->background_large) }}');

            }

        }



        @endif



        @endif


    </style>


    {{-- Styles --}}

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


    {{-- Ads header code --}}

    @if (advertisements('header_code'))

        {!! advertisements('header_code') !!}

    @endif



    {{-- Custom head code --}}

    @if (settings('appearance')->custom_code_head_main_layout)

        {!! settings('appearance')->custom_code_head_main_layout !!}

    @endif


</head>


<body class="antialiased bg-[#fafafa] dark:bg-[#161616] text-gray-600 min-h-full flex flex-col application application-ltr overflow-x-hidden overflow-y-scroll {{ app()->getLocale() === 'ar' ? 'application-ar' : '' }}"
      style="overflow-y: scroll">


{{-- Notification --}}

<x-notifications position="top-center" z-index="z-[65]"/>


{{-- Dialog --}}

<x-dialog z-index="z-[65]" blur="sm"/>


{{-- Header --}}

@livewire('main.includes.header')



{{-- Hero section --}}

@if (request()->is('/'))

    {{-- Hero section content --}}

    <div class="home-hero-section">

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">

            <div class="w-full md:max-w-lg">


                {{-- Hero section title --}}

                <h1 class="text-center sm:ltr:text-left sm:rtl:text-right mt-4 text-xl tracking-tight font-extrabold text-white sm:mt-5 sm:text-3xl lg:mt-6 xl:text-4xl">

                    {{ __('messages.t_find_best') }} {{ __('messages.t_freelance') }}
                    <br> {{ __('messages.t_services_for_ur_business') }}

                </h1>

                <div class="mt-10 sm:mt-12">


                    {{-- Search form --}}

                    <form class="flex items-center mb-4" action="{{ url('search') }}" accept="GET">


                        {{-- Input --}}

                        <div class="relative w-full">

                            <div class="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-3 rtl:pr-3 pointer-events-none">

                                <svg aria-hidden="true" class="w-5 h-5 text-gray-500 dark:text-gray-400"
                                     fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd"
                                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                          clip-rule="evenodd"></path>
                                </svg>

                            </div>

                            <input type="search" name="q"
                                   class="bg-white border-none text-gray-900 text-sm font-medium rounded-md block w-full ltr:pl-10 rtl:pr-10 px-2.5 py-4 focus:outline-none focus:ring-0"
                                   placeholder="{{ __('messages.t_what_service_are_u_looking_for_today') }}" required>

                        </div>


                        {{-- Button --}}

                        <button type="submit"
                                class="px-5 py-4 ltr:ml-2 rtl:mr-2 text-sm font-medium text-white bg-primary-600 rounded-md border-none hover:bg-primary-800 focus:ring-0 focus:outline-none">

                            @lang('messages.t_search')

                        </button>


                    </form>


                    {{-- Popular tags --}}

                    @php

                        $popular_tags = App\Models\Category::whereHas('gigs')->withCount('gigs')->take(5)->orderBy('gigs_count')->get();

                    @endphp

                    <div class="hidden sm:flex items-center text-white font-semibold text-sm whitespace-nowrap">

                        @lang('messages.t_popular_colon')

                        <ul class="flex ltr:ml-3 rtl:mr-3">

                            @foreach ($popular_tags as $tag)

                                <li class="flex ltr:mr-3 rtl:ml-3 whitespace-nowrap">

                                    <a href="{{ url('categories', $tag->slug) }}"
                                       class="border-2 border-white rounded-[40px] hover:bg-white hover:text-gray-700 transition-all duration-200 px-3 py-0.5 text-xs">

                                        {{ $tag->name }}

                                    </a>

                                </li>

                            @endforeach

                        </ul>

                    </div>


                </div>


            </div>

        </div>

    </div>

@endif



{{-- Content --}}

<main class="flex-grow">

    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-16 pb-24 space-y-8 min-h-screen">

        @yield('content')

    </div>

</main>


{{-- Footer --}}

@livewire('main.includes.footer')



{{-- Livewire scripts --}}

@livewireScripts



{{-- Wire UI --}}

@wireUiScripts



{{-- Core --}}

<script defer src="{{ mix('js/app.js') }}"></script>


{{-- Helpers --}}

<script defer src="{{ url('js/utils.js?v=1.3.1') }}"></script>

<script src="{{ url('js/components.js?v=1.3.1') }}"></script>


{{-- Custom JS codes --}}

<script defer>


    document.addEventListener("DOMContentLoaded", function () {


        jQuery.event.special.touchstart = {

            setup: function (_, ns, handle) {

                this.addEventListener("touchstart", handle, {passive: !ns.includes("noPreventDefault")});

            }

        };

        jQuery.event.special.touchmove = {

            setup: function (_, ns, handle) {

                this.addEventListener("touchmove", handle, {passive: !ns.includes("noPreventDefault")});

            }

        };

        jQuery.event.special.wheel = {

            setup: function (_, ns, handle) {

                this.addEventListener("wheel", handle, {passive: true});

            }

        };

        jQuery.event.special.mousewheel = {

            setup: function (_, ns, handle) {

                this.addEventListener("mousewheel", handle, {passive: true});

            }

        };


        // Refresh

        window.addEventListener('refresh', () => {

            location.reload();

        });


        // Scroll to specific div

        window.addEventListener('scrollTo', (event) => {


            // Get id to scroll

            const id = event.detail;


            // Scroll

            $('html, body').animate({

                scrollTop: $("#" + id).offset().top

            }, 500);


        });


        // Scroll to up page

        window.addEventListener('scrollUp', () => {


            // Scroll

            $('html, body').animate({

                scrollTop: $("body").offset().top

            }, 500);


        });


    });


    function jwUBiFxmwbrUwww() {

        return {


            scroll: false,


            init() {

                var _this = this;

                $(document).scroll(function () {

                    $(this).scrollTop() > 70 ? _this.scroll = true : _this.scroll = false;

                });


            }


        }

    }

    window.jwUBiFxmwbrUwww = jwUBiFxmwbrUwww();


    document.ontouchmove = function (event) {

        event.preventDefault();

    }


</script>


{{-- Custom scripts --}}

@stack('scripts')



{{-- Custom footer code --}}

@if (settings('appearance')->custom_code_footer_main_layout)

    {!! settings('appearance')->custom_code_footer_main_layout !!}

@endif


</body>


</html>
