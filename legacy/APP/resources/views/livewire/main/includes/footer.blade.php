<footer class="bg-white border-t border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 px-4 sm:px-6 lg:px-20 pt-20 pb-5 relative z-[9]">

    <div class="container mx-auto px-4">



        {{-- Grid (PAGES) --}}

        <div class="grid grid-cols-1 md:gap-x-6 gap-y-6 mb-10 lg:grid-cols-12 md:grid-cols-6 sm:grid-cols-2">

            {{-- Column 1 --}}

            <div class="col-span-3">

                {{-- Column title --}}

                <div class="font-bold text-sm text-gray-700 mb-4 uppercase dark:text-white tracking-widest">

                    {{ __('messages.t_footer_column_1') }}

                </div>

                {{-- Column pages --}}

                @if (count($pages))

                    <ul>

                        @foreach ($pages as $page)

                            @if ($page->column == 1)

                                <li>

                                    @if ($page->is_link && $page->link)

                                        <a href="{{ $page->link }}" target="_blank" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @else

                                        <a href="{{ url('page', $page->slug) }}" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @endif

                                </li>

                            @endif

                        @endforeach

                    </ul>

                @endif

            </div>

            {{-- Column 2 --}}

            <div class="col-span-3">

                {{-- Column title --}}

                <div class="font-bold text-sm text-gray-700 mb-4 uppercase dark:text-white tracking-widest">

                    {{ __('messages.t_footer_column_2') }}

                </div>

                {{-- Column pages --}}

                @if (count($pages))

                    <ul>

                        @foreach ($pages as $page)

                            @if ($page->column == 2)

                                <li>

                                    @if ($page->is_link && $page->link)

                                        <a href="{{ $page->link }}" target="_blank" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @else

                                        <a href="{{ url('page', $page->slug) }}" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @endif

                                </li>

                            @endif

                        @endforeach

                    </ul>

                @endif

            </div>

            {{-- Column 3 --}}

            <div class="col-span-3">

                {{-- Column title --}}

                <div class="font-bold text-sm text-gray-700 mb-4 uppercase dark:text-white tracking-widest">

                    {{ __('messages.t_footer_column_3') }}

                </div>



                {{-- Column pages --}}

                @if (count($pages))

                    <ul>

                        @foreach ($pages as $page)

                            @if ($page->column == 3)

                                <li>

                                    @if ($page->is_link && $page->link)

                                        <a href="{{ $page->link }}" target="_blank" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @else

                                        <a href="{{ url('page', $page->slug) }}" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @endif

                                </li>

                            @endif

                        @endforeach

                    </ul>

                @endif

            </div>

            {{-- Column 4 --}}

            <div class="col-span-3">

                {{-- Column title --}}

                <div class="font-bold text-sm text-gray-700 mb-4 uppercase dark:text-white tracking-widest">

                    {{ __('messages.t_footer_column_4') }}

                </div>
                {{-- Column pages --}}

                @if (count($pages))

                    <ul>

                        @foreach ($pages as $page)

                            @if ($page->column == 4)

                                <li>

                                    @if ($page->is_link && $page->link)

                                        <a href="{{ $page->link }}" target="_blank" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @else

                                        <a href="{{ url('page', $page->slug) }}" class="block font-normal text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-100 dark:hover:text-gray-50 text-sm mb-2">

                                            {{ $page->title }}

                                        </a>

                                    @endif

                                </li>

                            @endif

                        @endforeach

                    </ul>

                @endif

            </div>

        </div>



        {{-- Bottom section --}}

        <div class="grid md:flex justify-center md:justify-between items-center border-t-2 border-gray-100 dark:border-zinc-700 pt-4">



            {{-- Logo & copyrights --}}

            <div class="flex items-center justify-center md:justify-items-start mb-4 md:mb-0">




                {{-- Light logo --}}

                @if (current_theme() == 'light' && settings('footer')?->logo)

                    <div>

                        <a href="{{ url('/') }}" class="h-full">

                            <img src="{{ src(settings('footer')->logo) }}" alt="{{ settings('general')?->title }}" class="w-20">

                        </a>

                    </div>

                @endif



                {{-- Dark logo --}}

                @if (current_theme() == 'dark' && settings('footer')?->logo_dark)

                    <div>

                        <a href="{{ url('/') }}" class="h-full">

                            <img src="{{ src(settings('footer')?->logo_dark) }}" alt="{{ settings('general')?->title }}" class="w-20">

                        </a>

                    </div>

                @endif



                {{-- Copyrights --}}

                <div class="text-[#b5b6ba] dark:text-zinc-200 font-normal text-sm ltr:ml-6 rtl:mr-6">

                    {!! settings('footer')->copyrights !!}

                </div>



            </div>



            {{-- Social media --}}

            <div>

                <div class="flex items-center space-x-2 rtl:space-x-reverse">



                    {{-- Tiktok --}}

                    @if (settings('footer')->social_tiktok)

                        <a href="{{ settings('footer')->social_tiktok }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-black hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>

                        </a>

                    @endif



                    {{-- Instagram --}}

                    @if (settings('footer')->social_instagram)

                        <a href="{{ settings('footer')->social_instagram }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#E4405F] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>

                        </a>

                    @endif



                    {{-- Linkedin --}}

                    @if (settings('footer')->social_linkedin)

                        <a href="{{ settings('footer')->social_linkedin }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#0A66C2] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>

                        </a>

                    @endif



                    {{-- Facebook --}}

                    @if (settings('footer')->social_facebook)

                        <a href="{{ settings('footer')->social_facebook }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#1877F2] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>

                        </a>

                    @endif



                    {{-- Pinterest --}}

                    @if (settings('footer')->social_pinterest)

                        <a href="{{ settings('footer')->social_pinterest }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#BD081C] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>

                        </a>

                    @endif



                    {{-- X.com --}}

                    @if (settings('footer')->social_twitter)

                        <a href="{{ settings('footer')->social_twitter }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-black hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>X</title><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>

                        </a>

                    @endif



                    {{-- Github --}}

                    @if (settings('footer')->social_github)

                        <a href="{{ settings('footer')->social_github }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#181717] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-5.h-4 fill-current" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 30 30"> <path d="M15,3C8.373,3,3,8.373,3,15c0,5.623,3.872,10.328,9.092,11.63C12.036,26.468,12,26.28,12,26.047v-2.051 c-0.487,0-1.303,0-1.508,0c-0.821,0-1.551-0.353-1.905-1.009c-0.393-0.729-0.461-1.844-1.435-2.526 c-0.289-0.227-0.069-0.486,0.264-0.451c0.615,0.174,1.125,0.596,1.605,1.222c0.478,0.627,0.703,0.769,1.596,0.769 c0.433,0,1.081-0.025,1.691-0.121c0.328-0.833,0.895-1.6,1.588-1.962c-3.996-0.411-5.903-2.399-5.903-5.098 c0-1.162,0.495-2.286,1.336-3.233C9.053,10.647,8.706,8.73,9.435,8c1.798,0,2.885,1.166,3.146,1.481C13.477,9.174,14.461,9,15.495,9 c1.036,0,2.024,0.174,2.922,0.483C18.675,9.17,19.763,8,21.565,8c0.732,0.731,0.381,2.656,0.102,3.594 c0.836,0.945,1.328,2.066,1.328,3.226c0,2.697-1.904,4.684-5.894,5.097C18.199,20.49,19,22.1,19,23.313v2.734 c0,0.104-0.023,0.179-0.035,0.268C23.641,24.676,27,20.236,27,15C27,8.373,21.627,3,15,3z"></path></svg>

                        </a>

                    @endif



                    {{-- Youtube --}}

                    @if (settings('footer')->social_youtube)

                        <a href="{{ settings('footer')->social_youtube }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#FF0000] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>

                        </a>

                    @endif



                    {{-- Wechat --}}

                    @if (settings('footer')->social_wechat)

                        <a href="{{ settings('footer')->social_wechat }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#07C160] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/></svg>

                        </a>

                    @endif



                    {{-- Snapchat --}}

                    @if (settings('footer')->social_snapchat)

                        <a href="{{ settings('footer')->social_snapchat }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#FFFC00] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-black">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/></svg>

                        </a>

                    @endif



                    {{-- Whatsapp --}}

                    @if (settings('footer')->social_whatsapp)

                        <a href="{{ settings('footer')->social_whatsapp }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#25D366] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>

                        </a>

                    @endif



                    {{-- Sinaweibo --}}

                    @if (settings('footer')->social_sinaweibo)

                        <a href="{{ settings('footer')->social_sinaweibo }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#E6162D] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.601l.014-.028zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.57-.18-.405-.615.375-.977.42-1.804 0-2.404-.781-1.112-2.915-1.053-5.364-.03 0 0-.766.331-.571-.271.376-1.217.315-2.224-.27-2.809-1.338-1.337-4.869.045-7.888 3.08C1.309 10.87 0 13.273 0 15.348c0 3.981 5.099 6.395 10.086 6.395 6.536 0 10.888-3.801 10.888-6.82 0-1.822-1.547-2.854-2.915-3.284v.01zm1.908-5.092c-.766-.856-1.908-1.187-2.96-.962-.436.09-.706.511-.616.932.09.42.511.691.932.602.511-.105 1.067.044 1.442.465.376.421.466.977.316 1.473-.136.406.089.856.51.992.405.119.857-.105.992-.512.33-1.021.12-2.178-.646-3.035l.03.045zm2.418-2.195c-1.576-1.757-3.905-2.419-6.054-1.968-.496.104-.812.587-.706 1.081.104.496.586.813 1.082.707 1.532-.331 3.185.15 4.296 1.383 1.112 1.246 1.429 2.943.947 4.416-.165.48.106 1.007.586 1.157.479.165.991-.104 1.157-.586.675-2.088.241-4.478-1.338-6.235l.03.045z"/></svg>

                        </a>

                    @endif



                    {{-- Telegram --}}

                    @if (settings('footer')->social_telegram)

                        <a href="{{ settings('footer')->social_telegram }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#26A5E4] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>

                        </a>

                    @endif



                    {{-- Vk --}}

                    @if (settings('footer')->social_vk)

                        <a href="{{ settings('footer')->social_vk }}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-[#0077FF] hover:bg-opacity-90 transition-colors ease-linear duration-200 rounded-full text-white">

                            <svg class="h-4 w-4 fill-current" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m9.489.004.729-.003h3.564l.73.003.914.01.433.007.418.011.403.014.388.016.374.021.36.025.345.03.333.033c1.74.196 2.933.616 3.833 1.516.9.9 1.32 2.092 1.516 3.833l.034.333.029.346.025.36.02.373.025.588.012.41.013.644.009.915.004.98-.001 3.313-.003.73-.01.914-.007.433-.011.418-.014.403-.016.388-.021.374-.025.36-.03.345-.033.333c-.196 1.74-.616 2.933-1.516 3.833-.9.9-2.092 1.32-3.833 1.516l-.333.034-.346.029-.36.025-.373.02-.588.025-.41.012-.644.013-.915.009-.98.004-3.313-.001-.73-.003-.914-.01-.433-.007-.418-.011-.403-.014-.388-.016-.374-.021-.36-.025-.345-.03-.333-.033c-1.74-.196-2.933-.616-3.833-1.516-.9-.9-1.32-2.092-1.516-3.833l-.034-.333-.029-.346-.025-.36-.02-.373-.025-.588-.012-.41-.013-.644-.009-.915-.004-.98.001-3.313.003-.73.01-.914.007-.433.011-.418.014-.403.016-.388.021-.374.025-.36.03-.345.033-.333c.196-1.74.616-2.933 1.516-3.833.9-.9 2.092-1.32 3.833-1.516l.333-.034.346-.029.36-.025.373-.02.588-.025.41-.012.644-.013.915-.009ZM6.79 7.3H4.05c.13 6.24 3.25 9.99 8.72 9.99h.31v-3.57c2.01.2 3.53 1.67 4.14 3.57h2.84c-.78-2.84-2.83-4.41-4.11-5.01 1.28-.74 3.08-2.54 3.51-4.98h-2.58c-.56 1.98-2.22 3.78-3.8 3.95V7.3H10.5v6.92c-1.6-.4-3.62-2.34-3.71-6.92Z"/></svg>

                        </a>

                    @endif




                </div>

            </div>



        </div>



    </div>



</footer>
