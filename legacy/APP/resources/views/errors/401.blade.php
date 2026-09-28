<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}"
      dir="{{ config()->get('direction') }}" @class(['dark' => current_theme() === 'dark'])>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ __('messages.t_toast_something_went_wrong') }}</title>

    {{-- Custom fonts --}}
    {!! settings('appearance')?->font_link !!}

    {{-- Favicon --}}
    <link rel="icon" type="image/png" href="{{ src( settings('general')->favicon ) }}"/>

    {{-- Css styles --}}
    <link href="{{ asset('vendor/bladewind/css/animate.min.css') }}" rel="stylesheet"/>
    <link href="{{ asset('vendor/bladewind/css/bladewind-ui.min.css') }}" rel="stylesheet"/>

    {{-- Fonts --}}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    {{-- Livewire styles --}}
    @livewireStyles

    {{-- Custom css --}}
    <style>
        :root {
            --color-primary: {{ settings('appearance')?->colors['primary'] }};
            --color-primary-h: {{ hex2hsl( settings('appearance')->colors['primary'] )[0] }};
            --color-primary-s: {{ hex2hsl( settings('appearance')->colors['primary'] )[1] }}%;
            --color-primary-l: {{ hex2hsl( settings('appearance')->colors['primary'] )[2] }}%;
        }

        html {
            font-family: @php echo settings('appearance')?->font_family @endphp, sans-serif !important;
        }

        .fileuploader, .fileuploader-popup {
            font-family: @php echo settings('appearance')?->font_family @endphp, sans-serif !important;
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

    @wireUiScripts
    @vite(['resources/css/app.css','resources/js/app.js'])

</head>

<body class="h-full">

<div class="bg-gray-50 min-h-full px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 h-[100vh]">
    <div class="max-w-max mx-auto">
        <main class="sm:flex">
            <p class="text-4xl font-extrabold text-primary-600 sm:text-5xl">401</p>
            <div class="sm:ml-6">
                <div class="sm:border-l sm:border-gray-200 sm:pl-6">
                    <h1 class="text-2xl font-extrabold text-gray-900 sm:text-3xl uppercase tracking-widest">
                        @lang('messages.t_unauthorized')
                    </h1>
                    <p class="mt-1 text-base text-gray-500">
                        @lang('messages.t_sorry_ur_request_could_not_be_processed_try_again')
                    </p>
                </div>
                <div class="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
                    <a href="{{ url('/') }}"
                       class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600">
                        @lang('messages.t_back_to_homepage')
                    </a>
                    <a href="{{ url('help/contact') }}"
                       class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600">
                        @lang('messages.t_contact_us')
                    </a>
                </div>
            </div>
        </main>
    </div>
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

@fcScripts

</body>

</html>
