<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-chat-text"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_edit_comment')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_edit_comment_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Comment --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('messages.t_comment')"
                        :placeholder="__('messages.t_comment')"
                        model="content"
                        rows="6"
                        icon="chat-circle-text" />
                </div>

                {{-- Status --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->id()"
                            name="status"
                            :selected_value="$status"
                            :label="__('messages.t_status')"
                            :placeholder="__('messages.t_choose_status')"
                            data="manual">
                        
                            <x-bladewind.select-item :label="__('messages.t_active')" value="active" />
                            <x-bladewind.select-item :label="__('messages.t_pending')" value="pending" />
                            <x-bladewind.select-item :label="__('messages.t_hidden')" value="hidden" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('status')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('status') }}</p>
                    @enderror 

                </div>
                
            </div>
        </div>

        {{-- Section footer --}}
        <div class="w-full mt-12">
            <x-bladewind.button size="small" class="mx-auto block w-full" can_submit="true">
                @lang('messages.t_update')
            </x-bladewind.button>
        </div>
            
	</x-form>
</div>