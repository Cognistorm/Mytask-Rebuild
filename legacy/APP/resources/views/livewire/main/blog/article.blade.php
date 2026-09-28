<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24">

    <div class="relative mce-content-body break-words">

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Heading --}}
        <div class="mb-8">

            {{-- Breadcrumbs --}}
            <nav class="flex mb-3" aria-label="Breadcrumb">
                <ol role="list" class="flex items-center space-x-1 rtl:space-x-reverse">

                    {{-- Home --}}
                    <li>
                        <div>
                            <a href="{{ url('/') }}" class="text-gray-400 dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-100">
                                <svg class="flex-shrink-0 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/> </svg>
                            </a>
                        </div>
                    </li>

                    {{-- Blog --}}
                    <li>
                        <div class="flex items-center">
                            <svg class="flex-shrink-0 h-5 w-5 text-gray-200 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"> <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z"/> </svg>
                            <a href="{{ url('blog') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-100">{{ __('messages.t_blog') }}</a>
                        </div>
                    </li>

                    <li>
                        <div class="flex items-center">
                            <svg class="flex-shrink-0 h-5 w-5 text-gray-200 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                            </svg>
                            <span class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-100" aria-current="page">
                                {{ $article->title }}
                            </span>
                        </div>
                    </li>
                </ol>
            </nav>

            {{-- Title --}}
            <h2 class="text-xl md:text-2xl font-extrabold text-gray-700 dark:text-white">
                {{ $article->title }}
            </h2>

            {{-- Created date --}}
            <h3 class="text-xs md:text-xs+ md:leading-relaxed font-normal text-gray-400 dark:text-zinc-300">
                @lang('messages.t_created_date'):  {{ format_date($article->created_at) }}
            </h3>

            {{-- Image --}}
            @if ($article->image)
                <figure class="mb-10">
                    <img class="mt-6 max-w-2xl rounded-lg" src="{{ src($article->image) }}" alt="{{ $article->title }}">
                </figure>
            @endif

        </div>

        {{-- Content --}}
        <article class="break-words relative mce-content-body">
            {!! htmlspecialchars_decode($article->content) !!}
        </article>

        {{-- Share --}}
        <div class="w-full">
            <span class="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-24 flex items-center">
                {{ __('messages.t_share') }}
            </span>
            <div class="flex items-center pb-6">

                {{-- Share on Facebook --}}
                <a href="https://www.facebook.com/sharer.php?t={{ $article->title }}&u={{ url('blog', $article->slug) }}" target="_blank" data-tooltip-target="project-share-facebook" class="text-white bg-[#4267B2] hover:bg-[#4267B2]/80 focus:ring-0 focus:outline-none rounded flex items-center justify-center h-10 w-10 ltr:mr-2 rtl:ml-2">
                    <i class="si si-facebook text-xl"></i>
                </a>
                <div id="project-share-facebook" role="tooltip" class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip">
                    {{ __('messages.t_share_on_facebook') }}
                </div>

                {{-- Share on Twitter --}}
                <a href="https://twitter.com/intent/tweet?text={{ $article->title }}&url={{ url('blog', $article->slug) }}" target="_blank" data-tooltip-target="project-share-twitter" class="text-white bg-[#00acee] hover:bg-[#00acee]/80 focus:ring-0 focus:outline-none rounded flex items-center justify-center h-10 w-10 ltr:mr-2 rtl:ml-2">
                    <i class="si si-twitter text-xl"></i>
                </a>
                <div id="project-share-twitter" role="tooltip" class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip">
                    {{ __('messages.t_share_on_twitter') }}
                </div>

                {{-- Share on Linkedin --}}
                <a href="https://www.linkedin.com/shareArticle?title={{ $article->title }}&url={{ url('blog', $article->slug) }}" target="_blank" data-tooltip-target="project-share-linkedin" class="text-white bg-[#0072b1] hover:bg-[#0072b1]/80 focus:ring-0 focus:outline-none rounded flex items-center justify-center h-10 w-10 ltr:mr-2 rtl:ml-2">
                    <i class="si si-linkedin text-xl"></i>
                </a>
                <div id="project-share-linkedin" role="tooltip" class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip">
                    {{ __('messages.t_share_on_linkedin') }}
                </div>

                {{-- Share on Snapchat --}}
                <a href="https://snapchat.com/scan?attachmentUrl={{ url('blog', $article->slug) }}" target="_blank" data-tooltip-target="project-share-snapchat" class="text-gray-700 bg-[#FFFC00] hover:bg-[#FFFC00]/80 focus:ring-0 focus:outline-none rounded flex items-center justify-center h-10 w-10 ltr:mr-2 rtl:ml-2">
                    <i class="si si-snapchat text-xl"></i>
                </a>
                <div id="project-share-snapchat" role="tooltip" class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip">
                    {{ __('messages.t_share_on_snapchat') }}
                </div>

                {{-- Share on Pinterest --}}
                <a href="https://www.pinterest.com/pin/create/button/?description={{ $article->title }}&media=&url={{ url('blog', $article->slug) }}" target="_blank" data-tooltip-target="project-share-pinterest" class="text-white bg-[#E60023] hover:bg-[#E60023]/80 focus:ring-0 focus:outline-none rounded flex items-center justify-center h-10 w-10 ltr:mr-2 rtl:ml-2">
                    <i class="si si-pinterest text-xl"></i>
                </a>
                <div id="project-share-pinterest" role="tooltip" class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip">
                    {{ __('messages.t_share_on_pinterest') }}
                </div>

                {{-- Share on Whatsapp --}}
                <a href="https://web.whatsapp.com/send?text={{ url('blog', $article->slug) }}" target="_blank" data-tooltip-target="project-share-whatsapp" class="text-white bg-[#25D366] hover:bg-[#25D366]/80 focus:ring-0 focus:outline-none rounded flex items-center justify-center h-10 w-10 ltr:mr-2 rtl:ml-2">
                    <i class="si si-whatsapp text-xl"></i>
                </a>
                <div id="project-share-whatsapp" role="tooltip" class="inline-block absolute invisible z-10 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-sm shadow-sm opacity-0 tooltip">
                    {{ __('messages.t_share_on_whatsapp') }}
                </div>

            </div>
        </div>

        {{-- Comments --}}
        @if (settings('blog')->enable_comments)
            <div class="w-full mt-2">
                <section class="py-8 lg:py-16 antialiased">
                    <div class="max-w-xl">

                        {{-- Add new comment --}}
                        @auth
                            <div class="mb-4 p-4 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                                <div class="flex items-center mb-2">
                                    <div class="w-8 h-8 ltr:mr-3 rtl:ml-3 inline-flex flex-shrink-0 relative">
                                        @if (auth()->user()->avatar)
                                            <img class="w-full h-full rounded-full object-cover" src="{{ src(auth()->user()->avatar) }}" alt="{{ auth()->user()->fullname }}">
                                        @else
                                            @php
                                                $faker = Faker\Factory::create();
                                                $color = $faker->rgbColor();
                                            @endphp
                                            <div class="flex items-center justify-center h-full w-full mask is-squircle text-sm uppercase font-medium" style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                                {{ Str::substr(auth()->user()->fullname, 0, 2) }}
                                            </div>
                                        @endif
                                    </div>
                                    <span class="text-sm font-medium text-gray-900 dark:text-white">{{ auth()->user()->fullname }}</span>
                                </div>
                            </div>

                            <x-form wire:submit.prevent="addComment">

                                {{-- Comment --}}
                                <div class="w-full mb-4">
                                    <x-forms.textarea required
                                        :label="__('messages.t_comment')"
                                        :placeholder="__('messages.t_enter_ur_comment')"
                                        model="comment"
                                        rows="6"
                                        icon="chat-teardrop-dots" />
                                </div>

                                {{-- Submit --}}
                                <x-bladewind.button size="small" class="mx-auto !px-6" can_submit="true">
                                    @lang('messages.t_add_comment')
                                </x-bladewind.button>

                            </x-form>
                        @else
                            <div class="p-6 bg-gray-50 dark:bg-zinc-700 rounded-lg text-center">
                                <p class="text-gray-600 dark:text-gray-400 mb-4">{{ __('messages.t_login_to_add_comment') }}</p>
                                <a href="{{ route('auth.login') }}" class="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
                                    {{ __('messages.t_login') }}
                                </a>
                            </div>
                        @endauth

                        {{-- List of comments --}}
                        @foreach ($comments as $comment)
                            <div class="text-base mt-12">
                                <footer class="flex justify-between items-center mb-2">
                                    <div class="flex items-center">

                                        {{-- Avatar --}}
                                        <div class="inline-flex items-center mr-3 text-sm text-gray-900 dark:text-white font-semibold">
                                            <div class="w-7 h-7 ltr:mr-2 rtl:ml-2 inline-flex flex-shrink-0 relative">
                                                @php
                                                    $faker = Faker\Factory::create();
                                                    $color = $faker->rgbColor();
                                                @endphp
                                                <div class="flex items-center justify-center h-full w-full mask is-squircle text-xs uppercase dark:bg-navy-500 dark:text-navy-100 font-medium" style="background-color: rgba({{ $color }}, .1);color: rgb({{ $color }})">
                                                    {{ Str::substr($comment->name, 0, 2) }}
                                                </div>
                                            </div>
                                            <span>{{ $comment->name }}</span>
                                        </div>

                                        {{-- Date --}}
                                        <p class="text-xs text-gray-400 dark:text-zinc-300">
                                            {{ format_date($comment->created_at, 'ago') }}
                                        </p>

                                    </div>
                                </footer>
                                <p class="text-gray-600 dark:text-gray-400 text-xs+">
                                    {{ $comment->comment }}
                                </p>
                            </div>
                        @endforeach

                        {{-- Pages --}}
                        @if ($comments->hasPages())
                            <div class="bg-gray-100 dark:bg-zinc-800 px-4 py-5 sm:px-6 flex justify-center mt-8 rounded-md">
                                {!! $comments->links('pagination::tailwind') !!}
                            </div>
                        @endif

                    </div>
                </section>
            </div>
        @endif

    </div>
</div>

{{-- Inject css --}}
@push('styles')

    {{-- Simple icons plugin --}}
    <link rel="stylesheet" href="{{ asset('js/plugins/simple-icons-font/simple-icons.min.css') }}" type="text/css">

@endpush
