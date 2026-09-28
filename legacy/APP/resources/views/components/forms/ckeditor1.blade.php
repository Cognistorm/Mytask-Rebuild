@props(['label', 'placeholder', 'model','quillId', 'old' => null, 'target', 'required' => false, 'id' => ''])

<div class="{{ $errors->first($model) ? 'ckeditor-has-error' : '' }}">

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

    {{-- Ckeditor --}}
    <div class="mt-2.5 relative" wire:ignore>
        @if ($old)
            <div id="{{$quillId}}"><?= str_replace( '&', '&amp;', $old ); ?></div>
        @else
            <div id="{{$quillId}}"></div>
        @endif
    </div>

    {{-- Error --}}
    @error($model)
        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first($model) }}</p>
    @enderror

</div>

@push('styles')
    {{-- Quill Style --}}
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <style>
        [dir="rtl"] .ql-editor {
            direction: rtl;
            text-align: right;
        }
        .ql-container.ql-snow {
            min-height: 100px;
            border-top: 1px solid rgb(209 213 219) !important;
        }
        .ql-container.ql-snow .ql-editor {
            max-height: 450px;
        }
        .dark .ql-editor.ql-blank::before {
            color: rgb(223 223 223 / 60%) !important;
        }
        .dark .ql-editor {
            background-color: transparent !important;
        }
    </style>
@endpush

@pushonce('scripts')
<script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    {{-- Quill.js Core --}}
    <script>

        // Set action button
        const target       = "{{ $target }}";

        // Set toolbar options
        var toolbarOptions = [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': __var_rtl ? 'rtl' : 'ltr' }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
        ];

        // Initialize quill.js
            var editor1 = new Quill('#{{ $quillId }}', {
                theme: 'snow',
                placeholder: '{!! str_replace("'", "’", htmlspecialchars_decode($placeholder)) !!}',
                modules: {
                    toolbar: toolbarOptions
                }
            });

            console.log(editor1)

        // Set content as empty variable
        var content = editor1.root.innerHTML;

        // Listen when text changes
        editor1.on('text-change', function(delta, source) {
            content = editor1.root.innerHTML;
        });

        // Get action button
        document.getElementById(target).onclick = function () {
            @this.set('{{ $model }}', content);
        };

      </script>

@endpushonce
