<div class="w-full">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Header --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mb-10">
        <nav class="justify-between px-4 py-3 text-gray-700 border border-gray-100 rounded-lg shadow-sm sm:flex sm:px-5 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-none" aria-label="Breadcrumb">

            {{-- Menu --}}
            <ol class="inline-flex items-center mb-3 space-x-1 md:space-x-3 md:rtl:space-x-reverse sm:mb-0">

                {{-- Main home --}}
                <li>
                    <div class="flex items-center">
                        <a href="{{ url('/') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_home')
                        </a>
                    </div>
                </li>

                {{-- My dashboard --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                        <a href="{{ url('seller/home') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_my_dashboard')
                        </a>
                    </div>
                </li>

                {{-- Orders --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                        <a href="{{ url('seller/orders') }}" class="ltr:ml-1 rtl:mr-1 text-sm font-medium text-gray-700 hover:text-primary-600 md:ltr:ml-2 md:rtl:mr-2 dark:text-zinc-300 dark:hover:text-white">
                            @lang('messages.t_orders')
                        </a>
                    </div>
                </li>

                {{-- Order requirements --}}
                <li aria-current="page">
                    <div class="flex items-center">
                        <svg aria-hidden="true" class="w-4 h-4 text-gray-400 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                        <span class="mx-1 text-sm font-medium text-gray-400 md:mx-2 dark:text-zinc-400">
                            @lang('messages.t_requirements')
                        </span>
                    </div>
                </li>

            </ol>

            {{-- Action buttons --}}
            <div class="flex items-center">

                {{-- Back to orders --}}
                <span class="block">
                    <a href="{{ url('seller/orders') }}" class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-700/40 rounded shadow-sm text-[13px] font-medium text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-700/40 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-primary-600 dark:focus:ring-offset-zinc-700/40">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 dark:text-zinc-200 ltr:mr-2 rtl:ml-2 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor"> <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>

                        {{ __('messages.t_back_to_orders') }}
                    </a>
                </span>
                
            </div>

        </nav>
    </div>

    {{-- Content --}}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div class="grid grid-cols-12 md:gap-x-6 gap-y-10">

            {{-- Left side --}}
            <div class="col-span-12 lg:col-span-7">

                {{-- Required information --}}
                <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 px-8 py-6 mb-8">

                    {{-- Section title --}}
                    <div class="mb-14">
                        <h2 class="text-base tracking-wide font-bold text-zinc-900 dark:text-gray-100">
                            {{ __('messages.t_required_info') }}
                        </h2>
                    </div>

                    {{-- Section body --}}
                    <div class="w-full">
                        
                        {{-- List of required inputs --}}
                        @foreach ($item->requirements as $req)
                                        
                            {{-- Text field --}}
                            @if ($req->form_type === 'text')
                                <div class="w-full mb-8 block">
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">
                                        {{ $req->question }}
                                    </dt>
                                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                        {{ $req->form_value }}
                                    </dd>
                                </div>
                            @endif
    
                            {{-- Multiple choice --}}
                            @if ($req->form_type === 'choice')
                                <div class="w-full mb-8 block">
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">
                                        {{ $req->question }}
                                    </dt>
                                    <dd class="mt-2 text-sm text-gray-900 dark:text-gray-100">
    
                                        {{-- Check if multiple choices --}}
                                        @if ( is_array($req->form_value) && count($req->form_value) )
                                        
                                            {{-- Loop through options --}}
                                            @foreach ($req->form_value as $key => $value)
                                                <div class="flex items-center mb-3">
                                                    <div class="flex items-center h-5">
                                                        <input type="checkbox" checked disabled class="h-4 w-4 text-gray-300 border-gray-300 rounded-sm border-2">
                                                    </div>
                                                    <div class="ltr:ml-3 rtl:mr-3 text-xs">
                                                        <label class="font-medium text-gray-700 dark:text-gray-100">{{ $value }}</label>
                                                    </div>
                                                </div>
                                            @endforeach
    
                                        @else
    
                                            <div class="flex items-center mb-3">
                                                <div class="flex items-center h-5">
                                                    <input type="checkbox" checked disabled class="h-4 w-4 text-gray-300 border-gray-300 rounded-full border-2">
                                                </div>
                                                <div class="ltr:ml-3 rtl:mr-3 text-xs">
                                                    <label class="font-medium text-gray-700 dark:text-gray-100">{{ $req->form_value }}</label>
                                                </div>
                                            </div>
    
                                        @endif
                                        
                                    </dd>
                                </div>
                            @endif
    
                            {{-- File --}}
                            @if ($req->form_type === 'file')
                                <div class="w-full mb-8 block">
                                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">
                                        {{ $req->question }}
                                    </dt>
                                    <dd class="mt-2 text-sm text-gray-900 dark:text-gray-100">
                                        <ul role="list" class="border border-gray-200 dark:border-zinc-700 rounded-md divide-y divide-gray-200 dark:divide-zinc-700">
                                            <li class="ltr:pl-3 rtl:pr-3 ltr:pr-4 rtl:pl-4 py-3 flex items-center justify-between text-sm">
                                                <div class="w-0 flex-1 flex items-center">
                                                    <svg class="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd"></path> </svg>
                                                    <span class="ltr:ml-2 rtl:mr-2 flex-1 w-0 truncate">
                                                        {{ $req->form_value['id'] }}.{{ $req->form_value['extension'] }}
                                                    </span>
                                                </div>
                                                <div class="ltr:ml-4 rtl:mr-4 flex-shrink-0">
                                                    <a href="{{ url('uploads/requirements/' . $item->order->uid . '/' . $item->uid . '/' . $req->id . '/' . $req->form_value['id']) }}" target="_blank" class="font-medium text-primary-600 hover:text-primary-500">
                                                        {{ __('messages.t_download') }}
                                                    </a>
                                                </div>
                                            </li>
                                        </ul>
                                    </dd>
                                </div>
                            @endif
                            
                        @endforeach

                    </div>

                </div>

                {{-- Order details --}}
                <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 px-8 py-6">

                    {{-- Section title --}}
                    <div class="mb-14">
                        <h2 class="text-base tracking-wide font-bold text-zinc-900 dark:text-gray-100">
                            {{ __('messages.t_order_details') }}
                        </h2>
                    </div>

                    {{-- Section body --}}
                    <div class="w-full mb-6">
                        <dl class="divide-y divide-gray-100 dark:divide-zinc-700">

                            {{-- Posted date --}}
                            <div class="flex justify-between py-3 text-sm font-medium">
                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_posted_date') }}</dt>
                                <dd class="text-gray-900 dark:text-gray-200 font-bold">{{ format_date($item->placed_at, 'ago') }}</dd>
                            </div>

                            {{-- Expected delivery date --}}
                            <div class="flex justify-between py-3 text-sm font-medium">
                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_expected_delivery_date') }}</dt>
                                <dd class="text-gray-900 dark:text-gray-200 font-bold">{{ format_date($item->expected_delivery_date, config('carbon-formats.F_j,_Y_h_:_i_A')) }}</dd>
                            </div>

                            {{-- Earning --}}
                            <div class="flex justify-between py-3 text-sm font-medium">
                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_profit') }}</dt>
                                <dd class="text-gray-900 dark:text-gray-200 font-bold">{{ money($item->profit_value, settings('currency')->code, true) }}</dd>
                            </div>

                            {{-- Quatity --}}
                            <div class="flex justify-between py-3 text-sm font-medium">
                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_quantity') }}</dt>
                                <dd class="text-gray-900 dark:text-gray-200 font-bold">{{ $item->quantity }}</dd>
                            </div>

                            {{-- Status --}}
                            <div class="flex justify-between items-center py-3 text-sm font-medium">
                                <dt class="text-gray-500 dark:text-gray-400">{{ __('messages.t_order_status') }}</dt>
                                <dd class="text-gray-900 dark:text-gray-200">
                                    @switch($item->status)

                                        {{-- Pending --}}
                                        @case('pending')
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-sm text-[13px] font-medium bg-yellow-50 text-yellow-800 dark:text-yellow-400 dark:bg-transparent">
                                                {{ __('messages.t_pending') }}
                                            </span>
                                            @break
                                        
                                        {{-- Delivered --}}
                                        @case('delivered')
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-sm text-[13px] font-medium bg-green-50 text-green-800 dark:text-green-400 dark:bg-transparent">
                                                {{ __('messages.t_delivered') }}
                                            </span>
                                            @break

                                        {{-- Refunded --}}
                                        @case('refunded')
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-sm text-[13px] font-medium bg-red-50 text-red-800 dark:text-red-400 dark:bg-transparent">
                                                {{ __('messages.t_refunded') }}
                                            </span>
                                            @break

                                        {{-- Proceeded --}}
                                        @case('proceeded')
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-sm text-[13px] font-medium bg-blue-50 text-blue-800 dark:text-blue-400 dark:bg-transparent">
                                                {{ __('messages.t_in_the_process') }}
                                            </span>
                                            @break

                                        {{-- Canceled --}}
                                        @case('canceled')
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-sm text-[13px] font-medium bg-gray-50 text-gray-800 dark:text-gray-300 dark:bg-transparent">
                                                {{ __('messages.t_canceled') }}
                                            </span>
                                            @break

                                        @default
                                            
                                    @endswitch  
                                </dd>
                            </div>
                            
                        </dl>
                    </div>

                    {{-- Actions --}}
                    <div class="w-full">

                        {{-- Process the order --}}
                        @if ($item->status === 'pending' && $item->expected_delivery_date)
                            <div class="mb-4">
                                <button x-on:click="confirm('{{ __('messages.t_are_u_sure_u_want_to_start_this_order_seller') }}') ? $wire.progress : ''" wire:target="progress" wire:loading.attr="disabled" type="button" class="px-4 py-4 w-full tracking-wide text-xs bg-indigo-100 outline-none rounded text-primary-700 font-medium active:scale-95 hover:bg-indigo-200 focus:bg-indigo-200 focus:ring-2 focus:ring-indigo-100 focus:ring-offset-2 disabled:bg-gray-400/80 disabled:cursor-not-allowed transition-colors duration-200">

                                    {{-- Loading indicator --}}
                                    <div wire:loading wire:target="progress">
                                        <svg role="status" class="inline w-4 h-4 text-gray-700 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                                        </svg>
                                    </div>

                                    {{-- Button text --}}
                                    <div wire:loading.remove wire:target="progress">
                                        {{ __('messages.t_process_the_order') }}
                                    </div>

                                </button>
                            </div>
                        @endif

                        {{-- Cancel order --}}
                        @if ($item->status === 'pending')
                            <div class="mb-4">
                                <button x-on:click="confirm('{{ __('messages.t_are_u_sure_u_want_to_cancel_order') }}') ? $wire.cancel : ''" wire:target="cancel" wire:loading.attr="disabled" type="button" class="px-4 py-4 w-full tracking-wide text-xs bg-red-100 outline-none rounded text-red-700 font-medium active:scale-95 hover:bg-red-200 focus:bg-red-200 focus:ring-2 focus:ring-red-100 focus:ring-offset-2 disabled:bg-gray-400/80 disabled:cursor-not-allowed transition-colors duration-200">

                                    {{-- Loading indicator --}}
                                    <div wire:loading wire:target="cancel">
                                        <svg role="status" class="inline w-4 h-4 text-gray-700 animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                                        </svg>
                                    </div>

                                    {{-- Button text --}}
                                    <div wire:loading.remove wire:target="cancel">
                                        {{ __('messages.t_cancel_order') }}
                                    </div>

                                </button>
                            </div>
                        @endif

                        {{-- Deliver order --}}
                        @if (in_array($item->status, ['proceeded', 'delivered']) && !$item->is_finished)
                            <div class="">
                                <a href="{{ url('seller/orders/deliver', $item->uid) }}" class="block text-center px-4 py-4 w-full tracking-wide text-xs bg-green-100 outline-none rounded text-green-700 font-medium active:scale-95 hover:bg-green-200 focus:bg-green-200 focus:ring-2 focus:ring-green-100 focus:ring-offset-2 disabled:bg-gray-400/80 disabled:cursor-not-allowed transition-colors duration-200">
                                    {{ __('messages.t_deliver_work') }}
                                </a>
                            </div>
                        @endif                        

                    </div>

                </div>

            </div>

            {{-- Right side --}}
            <div class="col-span-12 lg:col-span-5">

                {{-- Gig --}}
                <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 px-8 py-6 mb-8">

                    {{-- Thumbnail --}}
                    <div class="p-2.5">
                        <img class="h-48 w-full rounded-lg object-cover object-center lazy" src="{{ placeholder_img() }}" data-src="{{ src($item->gig->thumbnail) }}" alt="{{ $item->gig->title }}">
                    </div>

                    {{-- Gig details --}}
                    <div class="flex grow flex-col px-4 pb-5 pt-1 text-center sm:px-5">

                        {{-- Subcategory --}}
                        <div>
                            <a class="text-[13px] text-gray-400 hover:underline hover:text-gray-600" href="{{ url('categories/' . $item->gig->category->slug . '/' . $item->gig->subcategory->slug) }}" target="_blank">
                                {{ $item->gig->subcategory->name }}
                            </a>
                        </div>

                        {{-- Title --}}
                        <div class="mt-1">
                                <a href="{{ url('service', $item->gig->slug) }}" target="_blank" class="text-base font-bold text-zinc-700 hover:text-primary-600 focus:text-primary-600 dark:text-zinc-300 dark:hover:text-zinc-100">
                                    {{ $item->gig->title }}
                                </a>
                        </div>
                      
                    </div>

                </div>

                {{-- Upgrades --}}
                <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 px-8 py-6 mb-8">

                    {{-- Section title --}}
                    <div class="mb-14">
                        <h2 class="text-base tracking-wide font-bold text-zinc-900 dark:text-gray-100">
                            {{ __('messages.t_selected_upgrades') }}
                        </h2>
                    </div>

                    {{-- Section body --}}
                    <div class="w-full">

                        @if ($item->upgrades()->count())
                            <dl class="divide-y divide-gray-100 dark:divide-zinc-700">

                                {{-- List of upgrades --}}
                                @foreach ($item->upgrades as $upgrade)
                                    <div class="relative flex items-start py-4 first:pt-0 last:pb-0">
                                        <div class="flex items-center h-5">
                                            <input type="checkbox" class="h-4 w-4 text-gray-300 border-gray-200 dark:disabled:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700 border-2 rounded-sm cursor-not-allowed pointer-events-none" checked disabled>
                                        </div>
                                        <div class="ltr:ml-3 rtl:mr-3 text-sm mt-[-3px]">
                                            <label class="font-medium text-gray-600 dark:text-gray-200 text-sm">{{ $upgrade->title }}</label>
                                            <p class="font-normal text-gray-400">
                                                <div class="mt-1 flex text-sm">
                                                    <p class="text-gray-400 text-[13px]">+ {{ money($upgrade->price, settings('currency')->code, true) }}</p>
                                
                                                    @if ($upgrade->extra_days)
                                                        <p class="ltr:ml-4 ltr:pl-4 ltr:border-l rtl:mr-4 rtl:pr-4 rtl:border-r border-gray-200 text-gray-400 text-[13px]">
                                                            {{ __('messages.t_extra_days_delivery_time_short', ['time' => delivery_time_trans($upgrade->extra_days)]) }}
                                                        </p>
                                                    @else
                                                        <p class="ltr:ml-4 ltr:pl-4 ltr:border-l rtl:mr-4 rtl:pr-4 rtl:border-r border-gray-200 dark:border-zinc-700 text-gray-400 text-[13px]">
                                                            {{ __('messages.t_no_changes_delivery_time') }}
                                                        </p>
                                                    @endif
                                                </div>
                                            </p>
                                        </div>
                                    </div>
                                @endforeach

                            </dl>
                        @else
                            <div class="py-14 px-6 text-center text-sm">
                                <svg class="mx-auto h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/> </svg>
                                <p class="mt-4 font-semibold text-gray-900 dark:text-gray-200">{{ __('messages.t_no_upgrades_selected') }}</p>
                                <p class="mt-2 text-gray-500 dark:text-gray-400">{{ __('messages.t_buyer_didnt_selected_any_upgrades_or_no_upgrades') }}</p>
                            </div>
                        @endif

                    </div>

                </div>

            </div>

        </div>
    </div>

</div>