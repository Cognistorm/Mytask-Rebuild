@props(['label' => null, 'model', 'required' => false])

<div>

    {{-- Label --}}
    @if ($label)
        <label for="text-input-component-id-{{ $model }}" class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate {{ $errors->first($model) ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-white' }}" title="{{ htmlspecialchars_decode($label) }}">

            {{-- Label text --}}
            {{ htmlspecialchars_decode($label) }}

            {{-- Required --}}
            @if ($required)
                <span class="font-bold text-red-400">*</span>
            @endif

        </label>
    @endif

    {{-- Form --}}
    <div class="mt-2.5 relative color-picker-wrapper">
        <input type="text" wire:model.defer="{{ $model }}" id="color-picker-component-id-{{ $model }}" class="color-picker-input disabled:cursor-not-allowed focus:!ring focus:!ring-opacity-30 focus:!border-transparent block w-full ltr:pr-10 ltr:pl-4 rtl:pl-10 rtl:!pr-4 py-2.5 placeholder:font-normal placeholder:text-xs dark:placeholder-zinc-300 text-xs font-medium shadow-sm text-zinc-700 dark:text-white rounded-md dark:bg-transparent  cursor-pointer border {{ $errors->first($model) ? 'border-red-500 text-red-600 placeholder-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 placeholder-gray-400 focus:ring-primary-600 focus:border-primary-600 dark:border-zinc-600' }}" {{ $attributes }}>
    </div>

    {{-- Error --}}
    @error($model)
        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first($model) }}</p>
    @enderror

</div>