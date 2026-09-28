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


    {{-- Css styles --}}

    <link href="{{ asset('vendor/bladewind/css/animate.min.css') }}" rel="stylesheet"/>

    <link href="{{ asset('vendor/bladewind/css/bladewind-ui.min.css') }}" rel="stylesheet"/>


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



    @wireUiScripts



    @vite(['resources/css/app.css','resources/js/app.js'])


</head>


<body class="antialiased bg-gray-50 dark:bg-[#161616] text-gray-600 min-h-full flex flex-col application application-ltr overflow-x-hidden {{ app()->getLocale() === 'ar' ? 'application-ar' : '' }}">


{{-- Notification --}}

<x-notifications position="top-center" z-index="z-[60]"/>


{{-- Container --}}

<div class="min-h-screen flex grow bg-slate-50 dark:bg-zinc-700">


    <div class="hidden w-full place-items-center lg:grid">

        <div class="w-full px-2 py-40 sm:py-48 sm:px-12 flex flex-col justify-center relative h-full
             @if(settings('auth')->wallpaper) bg-no-repeat bg-center bg-cover @else bg-gradient-to-b from-primary-500 to-primary-400 @endif"
             @if(settings('auth')->wallpaper) style="background-image: url({{ src(settings('auth')->wallpaper) }})" @endif>

            @if(!settings('auth')->wallpaper)
                <span class="absolute bg-gradient-to-b from-primary-500 to-primary-400 opacity-75 inset-0 z-0"></span>
            @endif


            {{-- Logo --}}

            <div class="fixed top-0 ltr:left-0 rtl:right-0 hidden p-6 lg:block lg:px-12">

                @if (settings('general')->logo_dark)

                    <a href="{{ url('/') }}" class="flex items-center">

                        <img src="{{ src(settings('general')->logo_dark) }}" alt="{{ settings('general')->title }}"
                             style="height: {{ settings('appearance')->sizes['header_desktop_logo_height'] }}px;">

                    </a>

                @else

                    <a href="{{ url('/') }}" class="flex items-center">

                        <img src="{{ src(settings('general')->logo) }}" alt="{{ settings('general')->title }}"
                             style="height: {{ settings('appearance')->sizes['header_desktop_logo_height'] }}px;">

                    </a>

                @endif

            </div>


            {{-- Copyrights --}}

            <div class="fixed bottom-0 ltr:left-0 rtl:right-0 hidden p-6 lg:block lg:px-12 text-white font-normal text-[13px]">

                {!! settings('footer')->copyrights !!}

            </div>


        </div>

    </div>

    <main class="flex w-full flex-col items-center bg-white dark:bg-zinc-800 lg:max-w-md">

        {{ $slot }}

    </main>

</div>


{{-- Livewire --}}

@livewireScriptConfig



{{-- jQuery --}}

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>


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


{{-- Laravel components --}}

<fc:scripts/>


{{-- SweetAlert --}}

<x-livewire-alert::scripts/>


{{-- JS Plugins --}}

<script src="{{ asset('vendor/bladewind/js/helpers.js') }}"></script>


{{-- Custom scripts --}}

@stack('scripts')



{{-- Custom footer code --}}

@if (settings('appearance')->custom_code_footer_main_layout)

    {!! settings('appearance')->custom_code_footer_main_layout !!}

@endif



{{-- Scroll event --}}

@if (is_hero_section())

    <script>

        $(window).scroll(function () {

            var screen_width = screen.width;

            var doc = document.documentElement;

            var top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);

            const header_element = $('#main-header');

            const search_box = $('.main-search-box');

            const logo_img_element = $('#primary-logo-img');

            const primary_logo_src = logo_img_element.attr('data-primary-logo');

            const transparent_logo_src = logo_img_element.attr('data-transparent-logo');


            if (top >= 100) {

                header_element.addClass('main-header-scrolling');

                logo_img_element.attr('src', primary_logo_src);

            } else if (top == 0 || top <= 100) {

                header_element.removeClass('main-header-scrolling');

                logo_img_element.attr('src', transparent_logo_src);

            }


            if (screen_width > 1024) {

                if (top >= 200) {

                    search_box.removeClass('hidden');

                } else if (top < 200) {

                    search_box.addClass('hidden');

                }

            }

        });


        window.addEventListener('load', function () {

            var screen_width = screen.width;

            var top = self['pageYOffset'] || document.documentElement.scrollTop;

            const header_element = $('#main-header');

            const search_box = $('.main-search-box');

            const logo_img_element = $('#primary-logo-img');

            const primary_logo_src = logo_img_element.attr('data-primary-logo');

            const transparent_logo_src = logo_img_element.attr('data-transparent-logo');


            if (top >= 100) {

                header_element.addClass('main-header-scrolling');

                logo_img_element.attr('src', primary_logo_src);

            } else if (top == 0 || top <= 100) {

                header_element.removeClass('main-header-scrolling');

                logo_img_element.attr('src', transparent_logo_src);

            }


            if (screen_width > 1024) {

                if (top >= 200) {

                    search_box.removeClass('hidden');

                } else if (top < 200) {

                    search_box.addClass('hidden');

                }

            }


        });


    </script>

@endif



{{-- Wire modals --}}

@livewire('wire-elements-modal')



@fcScripts


<script src="https://unpkg.com/@phosphor-icons/web@2.0.3"></script>


{{-- Events --}}

<script>

    document.addEventListener('livewire:initialized', () => {


        // Change current theme

        window.Livewire.on('change-current-theme', () => {


            // Remove or add dark class

            document.getElementsByTagName("html")[0].classList.toggle("dark");


        });


        // Scroll to specific div

        window.Livewire.on('scrollTo', (event) => {


            // Get id to scroll

            const id = event.detail;


            // Scroll

            $('html, body').animate({

                scrollTop: $("#" + id).offset().top

            }, 500);


        });


        // Scroll to up page

        window.Livewire.on('scrollUp', () => {


            // Scroll

            $('html, body').animate({

                scrollTop: $("body").offset().top

            }, 500);


        });


    });

</script>


</body>


</html>
