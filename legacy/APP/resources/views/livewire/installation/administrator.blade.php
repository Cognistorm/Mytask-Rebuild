<div class="w-full md:max-w-2xl lg:px-20 pt-5 lg:pt-12 mx-auto">

    {{-- Loading --}}
    <x-forms.loading />

    {{-- Steps --}}
    <div class="mb-10">

        {{-- Current step --}}
        <p class="text-xs font-semibold tracking-wide text-gray-500">4/6 - Administrator</p>
    
        {{-- Progress bar --}}
        <div class="mt-4 overflow-hidden rounded-full bg-gray-200">
            <div class="h-2 w-4/6 rounded-full bg-indigo-600"></div>
        </div>
        
    </div>

    {{-- Content --}}
    <x-form wire:submit="next" class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-crown"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    Administrator
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    Setup your admin account
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6"> 

                {{-- Email --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        label="E-mail address"
                        placeholder="Enter email address"
                        model="email"
                        type="email"
                        icon="at" />
                </div>

                {{-- Username --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        label="Username"
                        placeholder="Enter username"
                        model="username"
                        icon="user" />
                </div>

                {{-- Password --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        label="Password"
                        placeholder="Enter password"
                        model="password"
                        icon="lock" />
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