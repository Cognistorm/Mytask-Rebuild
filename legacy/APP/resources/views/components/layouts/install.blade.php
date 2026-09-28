<!DOCTYPE html>

<html dir="ltr">


<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">

    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <meta name="csrf-token" content="{{ csrf_token() }}">


    {{-- Generate seo tags --}}

    {!! SEO::generate() !!}



    {{-- Favicon --}}

    <link rel="icon" type="image/png" href=""/>


    {{-- Fonts --}}

    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet">


    {{-- Livewire styles --}}

    @livewireStyles



    {{-- Select2 --}}

    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet"
          type="text/css">


    {{-- Custom css --}}

    @stack('styles')


    <style>

        :root {

            --color-primary-h: {{ hex2hsl( '#4f46e5' )[0] }};

            --color-primary-s: {{ hex2hsl( '#4f46e5' )[1] }}%;

            --color-primary-l: {{ hex2hsl( '#4f46e5' )[2] }}%;

        }

        html {

            font-family: 'Noto Sans Display', sans-serif !important;

        }

    </style>


    <link href="{{ asset('url('js/d/css/animate.min.css') }}" rel="stylesheet"/>
    <link href="{{ asset('vendor/bladewind/css/bladewind-ui.min.css') }}" rel="stylesheet"/>


    {{-- JavaScript variables --}}

    <script>

        __var_app_url = "{{ url('/') }}";

        __var_app_locale = "{{ app()->getLocale() }}";

        __var_rtl = @js(config()->get('direction') === 'ltr' ? false : true);

        __var_primary_color = "#4f46e5";

        __var_axios_base_url = "{{ url('/') }}/";

        __var_currency_code = "USD";

    </script>

    @wireUiScripts

    @vite(['resources/css/app.css','resources/js/app.js'])


</head>


<body class="antialiased bg-white text-gray-600 min-h-full flex flex-col application application-ltr overflow-x-hidden">


{{-- Notification --}}

<x-notifications position="top-center" z-index="z-[65]"/>


{{-- Dialog --}}

<x-dialog z-index="z-[65]" blur="sm"/>


{{-- Content --}}

<main class="flex-grow">

    <div class="container !max-w-full py-12 px-10 lg:px-24 pt-16 pb-24 space-y-8 min-h-screen">

        {{ $slot }}

    </div>

</main>


{{-- jQuery --}}

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>


{{-- Helpers --}}

<script defer src="{{ url('js/utils.js?v=1.3.1') }}"></script>

<script src="{{ url('js/components.js?v=1.3.1') }}"></script>


<script src="https://unpkg.com/sweetalert2@11.9.0/dist/sweetalert2.all.min.js"></script>


<x-livewire-alert::scripts/>


{{-- Laravel components --}}

<fc:scripts/>


{{-- SweetAlert --}}

<x-livewire-alert::scripts/>


{{-- JS Plugins --}}

<script src="{{ asset('vendor/bladewind/js/helpers.js') }}"></script>


{{-- Livewire --}}

@livewireScriptConfig



{{-- Custom scripts --}}

@stack('scripts')



@fcScripts


<script src="https://unpkg.com/@phosphor-icons/web@2.0.3"></script>


</body>


</html>
