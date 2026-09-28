{{-- resources/views/components/sidebar.blade.php --}}
<div {{ \$attributes->merge(['class' => 'hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-zinc-800 overflow-y-auto']) }}>
    <div class="flex flex-col flex-grow pt-5">
        {{-- Logo slot --}}
        {{ \$logo ?? '' }}
        {{-- Navigation items --}}
        <nav class="mt-8 flex-1 space-y-1.5 px-2">
            {{ \$slot }}
        </nav>
    </div>
</div>

{{-- resources/views/components/header.blade.php --}}
<header {{ \$attributes->merge(['class' => 'flex-shrink-0 flex h-16 bg-white dark:bg-zinc-800 border-b border-[#e9eef5] dark:border-zinc-600 px-4 md:px-6 justify-between']) }}>
    <button @click.prevent="open = true" class="md:hidden text-gray-500 dark:text-zinc-200">
        <!-- menu icon -->
        <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
    </button>
    {{-- Right side (notifications, profile, etc.) --}}
    <div class="flex items-center space-x-4">
        {{ \$right ?? '' }}
    </div>
</header>

{{-- resources/views/components/app-layout.blade.php --}}
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ config('direction') }}" @class(['dark' => current_theme() === 'dark'])>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    {!! SEO::generate() !!}
    {!! JsonLd::generate() !!}
    @livewireStyles
    @vite(['resources/css/app.css','resources/js/app.js'])
</head>
<body class="min-h-full bg-slate-50 dark:bg-zinc-700 antialiased text-gray-600">
<x-sidebar>
    {{-- pass logo and menu items --}}
    <x-slot name="logo">
        <a href="{{ url('/') }}" class="px-5">
            <img src="{{ current_theme() === 'dark' ? src(settings('general')->logo_dark) : src(settings('general')->logo) }}"
                 alt="{{ settings('general')->title }}"
                 style="height: {{ settings('appearance')->sizes['header_desktop_logo_height'] }}px;width:auto">
        </a>
    </x-slot>
    {{-- Menu items --}}
    <a href="{{ url('seller/home') }}" class="...">@lang('messages.t_home')</a>
    <a href="{{ url('seller/orders') }}" class="...">@lang('messages.t_orders')</a>
    <!-- add other links -->
</x-sidebar>

<div x-data="{ open: false }" class="flex flex-col flex-1 md:pl-60">
    <x-header>
        <x-slot name="right">
            {{-- notifications, profile dropdown, etc. --}}
            <x-notifications position="top-center" />
            @livewire('main.partials.notifications')
        </x-slot>
    </x-header>

    <main class="flex-1 overflow-y-scroll">
        {{ $slot }}
    </main>
</div>

@livewireScripts
</body>
</html>
