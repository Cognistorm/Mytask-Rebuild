@props(['label' => null, 'placeholder' => null, 'model', 'type' => 'text', 'icon' => null, 'svg_icon' => null, 'suffix' => false, 'hint' => null, 'required' => false, 'show_toggle' => true])

@php
    $hasError = false;
    $errorMessage = null;

    if ($errors->has($model)) {
        $hasError = true;
        $errorMessage = $errors->first($model);
    }
    elseif (str_contains($model, '.ka') && $errors->has(str_replace('.ka', '', $model))) {
        $hasError = true;
        $errorMessage = $errors->first(str_replace('.ka', '', $model));
    }
@endphp
<div @if($type === 'password' && $show_toggle) x-data="{ show: false }" @endif>

    @if ($label)
        <label for="text-input-component-id-{{ $model }}"
               class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate {{ $hasError ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-white' }}"
               title="{{ htmlspecialchars_decode($label) }}">

            {{-- Label text --}}
            {{ htmlspecialchars_decode($label) }}

            {{-- Required --}}
            @if ($required)
                <span class="font-bold text-red-400">*</span>
            @endif

        </label>
    @endif

    <div @class(['relative', 'mt-2.5' => isset($label)])>

        {{-- Input --}}
        <input
            @if ($required) required @endif
        @if($type === 'password' && $show_toggle)
            x-bind:type="show ? 'text' : 'password'"
            @else
                type="{{ $type }}"
            @endif
            @if ($placeholder) placeholder="{{ htmlspecialchars_decode($placeholder) }}" @endif
            wire:model="{{ $model }}"
            id="text-input-component-id-{{ $model }}"
            {{ $type === 'password' ? 'readonly' : '' }}
            onfocus="{{ $type === 'password' ? "this.removeAttribute('readonly');" : "" }}"
            class="disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-transparent focus:!ring focus:!ring-opacity-30 focus:!border-transparent block w-full ltr:pr-10 ltr:pl-4 rtl:pl-10 rtl:!pr-4 py-2.5 placeholder:font-normal placeholder:text-gray-400 dark:placeholder-zinc-300 text-xs shadow-sm font-medium tracking-wide text-zinc-700 dark:text-white rounded-md dark:bg-transparent {{ $hasError ? 'focus:!ring-red-600 focus:!border-red-600 border-red-500' : 'focus:!ring-primary-600 focus:!border-primary-600 border-gray-300 dark:border-zinc-600' }}"
            {{ $attributes }} />

        @if ($suffix)
            {{-- Suffix --}}
            <div
                class="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-3 rtl:pl-3 flex items-center pointer-events-none text-sm font-medium tracking-wider">
                <span class="{{ $errorMessage ? 'text-red-400' : 'text-gray-400' }}">{{ $suffix }}</span>
            </div>
        @elseif ($type === 'password' && $show_toggle)
            {{-- Password Toggle --}}
            <div class="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-4 rtl:pl-4 flex items-center">
                <button type="button" x-on:click="show = !show" class="focus:outline-none">
                    <svg x-show="!show" x-cloak
                         class="w-5 h-5 {{ $errorMessage ? 'text-red-400' : 'text-slate-400 dark:text-zinc-400' }}"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg x-show="show" x-cloak
                         class="w-5 h-5 {{ $errorMessage ? 'text-red-400' : 'text-slate-400 dark:text-zinc-400' }}"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    </svg>
                </button>
            </div>
        @elseif ($icon)
            {{-- Icon --}}
            <div
                class="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-4 rtl:pl-4 flex items-center pointer-events-none">
                <i class="ph-duotone ph-{{ $icon }} {{ $hasError ? 'text-red-400' : 'text-slate-400 dark:text-zinc-400' }} text-xl"></i>
            </div>
        @elseif ($svg_icon)
            {{-- Icon --}}
            <div
                class="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-4 rtl:pl-4 flex items-center pointer-events-none">
                {!! $svg_icon !!}
            </div>
        @endif

    </div>

    {{-- Hint --}}
    @if ($hint)
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-200">{!! $hint !!}</p>
    @endif

    {{-- Error --}}
    @if ($hasError)
    <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errorMessage }}</p>
    @endif

</div>
