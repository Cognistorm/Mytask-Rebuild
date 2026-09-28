@props(['label' => null, 'model', 'accept' => 'image/jpg,image/jpeg,image/png'])

<div>

    {{-- Label --}}
    @if ($label)
        <label for="text-input-component-id-{{ $model }}" class="mb-2 text-xs font-normal tracking-wide flex items-center {{ $errors->first($model) ? 'text-red-600 dark:text-red-500' : 'text-gray-700 dark:text-white' }}">
            {{ htmlspecialchars_decode($label) }}
        </label>
    @endif
    
    {{-- Form --}}
    <div class="relative">
        <input class="block w-full text-xs text-gray-900 bg-transparent border dark:text-gray-300 rounded-md cursor-pointer focus:outline-none dark:dark:border-zinc-500 border-gray-300 file:!bg-slate-100 file:!text-slate-500 file:hover:!bg-slate-200 dark:border-zinc-600 dark:bg-transparent dark:file:!bg-zinc-700 dark:file:!text-zinc-200 file:!text-xs" id="file_input" type="file" wire:model="{{ $model }}" @if ($accept) accept="{{ $accept }}" @endif>
    </div>

    {{-- Error --}}
    @error($model)
        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first($model) }}</p>
    @enderror

</div>