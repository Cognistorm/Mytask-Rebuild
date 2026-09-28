<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-[7rem] py-12 lg:pt-16 lg:pb-24">

    <div class="px-4 sm:px-6 lg:px-8">

        <div class="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">

            <div class="divide-y divide-gray-200 dark:divide-zinc-700 lg:grid lg:grid-cols-12 lg:divide-y-0 lg:divide-x rtl:divide-x-reverse">

                {{-- Sidebar --}}
                <aside class="lg:col-span-3 py-6 hidden lg:block">
                    <livewire:main.account.sidebar-component />
                </aside>

                {{-- Section content --}}
                <div class="divide-y divide-gray-200 dark:divide-zinc-700 lg:col-span-9">

                    {{-- Header --}}
                    <div class="py-6 px-4 sm:p-6 lg:pb-8">

                        {{-- Section header --}}
                        <div class="mb-8">
                            <h2 class="text-base leading-6 font-bold text-gray-900 dark:text-gray-100">{{ __('messages.t_payment_methods') }}</h2>
                        </div>

                        {{-- Payment Methods Table --}}
                        @if($paymentMethods->count() > 0)
                            <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table class="min-w-full divide-y divide-gray-300 dark:divide-zinc-600">
                                    <thead class="bg-gray-50 dark:bg-zinc-700">
                                        <tr>
                                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {{ __('messages.t_card_type') }}
                                            </th>
                                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {{ __('messages.t_card_number') }}
                                            </th>
                                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {{ __('messages.t_expiration') }}
                                            </th>
                                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {{ __('messages.t_actions') }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-600">
                                        @foreach($paymentMethods as $method)
                                            <tr class="hover:bg-gray-50 dark:hover:bg-zinc-700">
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    <div class="flex items-center">
                                                        @if($method->card_type)
                                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                {{ ucfirst($method->card_type) }}
                                                            </span>
                                                        @else
                                                            <span class="text-gray-500 dark:text-gray-400">{{ __('messages.t_unknown') }}</span>
                                                        @endif
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {{ $method->masked_card_number }}
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {{ $method->expiration_date }}
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div class="flex items-center space-x-3">
                                                        <button id="modal-delete-payment-method-button-{{ $method->id }}"
                                                                class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                                            {{ __('messages.t_delete') }}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {{-- Delete Payment Method Modal --}}
                                            <x-forms.modal id="modal-delete-payment-method-container-{{ $method->id }}"
                                                           target="modal-delete-payment-method-button-{{ $method->id }}"
                                                           uid="modal_delete_payment_method_{{ $method->id }}"
                                                           placement="center-center"
                                                           size="max-w-md">

                                                {{-- Modal heading --}}
                                                <x-slot name="title">{{ __('messages.t_delete_payment_method') }}</x-slot>

                                                {{-- Modal content --}}
                                                <x-slot name="content">
                                                    <div class="text-center">
                                                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                                                            <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                            </svg>
                                                        </div>
                                                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                                            {{ __('messages.t_are_you_sure_delete_payment_method') }}
                                                        </h3>
                                                        <p class="text-sm text-gray-500 dark:text-gray-400">
                                                            {{ __('messages.t_delete_payment_method_warning') }}
                                                        </p>
                                                    </div>
                                                </x-slot>

                                                {{-- Footer --}}
                                                <x-slot name="footer">
                                                    <div class="flex justify-between items-center w-full">
                                                        {{-- Cancel --}}
                                                        <button x-on:click="close" type="button"
                                                                class="inline-flex justify-center items-center space-x-2 rounded border font-semibold focus:outline-none px-3 py-2 leading-5 text-xs tracking-wide border-gray-300 bg-white text-gray-800 shadow-sm hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300 hover:shadow focus:ring focus:ring-gray-500 focus:ring-opacity-25 active:bg-white active:border-white active:shadow-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-600">
                                                            {{ __('messages.t_cancel') }}
                                                        </button>

                                                        {{-- Delete --}}
                                                        <button type="button"
                                                                wire:click="deletePaymentMethod({{ $method->id }})"
                                                                wire:loading.attr="disabled"
                                                                class="inline-flex justify-center items-center rounded border font-semibold focus:outline-none px-3 py-2 leading-5 text-xs tracking-wide border-transparent bg-red-500 text-white hover:bg-red-600 focus:ring focus:ring-red-500 focus:ring-opacity-25 disabled:bg-gray-200 disabled:hover:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">

                                                            {{-- Loading indicator --}}
                                                            <div wire:loading wire:target="deletePaymentMethod({{ $method->id }})">
                                                                <svg role="status" class="inline w-4 h-4 text-gray-700 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                                                                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                                                                </svg>
                                                            </div>

                                                            <span wire:loading.remove wire:target="deletePaymentMethod({{ $method->id }})">
                                                                {{ __('messages.t_delete') }}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </x-slot>

                                            </x-forms.modal>

                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        @else
                            {{-- Empty state --}}
                            <div class="text-center py-12">
                                <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{{ __('messages.t_no_payment_methods') }}</h3>
                            </div>
                        @endif

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>
