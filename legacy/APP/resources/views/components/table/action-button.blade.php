@props(['icon', 'title' => null, 'href' => null, 'action' => null, 'iconColor' => 'text-gray-500 dark:text-zinc-300'])

{{-- Set css class for this button --}}
@php
    $class = "h-8 w-8 flex items-center justify-center focus:ring-2 focus:ring-offset-0 focus:ring-primary-700 focus:border-transparent p-1.5 border-gray-200 text-gray-600 dark:text-gray-300 border rounded shadow-sm hover:shadow-none focus:outline-none focus:border-gray-800 focus:shadow-outline-gray dark:border-zinc-700 dark:hover:text-zinc-200 dark:hover:border-zinc-600";
@endphp

{{-- Check if button is a link --}}
@if ($href)
    
    <a href="{{ $href }}" class="{{ $class }} " data-tooltip-target="tooltip-table-action-{{ $icon }}" {{ $attributes }}>

        {{-- Icon --}}
        <i class="ph-bold ph-{{ $icon }} {{ $iconColor }} text-[17px] mt-px"></i>

        {{-- Title --}}
        @if ($title)
            <x-forms.tooltip id="tooltip-table-action-{{ $icon }}" :text="$title" />
        @endif

    </a>

@else

    <button class="{{ $class }}" data-tooltip-target="tooltip-table-action-{{ $icon }}" @if ($action) wire:click="{{ $action }}" @endif {{ $attributes }}>

        {{-- Icon --}}
        <i class="ph-bold ph-{{ $icon }} {{ $iconColor }} text-[17px] mt-px"></i>

        {{-- Title --}}
        @if ($title)
            <x-forms.tooltip id="tooltip-table-action-{{ $icon }}" :text="$title" />
        @endif

    </button>

@endif