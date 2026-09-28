<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 lg:pt-16 lg:pb-24">

    <div class="px-4 sm:px-6 lg:px-8">

        <div class="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">

            <div
                class="divide-y divide-gray-200 dark:divide-zinc-700 lg:grid lg:grid-cols-12 lg:divide-y-0 lg:divide-x rtl:divide-x-reverse">

                {{-- Section content --}}
                <div class="divide-y divide-gray-200 dark:divide-zinc-700 col-span-12">

                    {{-- Form --}}
                    <div class="py-6 px-4 sm:p-6 lg:pb-8">

                        {{-- Section header --}}
                        <div class="mb-14">
                            <div class="flex justify-between items-center">
                                <h2 class="text-base leading-6 font-bold text-gray-900 dark:text-gray-100">{{ __('messages.t_request_refund') }}</h2>
                                <a href="{{ url('account/projects/payments/' . $project->uid) }}"
                                   class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-500 rounded-sm shadow-sm text-[13px] font-medium text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-500 focus:outline-none focus:ring-primary-600">
                                    <svg class="w-4 h-4 ltr:mr-2 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                                    </svg>
                                    {{ __('messages.t_back') }}
                                </a>
                            </div>
                        </div>

                        {{-- Section content --}}
                        <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                            {{-- Project details --}}
                            <div class="col-span-12 mb-10">
                                <div
                                    class="bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 border-dashed border-2 rounded-md">
                                    <div class="py-6 px-4 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:p-8">

                                        <div class="sm:flex lg:col-span-7">
                                            <div class="mt-6 sm:mt-0">
                                                <h3 class="text-base font-medium text-gray-900 dark:text-gray-100 dark:hover:text-primary-600 hover:text-primary-600">
                                                    <a href="{{ url('project/' . $project->pid . '/' . $project->slug) }}"
                                                       target="_blank">{{ $project->title }}</a>
                                                </h3>

                                                <div class="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                                    <p>{{ Str::limit($project->description, 200) }}</p>
                                                </div>

                                                {{-- Project category --}}
                                                @if($project->category)
                                                    <div class="mt-3">
                                                        <span
                                                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-zinc-600 dark:text-zinc-200">
                                                            {{ $project->category->name }}
                                                        </span>
                                                    </div>
                                                @endif
                                            </div>
                                        </div>

                                        <div
                                            class="mt-6 flex items-center text-sm font-medium text-gray-900 dark:text-gray-100 lg:mt-0 lg:col-span-5">
                                            <div class="flex flex-col space-y-2 w-full">
                                                <div class="flex justify-between">
                                                    <span class="text-gray-500 dark:text-gray-400">{{ __('messages.t_project_budget') }}:</span>
                                                    <span>{{ money($project->budget_min, settings('currency')->code, true) }} - {{ money($project->budget_max, settings('currency')->code, true) }}</span>
                                                </div>

                                                @if($project->awarded_bid)
                                                    <div class="flex justify-between">
                                                        <span class="text-gray-500 dark:text-gray-400">{{ __('messages.t_proposal_amount') }}:</span>
                                                        <span
                                                            class="font-semibold text-primary-600">{{ money($project->awarded_bid->amount, settings('currency')->code, true) }}</span>
                                                    </div>
                                                @endif

                                                <div class="flex justify-between">
                                                    <span class="text-gray-500 dark:text-gray-400">{{ __('messages.t_posted_date') }}:</span>
                                                    <span>{{ $project->created_at->format('d.m.Y') }}</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {{-- Refund form --}}
                            <div class="col-span-12">

                                {{-- Loading --}}
                                <x-forms.loading/>

                                {{-- Warning Message --}}
                                <div class="mb-6">
                                    <div class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
                                        <div class="flex">
                                            <div class="flex-shrink-0">
                                                <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                            <div class="ml-3">
                                                <p class="text-sm text-yellow-800 dark:text-yellow-200">
                                                    {{ __('messages.t_refund_warning_message') }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <form wire:submit.prevent="request">

                                    {{-- Reason --}}
                                    <div class="col-span-12">
                                        <x-forms.textarea
                                            :label="__('messages.t_reason')"
                                            :placeholder="__('messages.t_reason')"
                                            model="reason"
                                            :rows="6"
                                        />
                                    </div>

                                    {{-- Submit --}}
                                    <div class="col-span-12 flex justify-end mt-8">
                                        <x-forms.button
                                            action="request"
                                            :text="__('messages.t_request_refund')"
                                            :disabled="false"/>
                                    </div>

                                </form>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>
