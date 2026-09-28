<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] lg:pb-24">
    <div class="w-full sm:mx-auto sm:max-w-2xl">

        {{-- Loading --}}
        <x-forms.loading/>

        {{-- English Language Notice --}}
        @if(in_array('en', supported_languages()->pluck('language_code')->toArray()))
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 dark:bg-amber-900/20 dark:border-amber-700/30">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {{ __('messages.t_language_notice') }}
                        </h3>
                        <div class="mt-2 text-sm text-amber-700 dark:text-amber-300">
                            <p class="leading-5">
                                {!! __('messages.t_english_fields_optional_notice') !!}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        @endif

        {{-- Overview --}}
        <div class="card px-4 py-10 sm:p-10 md:mx-0 mb-6">
            {{-- Section head --}}
            <div class="flex-col md:flex-row md:justify-between flex md:items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
                {{-- Title --}}
                <div class="flex items-center gap-x-4">
                    <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                        <i class="ph-duotone ph-briefcase"></i>
                    </div>
                    <div class="block">
                        <h3 class="text-[0.9375rem] font-bold text-zinc-700 dark:text-white pb-0.5 tracking-wide">
                            @lang('messages.t_post_new_project')
                        </h3>
                        <p class="text-xs+ font-medium text-slate-400 dark:text-zinc-400 tracking-wide">
                            @lang('messages.t_post_new_project_subtitle')
                        </p>
                    </div>
                </div>
                {{-- Actions --}}
                <div class="md:ms-auto flex items-center gap-2"></div>
            </div>

            {{-- Section body --}}
            <div class="w-full">
                <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">
                    {{-- Title --}}
                    @foreach (supported_languages() as $lang)
                        <div class="col-span-12" wire:key="create-service-description-{{$lang->language_code}}">
                            <x-forms.text-input :required="$lang->language_code !== 'en'"
                                                label="title {{$lang->language_code}}"
                                                model="title.{{$lang->language_code}}"
                                                :label="trans('messages.t_project_title') . ' ' . trans('messages.' .$lang->language_code)"
                            />
                        </div>
                    @endforeach

                    {{-- Description --}}
                    @foreach (supported_languages() as $lang)
                        <div class="col-span-12">
                            <x-forms.textarea :required="$lang->language_code !== 'en'"
                                              :label="trans('messages.t_project_description') . ' ' . trans('messages.' .$lang->language_code)"
                                              placeholder="{{ __('messages.t_enter_description') }}"
                                              model="description.{{$lang->language_code}}"
                                              :rows="12"
                                              icon="text"
                                              :hint="__('messages.t_post_project_description_hint')"/>
                        </div>
                    @endforeach

                    {{-- Parent category --}}
                    <div class="col-span-12" wire:key="create-service-categories">
                        <x-forms.select-simple required live
                                               model="category"
                                               :label="__('messages.t_category')"
                                               :placeholder="__('messages.t_choose_category')">
                            <x-slot:options>
                                @foreach ($categories as $c)
                                    <option value="{{ $c->id }}">{{ $c->name }}</option>
                                @endforeach
                            </x-slot:options>
                        </x-forms.select-simple>
                    </div>

                    {{-- Thumbnail --}}
                    <div class="col-span-12 mb-10">
                        {{-- Container --}}
                        <div class="w-full" wire:ignore>
                            {{-- Label --}}
                            <div class="block text-xs font-bold tracking-wide whitespace-nowrap overflow-hidden truncate text-zinc-500 dark:text-white mb-2.5">
                                {{-- Label text --}}
                                @lang('messages.t_thumbnail')
                                {{-- Required --}}
                                <span class="font-bold text-red-400">*</span>
                            </div>
                            {{-- Uploader --}}
                            <x-forms.uploader
                                    model="thumbnail"
                                    id="uploader_thumbnail"
                                    :extensions="['jpg', 'jpeg', 'png']"
                                    accept="image/jpg, image/jpeg, image/png"
                                    size="{{ settings('publish')->max_image_size }}"
                                    max="1"/>
                        </div>
                        {{-- Errors --}}
                        @error('thumbnail')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('thumbnail') }}</p>
                        @enderror
                    </div>
                </div>
            </div>
        </div>

        {{-- Budget --}}
        <div class="card px-4 py-10 sm:p-10 md:mx-0 mb-6">
            {{-- Section head --}}
            <div class="flex-col md:flex-row md:justify-between flex md:items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
                {{-- Title --}}
                <div class="flex items-center gap-x-4">
                    <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                        <i class="ph-duotone ph-currency-dollar"></i>
                    </div>
                    <div class="block">
                        <h3 class="text-[0.9375rem] font-bold text-zinc-700 dark:text-white pb-0.5 tracking-wide">
                            @lang('messages.t_budget')
                        </h3>
                    </div>
                </div>
                {{-- Actions --}}
                <div class="md:ms-auto flex items-center gap-2"></div>
            </div>

            {{-- Section body --}}
            <div class="w-full">
                <div class="grid grid-cols-12 gap-y-8 gap-x-5">
                    {{-- Min price --}}
                    <div class="col-span-12 md:col-span-6">
                        <x-forms.text-input required
                                            :label="__('messages.t_min_price')"
                                            placeholder="0.00"
                                            model="min_price"
                                            suffix="{{ $currency_symbol }}"/>
                    </div>

                    {{-- Max price --}}
                    <div class="col-span-12 md:col-span-6">
                        <x-forms.text-input required
                                            :label="__('messages.t_max_price')"
                                            placeholder="0.00"
                                            model="max_price"
                                            suffix="{{ $currency_symbol }}"/>
                    </div>
                </div>
            </div>
        </div>

        {{-- Promotion --}}
        @if (settings('projects')->is_premium_posting)
            <div class="card px-4 py-10 sm:p-10 md:mx-0 mb-6">
                {{-- Section head --}}
                <div class="flex-col md:flex-row md:justify-between flex md:items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
                    {{-- Title --}}
                    <div class="flex items-center gap-x-4">
                        <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                            <i class="ph-duotone ph-megaphone-simple"></i>
                        </div>
                        <div class="block">
                            <h3 class="text-[0.9375rem] font-bold text-zinc-700 dark:text-white pb-0.5 tracking-wide">
                                @lang('messages.t_promotion')
                            </h3>
                            @if (settings('projects')->is_free_posting)
                                <p class="text-xs+ font-medium text-slate-400 dark:text-zinc-400 tracking-wide">
                                    @lang('messages.t_make_ur_project_premium_optional')
                                </p>
                            @else
                                <p class="text-xs+ font-medium text-slate-400 dark:text-zinc-400 tracking-wide">
                                    @lang('messages.t_make_ur_project_premium')
                                </p>
                            @endif
                        </div>
                    </div>
                    {{-- Actions --}}
                    <div class="md:ms-auto flex items-center gap-2"></div>
                </div>

                {{-- Section body --}}
                <div class="w-full">
                    {{-- Plans --}}
                    <div class="grid grid-cols-1 gap-y-6 mb-7">
                        @foreach ($plans as $plan)
                            {{-- Check if plan selected --}}
                            @php
                                $is_plan_selected = in_array($plan->id, $selected_plans);
                            @endphp

                            {{-- Plan --}}
                            <div class="{{ $is_plan_selected ? 'border-primary-600 ring-1 ring-primary-600' : '' }} mb-2 rounded-lg px-4 py-4 border shadow-sm bg-white dark:bg-zinc-700 dark:border-transparent"
                                 wire:key="post-project-plans-{{ $plan->id }}">
                                <div class="card-body">
                                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div class="flex items-center gap-3">
                                            <div>
                                                {{-- Plan details --}}
                                                <div class="flex items-center mb-3 space-x-3 rtl:space-x-reverse">
                                                    {{-- Badge --}}
                                                    <span class="inline-flex items-center text-xs uppercase tracking-wider font-semibold px-3 py-1 rounded-full"
                                                          style="color:{{ $plan->text_color }};background-color:{{ $plan->bg_color }}">
                                                        <span>{{ $plan->title }}</span>
                                                    </span>

                                                    {{-- Price --}}
                                                    <div class="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                                                        {{ money($plan->price, settings('currency')->code, true) }}
                                                    </div>

                                                    {{-- Days --}}
                                                    @if ($plan->days)
                                                        <div class="text-xs font-normal text-gray-400 lowercase">
                                                            {{ $plan->days }} {{ $plan->days > 1 ? __('messages.t_days') : __('messages.t_day') }}
                                                        </div>
                                                    @endif
                                                </div>

                                                <!-- Description -->
                                                <div class="text-xs+ font-normal leading-6 text-gray-500 dark:text-zinc-200 tracking-wide">
                                                    {{ $plan->description }}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex">
                                            {{-- Select this plan --}}
                                            <button class="flex items-center border h-9 text-xs font-medium px-4 rounded-sm whitespace-nowrap {{ $is_plan_selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-white hover:bg-gray-50 text-gray-600 active:bg-gray-100 border-gray-300 dark:bg-zinc-800 dark:border-transparent dark:text-zinc-300 dark:hover:bg-zinc-600' }}"
                                                    wire:click="addPlan({{ $plan->id }})">
                                                <span>
                                                    @if ($is_plan_selected)
                                                        @lang('messages.t_selected')
                                                    @else
                                                        @lang('messages.t_select')
                                                    @endif
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    </div>

                    {{-- Total --}}
                    <div class="flex items-center space-x-3 rtl:space-x-reverse bg-gray-100 hover:bg-gray-200 hover:bg-opacity-50 p-4 rounded-xl dark:bg-black">
                        <div class="grow">
                            <p class="text-sm text-gray-600 font-medium dark:text-zinc-400">
                                @lang('messages.t_total')
                            </p>
                        </div>
                        <div class="flex-none ltr:text-right rtl:text-left text-zinc-900 font-bold text-base tracking-wide dark:text-white">
                            {{ money($promoting_total, settings('currency')->code, true) }}
                        </div>
                    </div>
                </div>
            </div>
        @endif

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" wire:click="create">
                @lang('messages.t_post_project')
            </x-bladewind.button>
        </div>
    </div>
</div>
