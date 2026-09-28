<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="delete" class="card px-4 py-10 sm:p-10 md:mx-0">

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-trash"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('dashboard.t_delete_subcategory')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_delete_categories_warning_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Parent category --}}
                <div class="col-span-12">
                    <x-forms.select-simple required live
                        model="category_id"
                        :label="__('messages.t_category')"
                        :placeholder="__('messages.t_choose_category')">
                        <x-slot:options>
                            @foreach ($categories as $category)
                                <option value="{{ $category->id }}">{{ $category->name }}</option>
                            @endforeach
                        </x-slot:options>
                    </x-forms.select-simple>
                </div>

                {{-- Subcategory --}}
                <div class="col-span-12">
                    <x-forms.select-simple required live
                        model="subcategory_id"
                        :label="__('messages.t_subcategory')"
                        :placeholder="__('messages.t_choose_subcategory')">
                        <x-slot:options>
                            @foreach ($subcategories as $subcategory)
                                <option value="{{ $subcategory->id }}">{{ $subcategory->name }}</option>
                            @endforeach
                        </x-slot:options>
                    </x-forms.select-simple>
                </div>

                {{-- Childcategory --}}
                <div class="col-span-12">
                    <x-forms.select-simple required
                        model="childcategory_id"
                        :label="__('messages.t_childcategory')"
                        :placeholder="__('messages.t_choose_childcategory')">
                        <x-slot:options>
                            @foreach ($childcategories as $childcategory)
                                <option value="{{ $childcategory->id }}">{{ $childcategory->name }}</option>
                            @endforeach
                        </x-slot:options>
                    </x-forms.select-simple>
                </div>
                
            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true" color="red">
                @lang('messages.t_delete')
            </x-bladewind.button>
        </div>
            
	</x-form>
</div>
