<!DOCTYPE html>

<html lang="{{ app()->getLocale() }}"
      dir="{{ config()->get('direction') }}" @class(['dark' => current_theme() === 'dark'])>


<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">

    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <meta name="csrf-token" content="{{ csrf_token() }}">

    <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>

    {{-- Generate seo tags --}}

    {!! SEO::generate() !!}

    {!! JsonLd::generate() !!}



    {{-- Custom fonts --}}

    {!! settings('appearance')->font_link !!}



    {{-- Favicon --}}


    <link rel="icon" type="image/png" href="{{ src( settings('general')?->favicon ) }}"/>


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

    @vite(['resources/css/app.css','resources/js/app.js','resources/scss/app.scss'])


</head>


<body class="antialiased bg-[#fafafa] dark:bg-[#161616] text-gray-600 min-h-full flex flex-col application application-ltr overflow-x-hidden overflow-y-scroll {{ app()->getLocale() === 'ar' ? 'application-ar' : '' }}"
      style="overflow-y: scroll">


{{-- Notification --}}

<x-notifications position="top-center" z-index="z-[65]"/>


{{-- Dialog --}}

<x-dialog z-index="z-[65]" blur="sm"/>


{{-- Header --}}

@livewire('main.includes.header')



{{-- Content --}}


<main class="flex-grow">

    <div class="min-h-screen">



    <div id="fb-root"></div>
    <div id="fb-customer-chat" class="fb-customerchat"></div>

    <!-- Initialize Facebook SDK and Messenger Chat Plugin -->
    <script>
        var chatbox = document.getElementById('fb-customer-chat');
        chatbox.setAttribute("page_id", "252112307994038");
        chatbox.setAttribute("attribution", "biz_inbox");

        window.fbAsyncInit = function() {
            FB.init({
                xfbml: true,
                version: 'v13.0' // Specify a valid version number here
            });
        };

        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s);
            js.id = id;
            js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    </script>


        {{ $slot }}

    </div>

</main>


{{-- Admin quick links --}}

@auth('admin')

    <div data-dial-init class="fixed ltr:right-10 rtl:left-10 bottom-10 group z-10">


        {{-- Links --}}

        <div id="admin-quick-links-button" class="flex flex-col items-center hidden mb-4 space-y-2">


            {{-- Dashboard --}}

            <a href="{{ admin_url('/') }}" target="_blank"
               data-tooltip-target="tooltip-admin-quick-action-dial-dashboard"
               data-tooltip-placement="{{ config()->get('direction') == 'ltr' ? 'left' : 'right' }}"
               class="relative w-11 h-11 text-gray-600 bg-white rounded-md border border-gray-200 hover:text-gray-900 dark:border-zinc-600 shadow-sm dark:hover:text-white dark:text-zinc-300 hover:bg-gray-50 dark:bg-zinc-700 dark:hover:bg-zinc-600 focus:ring-2 focus:ring-slate-300 focus:outline-none dark:focus:ring-zinc-400">

                <i class="flex h-full items-center justify-center mx-auto ph-duotone ph-layout text-2xl w-full text-slate-400"></i>

            </a>

            <x-forms.tooltip id="tooltip-admin-quick-action-dial-dashboard" :text="__('messages.t_dashboard')"/>


            {{-- Gigs --}}

            <a href="{{ admin_url('gigs') }}" target="_blank" data-tooltip-target="tooltip-admin-quick-action-dial-gigs"
               data-tooltip-placement="{{ config()->get('direction') == 'ltr' ? 'left' : 'right' }}"
               class="relative w-11 h-11 text-gray-600 bg-white rounded-md border border-gray-200 hover:text-gray-900 dark:border-zinc-600 shadow-sm dark:hover:text-white dark:text-zinc-300 hover:bg-gray-50 dark:bg-zinc-700 dark:hover:bg-zinc-600 focus:ring-2 focus:ring-slate-300 focus:outline-none dark:focus:ring-zinc-400">

                <i class="flex h-full items-center justify-center mx-auto ph-duotone ph-images text-2xl w-full text-slate-400"></i>

            </a>

            <x-forms.tooltip id="tooltip-admin-quick-action-dial-gigs" :text="__('dashboard.t_manage_gigs')"/>


            {{-- Projects --}}

            <a href="{{ admin_url('projects') }}" target="_blank"
               data-tooltip-target="tooltip-admin-quick-action-dial-projects"
               data-tooltip-placement="{{ config()->get('direction') == 'ltr' ? 'left' : 'right' }}"
               class="relative w-11 h-11 text-gray-600 bg-white rounded-md border border-gray-200 hover:text-gray-900 dark:border-zinc-600 shadow-sm dark:hover:text-white dark:text-zinc-300 hover:bg-gray-50 dark:bg-zinc-700 dark:hover:bg-zinc-600 focus:ring-2 focus:ring-slate-300 focus:outline-none dark:focus:ring-zinc-400">

                <i class="flex h-full items-center justify-center mx-auto ph-duotone ph-projector-screen-chart text-2xl w-full text-slate-400"></i>

            </a>

            <x-forms.tooltip id="tooltip-admin-quick-action-dial-projects" :text="__('dashboard.t_manage_projects')"/>


            {{-- Logout --}}

            <a href="{{ admin_url('logout') }}" data-tooltip-target="tooltip-admin-quick-action-dial-logout"
               data-tooltip-placement="{{ config()->get('direction') == 'ltr' ? 'left' : 'right' }}"
               class="relative w-11 h-11 text-gray-600 bg-white rounded-md border border-gray-200 hover:text-gray-900 dark:border-zinc-600 shadow-sm dark:hover:text-white dark:text-zinc-300 hover:bg-gray-50 dark:bg-zinc-700 dark:hover:bg-zinc-600 focus:ring-2 focus:ring-slate-300 focus:outline-none dark:focus:ring-zinc-400">

                <i class="flex h-full items-center justify-center mx-auto ph-duotone ph-power text-2xl w-full text-slate-400"></i>

            </a>

            <x-forms.tooltip id="tooltip-admin-quick-action-dial-logout" :text="__('messages.t_logout')"/>


        </div>


        {{-- Button --}}

        <button type="button" data-dial-trigger="click" data-dial-toggle="admin-quick-links-button"
                aria-controls="admin-quick-links-button" aria-expanded="false"
                class="bg-white border border-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-600 dark:text-zinc-400 flex focus:outline-none focus:ring-2 focus:ring-slate-200 h-14 hover:shadow-none hover:text-slate-500 items-center justify-center rounded-full shadow-sm text-slate-400 w-14 dark:hover:text-zinc-200">

            <i class="ph-duotone ph-user-circle-gear text-3xl"></i>

        </button>


    </div>

@endauth



{{-- Footer --}}

@livewire('main.includes.footer')



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
