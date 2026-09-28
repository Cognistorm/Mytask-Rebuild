@props(['model', 'label' => null, 'required' => false, 'options', 'live' => false])

<div>

    {{-- Label --}}
    @if ($label)
        <label class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate {{ $errors->first($model) ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-white' }}" title="{{ htmlspecialchars_decode($label) }}">

            {{-- Label text --}}
            {{ htmlspecialchars_decode($label) }}

            {{-- Required --}}
            @if ($required)
                <span class="font-bold text-red-400">*</span>
            @endif

        </label>
    @endif

    {{-- Radio --}}
    <fieldset @class(['relative', 'mt-2.5' => isset($label)])>
        <div class="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-4">
        
            {{-- Options --}}
            @foreach ($options as $key => $item)
                <div class="border border-gray-100 dark:bg-zinc-700 dark:border-transparent dark:shadow-none flex items-center px-4 py-2.5 rounded-3xl shadow-sm">

                    {{-- Input --}}
                    <input 
                        id="radio-element-id-{{ $item['value'] }}" 
                        name="{{ $model }}" 
                        @if ($live)
                            wire:model.live="{{ $model }}" 
                        @else
                            wire:model="{{ $model }}" 
                        @endif
                        type="radio" 
                        value="{{ $item['value'] }}"
                        class="h-5 w-5 border-gray-300 text-primary-600 focus:ring-0 focus:outline-none focus:ring-offset-0 dark:bg-zinc-900 dark:border-transparent mt-px">

                    {{-- Label --}}
                    <label for="radio-element-id-{{ $item['value'] }}" class="block font-semibold cursor-pointer ltr:ml-3 rtl:mr-3 text-slate-500 text-xs tracking-wide dark:text-gray-100">
                        {{ $item['text'] }}
                    </label>

                </div>
            @endforeach
        
        </div>
    </fieldset>

</div>