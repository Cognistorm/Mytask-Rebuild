<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-chats-circle"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_live_chat_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_live_chat_settings_subtite')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Instructions --}}
                <div class="col-span-12">
                    <div>
                        <ul class="flex space-x-4 rtl:space-x-reverse text-xs text-primary-600 font-semibold">
                            <li>
                                <a href="https://pusher.com" class="hover:text-black hover:underline" target="_blank">Step 1</a>
                            </li>
    
                            <li>
                                <a href="https://i.postimg.cc/JnK3kQ9q/1.png" class="hover:text-black hover:underline" target="_blank">Step 2</a>
                            </li>
    
                            <li>
                                <a href="https://i.postimg.cc/fW2jWB7W/2.png" class="hover:text-black hover:underline" target="_blank">Step 3</a>
                            </li>
    
                            <li>
                                <a href="https://i.postimg.cc/90Mdt72j/3.png" class="hover:text-black hover:underline" target="_blank">Step 4</a>
                            </li>
    
                            <li>
                                <a href="https://i.postimg.cc/rsPShwyR/4.png" class="hover:text-black hover:underline" target="_blank">Step 5</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {{-- Pusher key --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_pusher_key')"
                        :placeholder="__('dashboard.t_enter_pusher_key')"
                        model="pusher_key"
                        icon="key" />
                </div>

                {{-- Pusher secret --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_pusher_secret')"
                        :placeholder="__('dashboard.t_enter_pusher_secret')"
                        model="pusher_secret"
                        icon="lock-key" />
                </div>

                {{-- Pusher app id --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_pusher_app_id')"
                        :placeholder="__('dashboard.t_enter_pusher_app_id')"
                        model="pusher_app_id"
                        icon="fingerprint-simple" />
                </div>

                {{-- Pusher cluster --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_pusher_cluster')"
                        :placeholder="__('dashboard.t_enter_pusher_cluster')"
                        model="pusher_cluster"
                        icon="globe" />
                </div>

                {{-- Enable pusher encryption --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$pusher_encrypted"
                        name="pusher_encrypted"
                        :label="__('dashboard.t_enable_pusher_encryption')"
                        label_position="right" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable attachments --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_attachments"
                        name="enable_attachments"
                        :label="__('dashboard.t_enable_chat_attachments')"
                        label_position="right" />
                </div>

                {{-- Enable emojis --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_emojis"
                        name="enable_emojis"
                        :label="__('dashboard.t_enable_emojis')"
                        label_position="right" />
                </div>

                {{-- play notification sound --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$play_notification_sound"
                        name="play_notification_sound"
                        :label="__('dashboard.t_play_new_message_notification_sound')"
                        label_position="right" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Allowed image extensions --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('dashboard.t_allowed_image_extensions')"
                        :placeholder="__('dashboard.t_separate_each_ext_with_comma')"
                        model="allowed_images"
                        :rows="6" />
                </div>

                {{-- Allowed file extensions --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('dashboard.t_allowed_file_extensions')"
                        :placeholder="__('dashboard.t_separate_each_ext_with_comma')"
                        model="allowed_files"
                        :rows="6"/>
                </div>

                {{-- Max file size --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_size_mb')"
                        placeholder="00.00"
                        model="max_file_size"
                        icon="floppy-disk" />
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