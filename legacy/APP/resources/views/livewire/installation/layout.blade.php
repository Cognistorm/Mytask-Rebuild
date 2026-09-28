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

        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">

        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@6.9.96/css/materialdesignicons.min.css">



        {{-- Styles --}}

        <link rel="preload" href="{{ mix('css/app.css') }}" as="style">

        <link rel="stylesheet" href="{{ mix('css/app.css') }}">



        {{-- Select2 --}}

        <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" type="text/css">



        {{-- Custom css --}}

        @stack('styles')



        <style>

            :root {

                --color-primary-h: {{ hex2hsl( '#4f46e5' )[0] }};

                --color-primary-s: {{ hex2hsl( '#4f46e5' )[1] }}%;

                --color-primary-l: {{ hex2hsl( '#4f46e5' )[2] }}%;

            }

            html {

                font-family: 'Heebo', sans-serif !important;

            }

        </style>



        {{-- JavaScript variables --}}

        <script>

            __var_app_url        = "{{ url('/') }}";

            __var_app_locale     = "{{ app()->getLocale() }}";

            __var_rtl            = @js(config()->get('direction') === 'ltr' ? false : true);

            __var_primary_color  = "#4f46e5";

            __var_axios_base_url = "{{ url('/') }}/";

            __var_currency_code  = "USD";

        </script>



    </head>



    <body class="antialiased bg-[#fafafa] text-gray-600 min-h-full flex flex-col application application-ltr overflow-x-hidden">



        {{-- Content --}}

        <main class="flex-grow">

            <div class="container !max-w-full py-12 px-10 lg:px-24 pt-16 pb-24 space-y-8 min-h-screen">

                {{ $slot }}

            </div>

        </main>



        {{-- Wire UI --}}



        {{-- Core --}}

        <script defer src="{{ mix('js/app.js') }}"></script>



        {{-- Helpers --}}

        <script defer src="{{ url('js/utils.js') }}"></script>



        {{-- Custom scripts --}}

        @stack('scripts')



    </body>



</html>
