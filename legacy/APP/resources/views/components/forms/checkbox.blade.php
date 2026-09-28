@props(['label', 'model', 'hidelabel' => false])

<div>

    <div class="relative inline-flex items-center gap-1">
        <div class="relative flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm">

            {{-- Checkbox tag --}}
            <input wire:model="{{ $model }}" id="checkbox-input-component-id-{{ $model }}" true-value="1" false-value="0" class="peer absolute z-20 h-4 w-4 cursor-pointer opacity-0" type="checkbox">

            {{-- Checkbox preview --}}
            <div class="absolute start-0 top-0 z-0 h-full w-full border-2 bg-transparent peer-checked:border-primary-600 peer-indeterminate:border-current peer-checked:dark:border-current peer-indeterminate:dark:border-current rounded-sm {{ $errors->first($model) ? 'border-red-600' : 'border-gray-400 dark:border-zinc-700' }}"></div>
            
            {{-- Icon --}}
            <svg aria-hidden="true" viewBox="0 0 17 12" class="pointer-events-none absolute z-10 h-2 w-2 translate-y-6 fill-current opacity-0 transition duration-300 peer-checked:translate-y-0 peer-checked:opacity-100 peer-indeterminate:!translate-y-6 text-primary-600"><path fill="currentColor" d="M16.576.414a1.386 1.386 0 0 1 0 1.996l-9.404 9.176A1.461 1.461 0 0 1 6.149 12c-.37 0-.74-.139-1.023-.414L.424 6.998a1.386 1.386 0 0 1 0-1.996 1.47 1.47 0 0 1 2.046 0l3.68 3.59L14.53.414a1.47 1.47 0 0 1 2.046 0z"></path></svg><svg aria-hidden="true" viewBox="0 0 24 24" class="pointer-events-none absolute z-10 h-2 w-2 translate-y-6 fill-current opacity-0 transition duration-300 peer-indeterminate:translate-y-0  peer-indeterminate:opacity-100"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M2 12h20"></path></svg>

        </div>
    
        {{-- Label --}}
        <div class="inline-flex flex-col">
            <label for="checkbox-input-component-id-{{ $model }}" class="ms-1 cursor-pointer select-none text-xs+ font-normal {{ $errors->first($model) ? 'text-red-600' : 'text-zinc-600' }}">
                {{ htmlspecialchars_decode($label) }}
            </label>
        </div>
    
    </div>

    {{-- Error --}}
    @error($model)
        <p class="mt-1 text-xs text-red-600 dark:text-red-500">
            {{ $errors->first($model) }}
        </p>
    @enderror

</div>