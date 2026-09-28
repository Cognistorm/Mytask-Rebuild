<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24">
    <div class="relative mce-content-body break-words">
        
        {{-- Heading --}}
        <div class="mb-8">

            {{-- Home --}}
            <a href="{{ url('/') }}" class="text-xs+ uppercase font-semibold tracking-wider mb-2 text-primary-600">
                @lang('messages.t_home')
            </a>

            {{-- Title --}}
            <h2 class="text-xl md:text-2xl font-extrabold text-gray-700 dark:text-white">
                {{ $page->title }}
            </h2>

            {{-- Last updated --}}
            <h3 class="text-xs md:text-sm md:leading-relaxed font-normal text-gray-400 dark:text-zinc-300">
                {{ __('messages.t_page_last_update_date', ['date' => format_date($page->updated_at)]) }}
            </h3>

        </div>
    
        {{-- Content --}}
        <article class="break-words relative mce-content-body">
            {!! htmlspecialchars_decode($page->content) !!}
        </article>
            
    </div>
</div>

{{-- Include Css --}}
@push('styles')

    {{-- Check theme --}}
    @if (current_theme() === 'dark')
        <link rel="stylesheet" href="{{ asset('js/plugins/tinymce/skins/content/dark/content.min.css') }}">
    @else
        <link rel="stylesheet" href="{{ asset('js/plugins/tinymce/skins/content/default/content.min.css') }}">
    @endif

@endpush