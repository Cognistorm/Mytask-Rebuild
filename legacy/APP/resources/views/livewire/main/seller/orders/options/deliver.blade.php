<div class="w-full" x-data="window.TBhqVNUmCYEnOEj"
     x-on:livewire-upload-start="uploadStart()"
     x-on:livewire-upload-finish="uploadFinish()"
     x-on:livewire-upload-error="uploadError($event)"
     x-on:livewire-upload-progress="uploadingProgress = $event.detail.progress">

    {{-- Loading --}}
    <x-forms.loading/>

    {{-- Header --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mb-10">
        <nav
            class="justify-between px-4 py-3 text-gray-700 border border-gray-100 rounded-lg shadow-sm sm:flex sm:px-5 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-none"
            aria-label="Breadcrumb">

            {{-- Menu --}}
            <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">
                {{-- Main home --}}
                <li>
                    <div class="flex items-center">
                        <a href="{{ url('/') }}"
                           class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_home')
                        </a>
                    </div>
                </li>

                {{-- My dashboard --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor"
                             viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                  clip-rule="evenodd"></path>
                        </svg>
                        <a href="{{ url('seller/home') }}"
                           class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_my_dashboard')
                        </a>
                    </div>
                </li>

                {{-- Orders --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor"
                             viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                  clip-rule="evenodd"></path>
                        </svg>
                        <a href="{{ url('seller/orders') }}"
                           class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_orders')
                        </a>
                    </div>
                </li>

                {{-- Deliver work --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor"
                             viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd"
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                  clip-rule="evenodd"></path>
                        </svg>
                        <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">
                            @lang('messages.t_deliver_work')
                        </span>
                    </div>
                </li>
            </ol>

            {{-- Action buttons --}}
            <div class="flex items-center">
                {{-- Back to orders --}}
                <a href="{{ url('seller/orders') }}"
                   class="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold tracking-widest text-gray-700 uppercase transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md shadow-sm hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:text-gray-800 active:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-white">
                    @lang('messages.t_back_to_orders')
                </a>
            </div>
        </nav>
    </div>

    {{-- Content --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div class="grid grid-cols-12 md:gap-x-6 gap-y-6">
            {{-- Submit work --}}
            <div class="col-span-12">
                <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 px-8 py-6 mb-8">

                    @if ($order->delivered_work)
                        <div class="p-6 col-span-12 lg:col-span-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700">
                            <div class="p-6">
                                {{-- Delivered work header --}}
                                <div class="mb-6">
                                    <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                        @lang('messages.t_delivered_work')
                                    </h4>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">
                                        @lang('messages.t_delivered_at')
                                        : {{ \Carbon\Carbon::parse($order->delivered_at)->format('d.m.Y') }}
                                    </p>
                                </div>

                                <div class="grid grid-cols-1 gap-6 mb-6">
                                    {{-- File Attachment Section --}}
                                    @if($order->delivered_work->attached_work)
                                        <div>
                                            <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
                                                <div class="flex items-center justify-center mb-4">
                                                    <div class="w-32 h-32 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                                                        <svg class="w-16 h-16 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div class="text-center">
                                                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                                        {{ $order->delivered_work->attached_work['id'] }}.{{ $order->delivered_work->attached_work['extension'] }}
                                                    </p>
                                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                                        {{ strtoupper($order->delivered_work->attached_work['extension']) }}
                                                        • {{ human_filesize($order->delivered_work->attached_work['size']) }}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    @endif

                                    {{-- Quick Response Section (Independent of file attachment) --}}
                                    @if ($order->delivered_work->quick_response)
                                        <div>
                                            <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
                                                <div class="mb-4">
                                                    <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                        @lang('messages.t_quick_response')
                                                    </h5>
                                                    <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                        {!! nl2br($order->delivered_work->quick_response) !!}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    @endif

                                    {{-- No Content Message (when neither file nor quick response) --}}
                                    @if (!$order->delivered_work->attached_work && !$order->delivered_work->quick_response)
                                        <div>
                                            <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 text-center">
                                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                                    @lang('messages.t_no_delivered_content')
                                                </p>
                                            </div>
                                        </div>
                                    @endif
                                </div>

                                {{-- Resubmit work button --}}
                                <div class="flex justify-end">
                                    <button
                                        x-on:click="showResubmitModal = true"
                                        type="button"
                                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                        wire:loading.attr="disabled"
                                        wire:target="resubmit">

                                        {{-- Loading indicator --}}
                                        <div wire:loading wire:target="resubmit">
                                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>

                                        {{-- Button text --}}
                                        <div wire:loading.remove wire:target="resubmit">
                                            @lang('messages.t_resubmit_work_again')
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    @endif

                    @if (!$order->delivered_work)
                        <div class="grid grid-cols-12 gap-6">
                            {{-- Upload work --}}
                            <div class="col-span-12" x-data="fileUpload()">
                                <label class="block text-[0.8125rem] font-semibold text-gray-700 dark:text-white mb-2">
                                    {{ __('messages.t_upload_work') }}
                                </label>

                                {{-- File Preview Area - Two Grid Layout --}}
                                <div x-show="selectedFile" class="mb-4">
                                    <div class="grid grid-cols-2 gap-6">
                                        {{-- Left side - File Preview --}}
                                        <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 h-full">
                                            {{-- Image Preview --}}
                                            <div x-show="isImage" class="text-center mb-4">
                                                <img x-bind:src="filePreview" alt="File preview" class="max-w-full rounded-lg shadow-sm" style="max-height: 400px; object-fit: contain;">
                                            </div>
                                            {{-- File Icon for Non-Images --}}
                                            <div x-show="!isImage" class="flex items-center justify-center mb-4">
                                                <div class="w-32 h-32 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                                                    <svg class="w-16 h-16 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            {{-- File Information --}}
                                            <div class="text-center">
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1" x-text="fileName"></p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400"><span x-text="fileType.toUpperCase()"></span> • <span x-text="fileSize"></span></p>
                                            </div>
                                        </div>

                                        {{-- Right side - Actions --}}
                                        <div class="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 h-full flex flex-col justify-center">
                                            <div class="text-center space-y-4">
                                                <div>
                                                    <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                        {{ __('messages.t_your_file_is_ready_to_be_delivered') }}
                                                    </h4>
                                                </div>
                                                {{-- Remove Button --}}
                                                <button @click="removeFile()" type="button" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                                                    <svg class="w-4 h-4 ltr:mr-2 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                    </svg>
                                                    {{ __('messages.t_remove_file') }}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {{-- Upload area --}}
                                <div class="border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-lg p-6 text-center"
                                     x-show="!selectedFile"
                                     x-bind:class="{ 'bg-primary-50 dark:bg-primary-900 border-primary-300 dark:border-primary-700': isDragOver }"
                                     @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false" @drop.prevent="handleDrop($event)">
                                    <div class="space-y-2">
                                        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none"
                                             viewBox="0 0 48 48" aria-hidden="true">
                                            <path
                                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        <div class="flex text-sm text-gray-600 dark:text-gray-300 justify-center">
                                            <label for="work-upload" class="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                                                <span>{{ __('messages.t_upload_a_file') }}</span>
                                                <input wire:model="work" id="work-upload" name="work-upload" type="file" accept=".zip,.rar,.7z" class="sr-only" @change="handleFileSelect($event)">
                                            </label>
                                        </div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">
                                            @lang('messages.t_zip_rar_7z_allowed_max_size', ['size' => 10])
                                        </p>
                                    </div>
                                </div>

                                {{-- Replace file --}}
                                <div class="mt-4 text-center" x-show="selectedFile">
                                    <label for="work-upload-replace" class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-zinc-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer">
                                        <svg class="w-4 h-4 ltr:mr-2 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                        </svg>
                                        {{ __('messages.t_replace_file') }}
                                        <input wire:model="work" id="work-upload-replace" name="work-upload-replace" type="file" accept=".zip,.rar,.7z" class="sr-only" @change="handleFileSelect($event)">
                                    </label>
                                </div>

                                {{-- Upload progress --}}
                                <div x-show="uploadingProgress > 0" class="mt-4">
                                    <div class="bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                        <div class="bg-primary-600 h-2 rounded-full transition-all duration-300" :style="`width: ${uploadingProgress}%`"></div>
                                    </div>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1" x-text="'{{ __('messages.t_uploading') }} ' + uploadingProgress + '%'"></p>
                                </div>

                                {{-- Client-side validation error --}}
                                <p x-show="errorMessage" x-text="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-400"></p>
                            </div>

                            {{-- Quick response --}}
                            <div class="col-span-12">
                                <label for="deliver-work-quick-response" class="block text-[0.8125rem] font-semibold text-gray-700 dark:text-white">
                                    {{ __('messages.t_quick_response') }}
                                </label>
                                <div class="mt-2.5 relative">
                                    <textarea placeholder="{{ __('messages.t_describe_ur_delivery_in_detail') }}" wire:model.defer="quick_response" rows="8" id="deliver-work-quick-response" class="resize-none focus:!ring-1 block w-full ltr:pr-10 ltr:pl-4 rtl:pl-10 rtl:!pr-4 py-3.5 placeholder:font-normal placeholder:text-[13px] dark:placeholder-zinc-300 text-sm font-medium text-zinc-800 dark:text-white rounded-md dark:bg-transparent focus:!ring-primary-600 focus:!border-primary-600 border-gray-300 dark:border-zinc-500" maxlength="2500"></textarea>
                                    <div class="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-3 rtl:pl-3 flex items-center pointer-events-none">
                                        <svg class="text-gray-400 w-5 h-5" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7 7h10v2H7zm0 4h7v2H7z"></path>
                                            <path d="M20 2H4c-1.103 0-2 .897-2 2v18l5.333-4H20c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm0 14H6.667L4 18V4h16v12z"></path>
                                        </svg>
                                    </div>
                                </div>
                                @error('quick_response')
                                <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                @enderror
                            </div>

                            {{-- Submit --}}
                            <div class="col-span-12 mt-8 mb-6">
                                <div class="flex justify-end">
                                    <button wire:click="submit" type="button"
                                            :disabled="uploadingProgress > 0"
                                            class="bg-primary-600 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-all duration-200"
                                            :class="uploadingProgress > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'">

                                        {{-- Loading spinner --}}
                                        <svg x-show="uploadingProgress > 0" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                             xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                    stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>

                                        <span x-show="uploadingProgress > 0">@lang('messages.t_uploading')</span>
                                        <span x-show="uploadingProgress === 0">@lang('messages.t_submit')</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    @endif

                </div>
            </div>
        </div>
    </div>

    {{-- Resubmit Confirmation Modal (same as projects) --}}
    <div x-show="showResubmitModal"
         x-transition:enter="ease-out duration-300"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         x-transition:leave="ease-in duration-200"
         x-transition:leave-start="opacity-100"
         x-transition:leave-end="opacity-0"
         class="fixed inset-0 z-50 overflow-y-auto"
         style="display: none;">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div x-transition:enter="ease-out duration-300"
                 x-transition:enter-start="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                 x-transition:enter-end="opacity-100 translate-y-0 sm:scale-100"
                 x-transition:leave="ease-in duration-200"
                 x-transition:leave-start="opacity-100 translate-y-0 sm:scale-100"
                 x-transition:leave-end="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                 class="inline-block align-bottom bg-white dark:bg-zinc-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">

                <div class="bg-white dark:bg-zinc-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                            <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                                @lang('messages.t_resubmit_work_again')
                            </h3>
                            <div class="mt-2">
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    @lang('messages.t_are_u_sure_u_want_to_resubmit_work_again')
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 dark:bg-zinc-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button x-on:click="$wire.resubmit(); showResubmitModal = false"
                            type="button"
                            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                        @lang('messages.t_yes_resubmit')
                    </button>
                    <button x-on:click="showResubmitModal = false"
                            type="button"
                            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-zinc-600 shadow-sm px-4 py-2 bg-white dark:bg-zinc-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                        @lang('messages.t_cancel')
                    </button>
                </div>
            </div>
        </div>
    </div>

    {{-- Scripts: upload + validation aligned with projects --}}
    <script>
        window.TBhqVNUmCYEnOEj = function () {
            return {
                uploadingProgress: 0,
                showResubmitModal: false,

                uploadStart() {
                    this.uploadingProgress = 0;
                },

                uploadFinish() {
                    this.uploadingProgress = 100;
                    setTimeout(() => {
                        this.uploadingProgress = 0;
                    }, 2000);
                },

                uploadError(event) {
                    this.uploadingProgress = 0;

                    // Dispatch custom event to fileUpload component to handle the error
                    window.dispatchEvent(new CustomEvent('livewire-upload-error-detail', {
                        detail: { event: event }
                    }));
                }
            }
        }

        function fileUpload() {
            return {
                selectedFile: null,
                fileName: '',
                fileSize: '',
                fileType: '',
                filePreview: '',
                isImage: false,
                isDragOver: false,
                errorMessage: '',
                allowedExtensions: ['zip', 'rar', '7z'],
                maxFileSizeBytes: {{ 10 * 1024 * 1024 }},
                maxSizeMessage: "{{ __('messages.t_validator_max_size', ['max' => human_filesize(10 * 1024 * 1024)]) }}",

                init() {
                    // Sync when Livewire clears file
                    this.$watch('$wire.work', (value) => {
                        if (!value && this.selectedFile) {
                            this.clearFile();
                        }
                    });

                    // Listen for Livewire upload errors
                    window.addEventListener('livewire-upload-error-detail', (event) => {
                        const fileInput = document.getElementById('work-upload') || document.getElementById('work-upload-replace');
                        if (fileInput && fileInput.files && fileInput.files[0]) {
                            const file = fileInput.files[0];

                            if (file.size > this.maxFileSizeBytes) {
                                this.errorMessage = this.maxSizeMessage;
                                // Clear invalid file and reset inputs
                                this.$wire.work = null;
                                this.clearFile();
                                this.resetFileInputs();
                                return;
                            }

                            const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
                            if (!this.allowedExtensions.includes(extension)) {
                                this.errorMessage = "{{ __('messages.t_validator_mimes') }}";
                                // Clear invalid file and reset inputs
                                this.$wire.work = null;
                                this.clearFile();
                                this.resetFileInputs();
                                return;
                            }
                        }

                        // Generic upload error: clear file to allow re-try cleanly
                        this.errorMessage = "{{ __('messages.t_pls_check_ur_inputs_and_try_again') }}";
                        this.$wire.work = null;
                        this.clearFile();
                        this.resetFileInputs();
                    });
                },

                handleFileSelect(event) {
                    const file = event.target.files[0];
                    if (file && !this.processFile(file)) {
                        event.target.value = '';
                        this.$wire.work = null;
                    }
                },

                handleDrop(event) {
                    this.isDragOver = false;
                    const files = event.dataTransfer.files;
                    if (files.length > 0) {
                        const file = files[0];
                        const isValid = this.processFile(file);
                        if (isValid) {
                            const input = document.getElementById('work-upload');
                            const dt = new DataTransfer();
                            dt.items.add(file);
                            input.files = dt.files;
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        } else {
                            this.resetFileInputs();
                        }
                    }
                },

                processFile(file) {
                    this.errorMessage = '';

                    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
                    if (!this.allowedExtensions.includes(extension)) {
                        this.errorMessage = "{{ __('messages.t_validator_mimes') }}";
                        this.$wire.work = null;
                        this.clearFile();
                        return false;
                    }

                    if (file.size > this.maxFileSizeBytes) {
                        this.errorMessage = this.maxSizeMessage;
                        this.$wire.work = null;
                        this.clearFile();
                        return false;
                    }

                    const mimeType = file.type || '';
                    this.selectedFile = file;
                    this.fileName = file.name;
                    this.fileSize = this.formatFileSize(file.size);
                    this.fileType = mimeType ? mimeType : extension;
                    this.isImage = mimeType.startsWith('image/');

                    if (this.isImage) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            this.filePreview = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    } else {
                        this.filePreview = '';
                    }
                    return true;
                },

                removeFile() {
                    this.clearFile();
                    this.$wire.work = null;
                    this.errorMessage = '';
                    this.resetFileInputs();
                    this.$wire.$refresh();
                },

                clearFile() {
                    this.selectedFile = null;
                    this.fileName = '';
                    this.fileSize = '';
                    this.fileType = '';
                    this.filePreview = '';
                    this.isImage = false;
                },

                resetFileInputs() {
                    const inputs = ['work-upload', 'work-upload-replace'];
                    inputs.forEach(id => {
                        const input = document.getElementById(id);
                        if (input) {
                            input.value = '';
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                },

                formatFileSize(bytes) {
                    if (bytes === 0) return '0 Bytes';
                    const k = 1024;
                    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                }
            }
        }
    </script>
</div>
