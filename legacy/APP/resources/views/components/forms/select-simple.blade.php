@props(['model', 'label' => null, 'required' => false, 'live' => false, 'placeholder' => null, 'hint' => null])

<div>

    {{-- Label --}}
    @if ($label)
        <label for="select-component-id-{{ $model }}" class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate {{ $errors->first($model) ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-white' }}" title="{{ htmlspecialchars_decode($label) }}">

            {{-- Label text --}}
            {{ htmlspecialchars_decode($label) }}

            {{-- Required --}}
            @if ($required)
                <span class="font-bold text-red-400">*</span>
            @endif

        </label>
    @endif

    {{-- Select --}}
    <div @class(['relative', 'mt-2.5' => isset($label)])>
        <select 
            id="select-component-id-{{ $model }}"  
            @if ($live)
                wire:model.live="{{ $model }}"
            @else
                wire:model="{{ $model }}"
            @endif
            class="disabled:cursor-not-allowed focus:!ring focus:!ring-opacity-30 focus:!border-transparent block w-full ltr:pr-10 ltr:pl-4 rtl:pl-10 rtl:!pr-4 py-2.5 placeholder:font-normal placeholder:!text-gray-200 dark:placeholder-zinc-300 text-xs shadow-sm font-medium tracking-wide text-zinc-700 dark:text-white rounded-md hover:!border-primary-600 dark:bg-transparent {{ $errors->first($model) ? 'focus:!ring-red-600 focus:!border-red-600 border-red-500' : 'focus:!ring-primary-600 focus:!border-primary-600 border-gray-300 dark:border-zinc-600' }}" {{ $attributes }}>
            
            {{-- Placeholder --}}
            @if ($placeholder)
                <option hidden>{{ htmlspecialchars_decode($placeholder) }}</option>
            @endif

            {{-- Set options --}}
            {{ $options }}
    
        </select>
    </div>

    {{-- Hint --}}
    @if ($hint)
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-200">{!! $hint !!}</p>
    @endif

    {{-- Error --}}
    @error($model)
        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first($model) }}</p>
    @enderror

</div>