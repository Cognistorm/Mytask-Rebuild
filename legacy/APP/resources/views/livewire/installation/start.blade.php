<div class="w-full md:max-w-2xl lg:px-20 pt-5 lg:pt-12 mx-auto">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Steps --}}
    <div class="mb-10">

        {{-- Current step --}}
        <p class="text-xs font-semibold tracking-wide text-gray-500">1/6 - Get started</p>
    
        {{-- Progress bar --}}
        <div class="mt-4 overflow-hidden rounded-full bg-gray-200">
            <div class="h-2 w-1/6 rounded-full bg-indigo-600"></div>
        </div>
        
    </div>

    {{-- Content --}}
    <x-form wire:submit="next" class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-rocket-launch"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    Get started
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    Read the following instructions before you start installation  
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6"> 

                {{-- Info --}}
                <div class="col-span-12">
                    <ul role="list" class="list-disc space-y-6 text-[13px] font-medium text-gray-500">
                        <li class="leading-6">
                            Riverr is available only on CodeCanyon, if you buy it or download it from another websites it's either a spam or an edited version that may contains malwares. We always recommend you to <a href="{{ $purchase_link }}" target="_blank" class="text-primary-600">Buy Riverr</a> from CodeCanyon to get regulary updates and fast support.
                        </li>
                        <li class="leading-6">
                            We typically respond any message within seconds, minutes or maximum hours, but sometimes it may takes days. You can contact us on <a href="{{ $purchase_link }}" target="_blank" class="text-primary-600">Codecanyon</a>, email <a href="mailto:MrEdwardHendrix@gmail.com" target="_blank" class="text-primary-600">MrEdwardHendrix@gmail.com</a> for quick and fast support.
                        </li>
                        <li class="leading-6">
                            Keep your license key (purchase code) always private and don't share it with anyone. We will ask you for this key one time when you contact us to verify it. You can follow this post <a href="https://help.market.envato.com/hc/en-us/articles/202822600-Where-Is-My-Purchase-Code-" target="_blank" class="text-primary-600">Where Is My Purchase Code?</a> to get your purchase code.
                        </li>
                        <li class="leading-6">
                            We are not responsible for any incorrect, bad or harmful use of Riverr.
                        </li>
                        <li class="leading-6">
                            Please don't forget to give us <span class="text-amber-500">5 stars</span> rating, this will help us move on and provide you with new updates and features.
                        </li>
                        <li class="leading-6">
                            And finally we would like thank you so much for trusting us and we will always provide you with fast support and new regularly updates.
                        </li>
                    </ul>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-amber-700 bg-amber-100">
                        <div class="flex items-center gap-x-3">
                            <i class="ph-fill ph-warning-octagon text-xl"></i>
                            <h3 class="font-semibold grow text-xs leading-5">
                                The following fields are required. Please don't leave them empty and don't use incorrect info.
                            </h3>
                        </div>
                    </div>
                </div>
  
                {{-- Purchase code --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        label="Your purchase code"
                        placeholder="Please enter your purchase code"
                        model="purchase_code"
                        icon="key" />
                </div>

                {{-- CodeCanyon username --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        label="Your CodeCanyon username"
                        placeholder="Please enter your CodeCanyon username"
                        model="username"
                        icon="user" />
                </div>

            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                Continue
            </x-bladewind.button>
        </div>

    </x-form>

</div>

