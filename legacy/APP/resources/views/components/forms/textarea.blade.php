@props(['label' => null, 'placeholder', 'model', 'icon' => null, 'svg_icon' => null, 'rows' => 8, 'hint' => null, 'required' => false])

@php
    // Initialize error state
    $hasError = false;
    $errorMessage = null;

    // Check for direct field error (e.g., description.ka, description.en)
    if ($errors->has($model)) {
        $hasError = true;
        $errorMessage = $errors->first($model);
    }
    // For Georgian fields, check base field as fallback (e.g., description -> description.ka)
    elseif (str_contains($model, '.ka') && $errors->has(str_replace('.ka', '', $model))) {
        $hasError = true;
        $errorMessage = $errors->first(str_replace('.ka', '', $model));
    }
@endphp

<div>

    {{-- Label --}}
    @if ($label)
        <label for="text-input-component-id-{{ $model }}" class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate {{ $hasError ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-white' }}" title="{{ htmlspecialchars_decode($label) }}">

            {{-- Label text --}}
            {{ htmlspecialchars_decode($label) }}

            {{-- Required --}}
            @if ($required)
                <span class="font-bold text-red-400">*</span>
            @endif

        </label>
    @endif

    {{-- Form --}}
    <div class="mt-2.5 relative">

        {{-- Textarea --}}
        <textarea
            @if ($required) required @endif
            wire:model="{{ $model }}"
            rows="{{ $rows }}"
            placeholder="{{ $placeholder }}"
            id="textarea-input-component-id-{{ $model }}"
            class="disabled:cursor-not-allowed resize-none focus:!ring focus:!ring-opacity-30 focus:!border-transparent block w-full ltr:pr-10 ltr:pl-4 rtl:pl-10 rtl:!pr-4 py-2.5 placeholder:font-normal placeholder:text-gray-400 dark:placeholder-zinc-300 text-xs shadow-sm font-medium tracking-wide text-zinc-700 dark:text-white rounded-md dark:bg-transparent {{ $hasError ? 'focus:!ring-red-600 focus:!border-red-600 border-red-500' : 'focus:!ring-primary-600 focus:!border-primary-600 border-gray-300 dark:border-zinc-600' }} scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-zinc-900 dark:scrollbar-track-zinc-600" {{ $attributes }}>
            </textarea>

        {{-- Counter --}}
        <div class="ltr:text-right rtl:text-left pt-1 text-xs text-gray-400 hidden" id="element-counter-container-{{ $model }}">
            <span id="element-counter-maxlength-start-{{ $model }}">0</span> / <span id="element-counter-maxlength-end-{{ $model }}">2500</span>
        </div>

        {{-- Icon --}}
        @if ($icon)
            <div class="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-4 rtl:pl-4 flex items-center pointer-events-none">
                <i class="ph-duotone ph-{{ $icon }} {{ $hasError ? 'text-red-400' : 'text-slate-400 dark:text-zinc-400' }} text-xl"></i>
            </div>
        @elseif ($svg_icon)
            <div class="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-4 rtl:pl-4 flex items-center pointer-events-none">
                {!! $svg_icon !!}
            </div>
        @endif

        {{-- Words counter js code --}}
        <script>

            // Get input element
            let counterElementInput{{ str_replace(['.', '-'], '_', $model) }}     = document.getElementById("textarea-input-component-id-{{ str_replace(['.', '-'], '_', $model) }}");

            // Get counter element container
            let counterElementContainer{{ str_replace(['.', '-'], '_', $model) }} = document.getElementById("element-counter-container-{{ str_replace(['.', '-'], '_', $model) }}");

            // Get counter start
            let counterElementStart{{ str_replace(['.', '-'], '_', $model) }}     = document.getElementById("element-counter-maxlength-start-{{ str_replace(['.', '-'], '_', $model) }}");

            // Get counter end
            let counterElementEnd{{ str_replace(['.', '-'], '_', $model) }}       = document.getElementById("element-counter-maxlength-end-{{ str_replace(['.', '-'], '_', $model) }}");

            // Check if element has maxlength attribute
            if ( counterElementInput{{ str_replace(['.', '-'], '_', $model) }} && counterElementInput{{ str_replace(['.', '-'], '_', $model) }}.hasAttribute('maxlength') ) {

                // Set max characters allowed
                counterElementEnd{{ str_replace(['.', '-'], '_', $model) }}.textContent = counterElementInput{{ str_replace(['.', '-'], '_', $model) }}.getAttribute('maxlength');

                // Show counter container
                counterElementContainer{{ str_replace(['.', '-'], '_', $model) }}.classList.remove("hidden");

                // Listen when typing
                counterElementInput{{ str_replace(['.', '-'], '_', $model) }}.addEventListener("input", function(e) {

                    // Change current characters counter
                    counterElementStart{{ str_replace(['.', '-'], '_', $model) }}.textContent = counterElementInput{{ str_replace(['.', '-'], '_', $model) }}.value.length;

                });


            }

        </script>

    </div>

    {{-- Hint --}}
    @if ($hint)
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-200">{{ $hint }}</p>
    @endif

    {{-- Error --}}
    @if ($hasError)
        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errorMessage }}</p>
    @endif

</div>
