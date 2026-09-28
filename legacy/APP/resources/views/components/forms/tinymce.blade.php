@props(['model', 'id', 'label' => null, 'required' => false, 'target' => null, 'value'=>null])

@php
    $errorKey = $model;
    if (!$errors->has($errorKey) && str_contains($errorKey, '.')) {
        $baseField = explode('.', $errorKey)[0];
        if ($errors->has($baseField)) {
            $errorKey = $baseField;
        }
    }
@endphp

<div>
    {{-- Editor --}}
    <div wire:ignore class="{{ $errors->first($errorKey) ? 'tinymce-error' : '' }}">
        @if ($label)
            <label for="select-component-id-{{ $model }}"
                   class="mb-2.5 block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate {{ $errors->first($errorKey) ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-white' }}"
                   title="{{ htmlspecialchars_decode($label) }}">
                {{ htmlspecialchars_decode($label) }}
                @if ($required)
                    <span class="font-bold text-red-400">*</span>
                @endif
            </label>
        @endif

        <textarea class="min-h-fit h-48 mt-2.5 {{ $errors->first($errorKey) ? 'border-red-500' : 'border-gray-300' }}"
                  id="tinymce-element-{{ $id }}">
            {{-- Pre-defined value --}}
            @if ($value ?? null)
                {!! $value !!}
            @endif
        </textarea>
    </div>

    {{-- Hidden model mirror to resync editor on reopen --}}
    <textarea id="tinymce-value-{{ $id }}" wire:model="{{ $model }}" class="hidden"></textarea>
    {{-- Error --}}
    @error($errorKey)
    <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first($errorKey) }}</p>
    @enderror
</div>

{{-- Inject TinyMCE plugin --}}
@pushOnce('scripts')
    <script src="{{ asset('js/plugins/tinymce/tinymce.min.js') }}"></script>
@endPushOnce

{{-- Initialize --}}
@push('scripts')
    <script>
        // Initialize TinyMCE
        tinymce.init({
            // Element
            selector: '#tinymce-element-{{ $id }}',

            // Language
            language: '{{ app()->getLocale() }}',

            // Plugins
            plugins: [
                'accordion', 'advlist', 'autolink', 'link', 'image', 'lists', 'charmap', 'preview', 'anchor', 'pagebreak', 'searchreplace', 'wordcount', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'emoticons', 'help'
            ],

            // Toolbar
            toolbar: 'accordion | undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | link image | print preview media fullscreen | ' +
                'forecolor backcolor emoticons | help',

            // Menu
            menu: {
                favs: {title: 'My Favorites', items: 'code visualaid | searchreplace | emoticons'}
            },

            // Link outside
            link_default_target: '_blank',

            // Emojis
            emoticons_database: 'emojiimages',
            emoticons_images_url: '{{ url("js/plugins/twemoji/assets/72x72") }}/',
            relative_urls: false,

            // Files
            image_title: true,
            automatic_uploads: true,
            file_picker_types: 'image',
            file_picker_callback: (cb, value, meta) => {
                const input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.setAttribute('accept', 'image/*');
                input.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.addEventListener('load', () => {
                        /* Register blob in TinyMCE's image blob registry */
                        const id = 'blobid' + (new Date()).getTime();
                        const blobCache = tinymce.activeEditor.editorUpload.blobCache;
                        const base64 = reader.result.split(',')[1];
                        const blobInfo = blobCache.create(id, file, base64);
                        blobCache.add(blobInfo);
                        cb(blobInfo.blobUri(), {title: file.name});
                    });
                    reader.readAsDataURL(file);
                });
                input.click();
            },

            // Toolbar
            menubar: 'edit view insert format tools table',
            toolbar_mode: 'sliding',

            // Theme
            skin: '{{ current_theme() === "dark" ? "oxide-dark" : "oxide" }}',
            content_css: '{{ current_theme() === "dark" ? "dark" : "default" }}',
            content_style: "body { font-family: @php echo settings('appearance')->font_family @endphp, sans-serif !important; font-size: 14px; {{ current_theme() === 'dark' ? 'background-color: #3f3f46 !important; color: #ffffff !important;' : 'background-color: #ffffff !important; color: #3f3f46 !important;' }} }",

            // Setup
            setup: function (editor) {
                editor.on('init change', function () {
                    editor.save();
                });
                editor.on('submit', function () {
                    @this.
                    set('{{ $model }}', editor.getContent());
                });
                editor.on('change', function () {
                    @this.
                    set('{{ $model }}', editor.getContent());
                });
            }
        });

        // Sync Livewire model back into TinyMCE when it changes (eg. reopening modal)
        document.addEventListener('livewire:load', () => {
            Livewire.hook('message.processed', () => {
                try {
                    const mirror = document.getElementById('tinymce-value-{{ $id }}');
                    const instance = tinymce.get('tinymce-element-{{ $id }}');
                    if (!mirror || !instance) return;
                    const newVal = mirror.value || '';
                    const curVal = instance.getContent() || '';
                    const focused = typeof instance.hasFocus === 'function' && instance.hasFocus();
                    if (!focused && newVal !== curVal) {
                        instance.setContent(newVal);
                    }
                } catch (e) { /* noop */
                }
            });
        });
    </script>
@endpush
