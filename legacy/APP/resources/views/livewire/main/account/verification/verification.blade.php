<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24" x-data="window.nYpPIEgUauhEVLt">

    {{-- Please wait dialog --}}
    <div class="fixed top-0 left-0 z-50 bg-black dark:bg-gray-400/50 w-full h-full opacity-80" wire:loading>
        <div class="w-full h-full flex items-center justify-center">
            <div role="status">
                <svg aria-hidden="true" class="mx-auto w-12 h-12 text-gray-500 dark:text-gray-400 animate-spin fill-white dark:fill-primary-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                </svg>
                <span class="text-xs font-medium tracking-wider text-white dark:text-gray-500 mt-4 block">{{ __('messages.t_please_wait_dots') }}</span>
            </div>
        </div>
    </div>

    <div class="px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div class="divide-y divide-gray-200 dark:divide-zinc-700 lg:grid lg:grid-cols-12 lg:divide-y-0 lg:divide-x rtl:divide-x-reverse">

                {{-- Sidebar --}}
                <aside class="lg:col-span-3 py-6 hidden lg:block">
                    <livewire:main.account.sidebar-component />
                </aside>

                {{-- Section content --}}
                <div class="divide-y divide-gray-200 dark:divide-zinc-700 lg:col-span-9">

                    {{-- Form --}}
                    <div class="py-6 px-4 sm:p-6 lg:pb-8 h-[calc(100%-80px)]">

                        {{-- Section header --}}
                        <div class="mb-14">
                            <h2 class="text-base leading-6 font-bold text-gray-900 dark:text-gray-100">{{ __('messages.t_verification_center') }}</h2>
                            <p class="mt-1 text-sm text-gray-500 dark:text-gray-300">{{ __('messages.t_verification_center_subtitle') }}</p>
                        </div>

                        {{-- Check if user has a verification before or not --}}
                        @if ($verification)

                            {{-- Verification status --}}
                            <div class="py-5">
                                <dl class="grid grid-cols-1 gap-y-8 sm:grid-cols-2">
                                    <div class="sm:col-span-1">
                                        <dt class="text-sm font-medium text-gray-500">{{ __('messages.t_verification_status') }}</dt>
                                        @if ($verification->status === 'pending')
                                            <dd class="mt-1 text-xs font-semibold text-amber-600">{{ __('messages.t_verification_pending') }}</dd>
                                        @elseif ($verification->status === 'verified')
                                            <dd class="mt-1 text-xs font-semibold text-green-400">{{ __('messages.t_account_verified') }}</dd>
                                        @elseif ($verification->status === 'declined')
                                            <dd class="mt-1 text-xs font-semibold text-red-400">{{ __('messages.t_verification_declined') }}</dd>
                                        @endif
                                    </div>
                                    <div class="sm:col-span-1">

                                        {{-- Verified --}}
                                        @if ($verification->status === 'verified')
                                            <dt class="text-sm font-medium text-gray-500">{{ __('messages.t_verified_at') }}</dt>
                                            <dd class="mt-1 text-xs text-gray-500">{{ format_date($verification->verified_at, config('carbon-formats.d_m_Y_H_i')) }}</dd>
                                        @endif

                                        {{-- Pending --}}
                                        @if ($verification->status === 'pending')
                                            <dt class="text-sm font-medium text-gray-500">{{ __('messages.t_verification_date') }}</dt>
                                            <dd class="mt-1 text-xs text-gray-500">{{ format_date($verification->created_at, config('carbon-formats.d_m_Y_H_i')) }}</dd>
                                        @endif

                                        {{-- Declined --}}
                                        @if ($verification->status === 'declined')
                                            <dt class="text-sm font-medium text-gray-500">{{ __('messages.t_declined_at') }}</dt>
                                            <dd class="mt-1 text-xs text-gray-500">{{ format_date($verification->declined_at, config('carbon-formats.F_j,_Y_h_:_i_A')) }}</dd>
                                        @endif

                                    </div>
                                </dl>
                            </div>

                            {{-- Verification files --}}
                            <div class="sm:col-span-2 mt-6">
                                <dt class="text-xs font-medium text-gray-500">{{ __('messages.t_verification_documents') }}</dt>
                                <dd class="mt-1 text-sm text-gray-900">
                                    <ul role="list" class="border border-gray-200 rounded-md divide-y divide-gray-200">

                                        {{-- Selfie photo --}}
                                        <li class="ltr:pl-3 rtl:pr-3 ltr:pr-4 rtl:pl-4 py-3 flex items-center justify-between text-sm">
                                            <div class="w-0 flex-1 flex items-center">
                                                <svg class="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
                                                </svg>
                                                <span class="ltr:ml-2 rtl:mr-2 flex-1 w-0 truncate text-xs"> <span class="font-semibold">{{ __('messages.t_selfie_photo') }}</span> - {{ format_bytes($verification->selfie->file_size) }} </span>
                                            </div>
                                            <div class="ltr:ml-4 rtl:mr-4 flex-shrink-0">
                                                <a href="{{ url( 'uploads/verifications/' . $verification->uid . '/selfie/' . $verification->file_selfie ) }}" target="_blank" class="font-medium text-primary-600 hover:text-primary-600 text-xs"> {{ __('messages.t_download') }} </a>
                                            </div>
                                        </li>

                                        {{-- Frontside --}}
                                        <li class="ltr:pl-3 rtl:pr-3 ltr:pr-4 rtl:pl-4 py-3 flex items-center justify-between text-sm">
                                            <div class="w-0 flex-1 flex items-center">
                                                <svg class="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
                                                </svg>
                                                <span class="ltr:ml-2 rtl:mr-2 flex-1 w-0 truncate text-xs">
                                                    @if ($verification->document_type === 'id')
                                                        <span class="font-semibold">{{ __('messages.t_government_issued_id_frontside') }}</span>
                                                    @elseif ($verification->document_type === 'driver_license')
                                                        <span class="font-semibold">{{ __('messages.t_driver_license_frontside') }}</span>
                                                    @elseif ($verification->document_type === 'passport')
                                                        <span class="font-semibold">{{ __('messages.t_passport') }}</span>
                                                    @endif
                                                    - {{ format_bytes($verification->frontside->file_size) }} </span>
                                            </div>
                                            <div class="ltr:ml-4 rtl:mr-4 flex-shrink-0">
                                                <a href="{{ url( 'uploads/verifications/' . $verification->uid . '/front/' . $verification->file_front_side ) }}" target="_blank" class="font-medium text-primary-600 hover:text-primary-600 text-xs"> {{ __('messages.t_download') }} </a>
                                            </div>
                                        </li>

                                        {{-- Backside --}}
                                        @if ($verification->document_type !== 'passport')
                                            <li class="ltr:pl-3 rtl:pr-3 ltr:pr-4 rtl:pl-4 py-3 flex items-center justify-between text-sm">
                                                <div class="w-0 flex-1 flex items-center">
                                                    <svg class="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
                                                    </svg>
                                                    <span class="ltr:ml-2 rtl:mr-2 flex-1 w-0 truncate text-xs">
                                                        @if ($verification->document_type === 'id')
                                                            <span class="font-semibold">{{ __('messages.t_government_issued_id_backside') }}</span>
                                                        @elseif ($verification->document_type === 'driver_license')
                                                            <span class="font-semibold">{{ __('messages.t_driver_license_backside') }}</span>
                                                        @endif
                                                        - {{ format_bytes($verification->backside->file_size) }} </span>
                                                </div>
                                                <div class="ltr:ml-4 rtl:mr-4 flex-shrink-0">
                                                    <a href="{{ url( 'uploads/verifications/' . $verification->uid . '/back/' . $verification->file_back_side ) }}" target="_blank" class="font-medium text-primary-600 hover:text-primary-600 text-xs"> {{ __('messages.t_download') }} </a>
                                                </div>
                                            </li>
                                        @endif

                                    </ul>
                                </dd>
                            </div>

                        @else

                            {{-- Choose verification document type --}}
                            @if ($currentStep === 1)

                                <fieldset>
                                    <legend class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">{{ __('messages.t_choose_document_type') }}</legend>

                                    <div class="mt-1 bg-white dark:bg-zinc-700 rounded-md shadow-sm -space-y-px">

                                        {{-- Identify card --}}
                                        <label class="rounded-tl-md rounded-tr-md relative border-2 dark:border-zinc-600 p-4 flex cursor-pointer focus:outline-none ">
                                            <input type="radio" name="document_type" value="id" wire:model.defer="document_type" class="h-4 w-4 cursor-pointer text-primary-600 border-gray-300 dark:border-zinc-600 focus:ring-primary-600" aria-labelledby="document_type_id">
                                            <div class="ltr:ml-3 rtl:mr-3 flex flex-col">
                                                <span id="document_type_id" class="block text-xs font-medium text-gray-900 dark:text-gray-300">
                                                    {{ __('messages.t_government_issued_id') }}
                                                </span>
                                            </div>
                                        </label>

                                        {{-- Driver license --}}
                                        <label class="relative border-2 dark:border-zinc-600 border-t-0 p-4 flex cursor-pointer focus:outline-none ">
                                            <input type="radio" name="document_type" value="driver_license" wire:model.defer="document_type" class="h-4 w-4 cursor-pointer text-primary-600 border-gray-300 dark:border-zinc-600 focus:ring-primary-600" aria-labelledby="document_type_driver_license">
                                            <div class="ltr:ml-3 rtl:mr-3 flex flex-col">
                                                <span id="document_type_driver_license" class="block text-xs font-medium text-gray-900 dark:text-gray-300">
                                                    {{ __('messages.t_driver_license') }}
                                                </span>
                                            </div>
                                        </label>

                                        {{-- Passport --}}
                                        <label class="rounded-bl-md rounded-br-md relative border-2 dark:border-zinc-600 border-t-0 p-4 flex cursor-pointer focus:outline-none ">
                                            <input type="radio" name="document_type" value="passport" wire:model.defer="document_type" class="h-4 w-4 cursor-pointer text-primary-600 border-gray-300 dark:border-zinc-600 focus:ring-primary-600" aria-labelledby="document_type_passport">
                                            <div class="ltr:ml-3 rtl:mr-3 flex flex-col">
                                                <span id="document_type_passport" class="block text-xs font-medium text-gray-900 dark:text-gray-300">
                                                    {{ __('messages.t_passport') }}
                                                </span>
                                            </div>
                                        </label>

                                    </div>
                                </fieldset>

                            {{-- Upload files --}}
                            @elseif ($currentStep === 2)

                                {{-- Upload ID files --}}
                                @if ($document_type === 'id')
                                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                        {{-- Front side --}}
                                        <div>
                                            <div class="flex justify-center items-center w-full">
                                                <label for="doc_id_frontside" class="flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-zinc-700 hover:bg-gray-100 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-600">
                                                        <div class="flex flex-col justify-center items-center pt-5 pb-6" x-show="!preview.frontImage">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="mb-3 w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                            </svg>
                                                            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">{{ __('messages.t_upload_doc_front_side') }}</span></p>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                                                {{ __('messages.t_verification_allowed_mimes_size') }}
                                                            </p>
                                                        </div>

                                                        {{-- Image preview --}}
                                                        <div x-show="preview.frontImage" class="relative w-full h-full flex items-center justify-center p-2">
                                                            <img :src="preview.frontImage" class="max-w-full max-h-full object-contain rounded" alt="Front side preview">
                                                            <button @click="deleteFrontImage()" type="button" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors duration-200">
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                    <input id="doc_id_frontside" type="file" accept="image/jpg,image/jpeg,image/png"  class="hidden" @change="setFrontSide" wire:model="doc_id.front">
                                                </label>
                                            </div>
                                            @error('front')
                                                <div class="text-xs font-medium text-red-500 pt-1">
                                                    {{ $errors->first('front') }}
                                                </div>
                                            @enderror
                                            <div x-show="errors.frontError" class="text-xs font-medium text-red-500 pt-1" x-text="errors.frontError"></div>
                                        </div>

                                        {{-- Back side --}}
                                        <div>
                                            <div class="flex justify-center items-center w-full">
                                                <label for="doc_id_backside" class="flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-zinc-700 hover:bg-gray-100 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-600">
                                                        <div class="flex flex-col justify-center items-center pt-5 pb-6" x-show="!preview.backImage">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="mb-3 w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">{{ __('messages.t_upload_doc_back_side') }}</span></p>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                                                {{ __('messages.t_verification_allowed_mimes_size') }}
                                                            </p>
                                                        </div>

                                                        {{-- Image preview --}}
                                                        <div x-show="preview.backImage" class="relative w-full h-full flex items-center justify-center p-2">
                                                            <img :src="preview.backImage" class="max-w-full max-h-full object-contain rounded" alt="Back side preview">
                                                            <button @click="deleteBackImage()" type="button" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors duration-200">
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                    <input id="doc_id_backside" type="file" accept="image/jpg,image/jpeg,image/png" class="hidden" @change="setBackSide" wire:model="doc_id.back">
                                                </label>
                                            </div>
                                            @error('back')
                                                <div class="text-xs font-medium text-red-500 pt-1">
                                                    {{ $errors->first('back') }}
                                                </div>
                                            @enderror
                                            <div x-show="errors.backError" class="text-xs font-medium text-red-500 pt-1" x-text="errors.backError"></div>
                                        </div>

                                    </div>
                                @elseif ($document_type === 'driver_license')
                                    <div class="grid grid-cols-2 gap-4">

                                        {{-- Front side --}}
                                        <div>
                                            <div class="flex justify-center items-center w-full">
                                                <label for="doc_driver_license_frontside" class="flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-zinc-700 hover:bg-gray-100 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-600">
                                                        <div class="flex flex-col justify-center items-center pt-5 pb-6" x-show="!preview.frontImage">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="mb-3 w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                            </svg>
                                                            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">{{ __('messages.t_upload_doc_front_side') }}</span></p>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                                                {{ __('messages.t_verification_allowed_mimes_size') }}
                                                            </p>
                                                        </div>

                                                        {{-- Image preview --}}
                                                        <div x-show="preview.frontImage" class="relative w-full h-full flex items-center justify-center p-2">
                                                            <img :src="preview.frontImage" class="max-w-full max-h-full object-contain rounded" alt="Front side preview">
                                                            <button @click="deleteFrontImage()" type="button" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors duration-200">
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                    <input id="doc_driver_license_frontside" type="file" accept="image/jpg,image/jpeg,image/png"  class="hidden" @change="setFrontSide" wire:model="doc_driver_license.front">
                                                </label>
                                            </div>
                                            @error('front')
                                                <div class="text-xs font-medium text-red-500 pt-1">
                                                    {{ $errors->first('front') }}
                                                </div>
                                            @enderror
                                            <div x-show="errors.frontError" class="text-xs font-medium text-red-500 pt-1" x-text="errors.frontError"></div>
                                        </div>

                                        {{-- Back side --}}
                                        <div>
                                            <div class="flex justify-center items-center w-full">
                                                <label for="doc_driver_license_backside" class="flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-zinc-700 hover:bg-gray-100 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-600">
                                                        <div class="flex flex-col justify-center items-center pt-5 pb-6" x-show="!preview.backImage">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="mb-3 w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">{{ __('messages.t_upload_doc_back_side') }}</span></p>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                                                {{ __('messages.t_verification_allowed_mimes_size') }}
                                                            </p>
                                                        </div>

                                                        {{-- Image preview --}}
                                                        <div x-show="preview.backImage" class="relative w-full h-full flex items-center justify-center p-2">
                                                            <img :src="preview.backImage" class="max-w-full max-h-full object-contain rounded" alt="Back side preview">
                                                            <button @click="deleteBackImage()" type="button" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors duration-200">
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                    <input id="doc_driver_license_backside" type="file" accept="image/jpg,image/jpeg,image/png" class="hidden" @change="setBackSide" wire:model="doc_driver_license.back">
                                                </label>
                                            </div>
                                            @error('back')
                                                <div class="text-xs font-medium text-red-500 pt-1">
                                                    {{ $errors->first('back') }}
                                                </div>
                                            @enderror
                                            <div x-show="errors.backError" class="text-xs font-medium text-red-500 pt-1" x-text="errors.backError"></div>
                                        </div>

                                    </div>
                                @elseif ($document_type === 'passport')
                                    <div class="grid grid-cols-1 gap-4">

                                        {{-- Front side --}}
                                        <div>
                                            <div class="flex justify-center items-center w-full">
                                                <label for="doc_passport_frontside" class="flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-zinc-700 hover:bg-gray-100 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-600">
                                                        <div class="flex flex-col justify-center items-center pt-5 pb-6" x-show="!preview.frontImage">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="mb-3 w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                            </svg>
                                                            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">{{ __('messages.t_upload_doc_front_side') }}</span></p>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                                                {{ __('messages.t_verification_allowed_mimes_size') }}
                                                            </p>
                                                        </div>

                                                        {{-- Image preview --}}
                                                        <div x-show="preview.frontImage" class="relative w-full h-full flex items-center justify-center p-2">
                                                            <img :src="preview.frontImage" class="max-w-full max-h-full object-contain rounded" alt="Passport preview">
                                                            <button @click="deleteFrontImage()" type="button" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors duration-200">
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                    <input id="doc_passport_frontside" type="file" accept="image/jpg,image/jpeg,image/png" class="hidden" @change="setFrontSide" wire:model="doc_passport.front">
                                                </label>
                                            </div>
                                            @error('front')
                                                <div class="text-xs font-medium text-red-500 pt-1">
                                                    {{ $errors->first('front') }}
                                                </div>
                                            @enderror
                                            <div x-show="errors.frontError" class="text-xs font-medium text-red-500 pt-1" x-text="errors.frontError"></div>
                                        </div>

                                    </div>
                                @endif

                            {{-- Selfie --}}
                            @elseif ($currentStep === 3)

                                {{-- Message --}}
                                <div class="bg-blue-50 ltr:border-l-4 rtl:border-r-4 border-blue-400 p-4">
                                    <div class="flex">
                                    <div class="flex-shrink-0">
                                        <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div class="ltr:ml-3 rtl:mr-3">
                                        <p class="text-sm text-blue-700">{{ __('messages.t_upload_selfie_with_id_msg') }}</p>
                                    </div>
                                    </div>
                                </div>

                                {{-- Selfie Upload --}}
                                <div class="flex justify-center items-center w-full mt-8">
                                    <label for="selfie_upload" class="flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-zinc-700 hover:bg-gray-100 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-600">
                                            <div class="flex flex-col justify-center items-center pt-5 pb-6" x-show="!preview.selfieImage">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="mb-3 w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <p class="mb-2 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">{{ __('messages.t_upload_selfie_with_id') }}</span></p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                                    {{ __('messages.t_verification_allowed_mimes_size') }}
                                                </p>
                                            </div>

                                            {{-- Image preview --}}
                                            <div x-show="preview.selfieImage" class="relative w-full h-full flex items-center justify-center p-2">
                                                <img :src="preview.selfieImage" class="max-w-full max-h-full object-contain rounded" alt="Selfie preview">
                                                <button @click="deleteSelfieImage()" type="button" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors duration-200">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                    </svg>
                                                </button>
                                            </div>

                                        <input id="selfie_upload" type="file" accept="image/jpg,image/jpeg,image/png" class="hidden" @change="setSelfie" wire:model="selfie">
                                    </label>
                                </div>
                                @error('selfie')
                                    <div class="text-xs font-medium text-red-500 pt-1">
                                        {{ $errors->first('selfie') }}
                                    </div>
                                @enderror
                                <div x-show="errors.selfieError" class="text-xs font-medium text-red-500 pt-1" x-text="errors.selfieError"></div>

                            @endif



                        @endif

                    </div>

                    {{-- Actions --}}
                    @if (!$verification)
                        <div class="bg-gray-50 dark:bg-zinc-700 h-20 flex justify-between">

                            {{-- Back --}}
                            <div>
                                @if ($currentStep !== 1)
                                    <div class="py-4 px-4 flex justify-end sm:px-6">
                                        <x-forms.button
                                            action="back"
                                            text="{{ __('messages.t_back') }}"
                                            block="0"
                                            active="text-gray-900 bg-gray-100 hover:bg-gray-200" />
                                    </div>
                                @endif
                            </div>

                            {{-- Next --}}
                            <div>
                                {{-- Set document type --}}
                                @if ($currentStep === 1)
                                    <div class="py-4 px-4 flex justify-end sm:px-6">
                                        <div @click="clearErrors()">
                                            <x-forms.button action="setDocumentType" text="{{ __('messages.t_next_step') }}" block="0" />
                                        </div>
                                    </div>
                                @endif

                                {{-- Set document files --}}
                                @if ($currentStep === 2)
                                    <div class="py-4 px-4 flex justify-end sm:px-6">
                                        <div @click="clearErrors()">
                                            <x-forms.button action="setDocumentFiles" text="{{ __('messages.t_next_step') }}" block="0" />
                                        </div>
                                    </div>
                                @endif

                                {{-- Finish --}}
                                @if ($currentStep === 3)
                                    <div class="py-4 px-4 flex justify-end sm:px-6">
                                        <div @click="clearErrors()">
                                            <x-forms.button action="finish" text="{{ __('messages.t_finish') }}" block="0" />
                                        </div>
                                    </div>
                                @endif
                            </div>

                        </div>
                    @elseif ($verification && $verification->status === 'declined')
                        <div class="py-4 px-4 flex justify-end sm:px-6 bg-transparent">
                            <x-forms.button action="sendFilesAgain" text="{{ __('messages.t_send_files_again') }}" block="0" />
                        </div>
                    @endif

                </div>

            </div>
        </div>
    </div>
</div>

{{-- Include in Header --}}
@push('styles')
@endpush

{{-- Include in Footer --}}
@push('scripts')

    {{-- AlpineJS --}}
    <script>
        function nYpPIEgUauhEVLt() {
            return {

                counter: 0,

                preview: {
                    front: null,
                    back : null,
                    selfie: null,
                    frontImage: null,
                    backImage: null,
                    selfieImage: null
                },

                errors: {
                    frontError: '',
                    backError: '',
                    selfieError: ''
                },

                allowedExtensions: ['jpg', 'jpeg', 'png'],

                init() {
                    this.$wire.on('clearFilePreview', () => {
                        this.clearPreview();
                    });
                },

                clearPreview() {
                    // Reset all preview states
                    this.preview.front = null;
                    this.preview.back = null;
                    this.preview.selfie = null;
                    this.preview.frontImage = null;
                    this.preview.backImage = null;
                    this.preview.selfieImage = null;

                    // Clear file inputs
                    const fileInputs = document.querySelectorAll('input[type="file"]');
                    fileInputs.forEach(input => {
                        input.value = '';
                    });
                },

                validateAndSetFile(e, type) {
                    const source = e.target.files[0];
                    if (!source) return;

                    this.errors[`${type}Error`] = '';

                    const fileName = source.name;
                    const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();

                    if (!this.allowedExtensions.includes(extension)) {
                        this.errors[`${type}Error`] = "{{ __('messages.t_validator_image_mimes') }}";
                        e.target.value = '';
                        return;
                    }

                    this.preview[type] = source.name;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.preview[`${type}Image`] = event.target.result;
                    };
                    reader.readAsDataURL(source);
                },

                setFrontSide(e) {
                    this.validateAndSetFile(e, 'front');
                },

                setBackSide(e) {
                    this.validateAndSetFile(e, 'back');
                },

                setSelfie(e) {
                    this.validateAndSetFile(e, 'selfie');
                },

                deleteFrontImage() {
                    this.preview.front = null;
                    this.preview.frontImage = null;
                    // Clear the file input
                    const frontInputs = document.querySelectorAll('#doc_id_frontside, #doc_driver_license_frontside, #doc_passport_frontside');
                    frontInputs.forEach(input => {
                        if (input) input.value = '';
                    });
                    // Clear Livewire models
                    this.$wire.set('doc_id.front', null);
                    this.$wire.set('doc_driver_license.front', null);
                    this.$wire.set('doc_passport.front', null);
                },

                deleteBackImage() {
                    this.preview.back = null;
                    this.preview.backImage = null;
                    // Clear the file input
                    const backInputs = document.querySelectorAll('#doc_id_backside, #doc_driver_license_backside');
                    backInputs.forEach(input => {
                        if (input) input.value = '';
                    });
                    // Clear Livewire models
                    this.$wire.set('doc_id.back', null);
                    this.$wire.set('doc_driver_license.back', null);
                },

                deleteSelfieImage() {
                    this.preview.selfie = null;
                    this.preview.selfieImage = null;
                    // Clear the file input
                    const selfieInput = document.querySelector('#selfie_upload');
                    if (selfieInput) selfieInput.value = '';
                    // Clear Livewire model
                    this.$wire.set('selfie', null);
                },

                clearErrors() {
                    this.errors.frontError = '';
                    this.errors.backError = '';
                    this.errors.selfieError = '';
                }

            }
        }
        window.nYpPIEgUauhEVLt = nYpPIEgUauhEVLt()
    </script>

@endpush
