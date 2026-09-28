<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-images-square"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_media_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('messages.t_media_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Default storage driver --}}
                <div class="col-span-12">

                    {{-- Select --}}
                    <div class="w-full" wire:ignore>
                        <x-bladewind.select required
                            :component-id="$this->__id"
                            name="default_storage_driver"
                            :selected_value="$default_storage_driver"
                            :label="__('dashboard.t_storage_driver')"
                            :placeholder="__('dashboard.t_choose_default_storage_driver')"
                            :hint="__('dashboard.t_to_use_cloud_storage_go_to_services_page')"
                            data="manual">
                        
                            {{-- Amazon S3 --}}
                            <x-bladewind.select-item label="Amazon S3" value="s3" />

                            {{-- Wasabi --}}
                            <x-bladewind.select-item label="Wasabi" value="wasabi" />

                            {{-- Cloudinary --}}
                            <x-bladewind.select-item label="Cloudinary" value="cloudinary" />

                            {{-- Local --}}
                            <x-bladewind.select-item label="Local" value="local" />

                        </x-bladewind.select>
                    </div>

                    {{-- Error --}}  
                    @error('default_storage_driver')
                        <p class="mt-1 text-xs text-red-600 dark:text-red-500">{{ $errors->first('default_storage_driver') }}</p>
                    @enderror 

                </div>

                {{-- Enable video upload --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_video_upload"
                        name="enable_video_upload"
                        :label="__('dashboard.t_enable_video_upload')"
                        label_position="right" />
                </div>

                {{-- Enable audio upload --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_audio_upload"
                        name="enable_audio_upload"
                        :label="__('dashboard.t_enable_audio_upload')"
                        label_position="right" />
                </div>

                {{-- Enable documents upload --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_documents_upload"
                        name="enable_documents_upload"
                        :label="__('dashboard.t_enable_documents_upload')"
                        label_position="right" />
                </div>

                {{-- Enable attachments for custom offers --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_attachments_custom_offers"
                        name="enable_attachments_custom_offers"
                        :label="__('dashboard.t_enable_attachments_for_custom_offers')"
                        label_position="right" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Maximum images per gig allowed --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_images_allowed_per_gig')"
                        :placeholder="__('dashboard.t_insert_a_value')"
                        model="max_images_per_gig"
                        icon="images" />
                </div>

                {{-- Maximum single image size --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_single_image_size')"
                        :placeholder="__('dashboard.t_insert_size_in_mb')"
                        model="max_single_image_size"
                        icon="upload" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Maximum documents per gig allowed --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_documents_allowed_per_gig')"
                        :placeholder="__('dashboard.t_insert_a_value')"
                        model="max_documents_per_gig"
                        icon="file-pdf" />
                </div>

                {{-- Maximum single image size --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_single_document_size')"
                        :placeholder="__('dashboard.t_insert_size_in_mb')"
                        model="max_single_document_size"
                        icon="upload" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-2">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs leading-7">
                                @lang('dashboard.t_media_settings_project_portfolio_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Maximum images per project portfolio allowed --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_images_allowed_per_project_portfolio')"
                        :placeholder="__('dashboard.t_insert_a_value')"
                        model="max_images_per_portfolio"
                        icon="slideshow" />
                </div>

                {{-- Maximum single image size --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_single_image_size')"
                        :placeholder="__('dashboard.t_insert_size_in_mb')"
                        model="max_single_portfolio_image_size"
                        icon="upload" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Maximum files per custom offer allowed --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_files_allowed_per_custom_offer')"
                        :placeholder="__('dashboard.t_insert_a_value')"
                        model="max_files_per_custom_offer"
                        icon="files" />
                </div>

                {{-- Maximum single file size --}}
                <div class="col-span-12 md:col-span-6">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_single_file_size')"
                        :placeholder="__('dashboard.t_insert_size_in_mb')"
                        model="max_single_offer_file_size"
                        icon="upload" />
                </div>

                {{-- Custom offer attachments allowed extensions --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('dashboard.t_custom_offer_attachments_allowed_extensions')"
                        :placeholder="__('dashboard.t_separate_each_ext_with_comma')"
                        model="offer_attachments_allowed_extensions"
                        icon="floppy-disk"
                        :rows="4" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-2">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs leading-7">
                                @lang('dashboard.t_requirements_files_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Requirements maximum file size --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_file_size_for_requirements')"
                        :placeholder="__('dashboard.t_insert_size_in_mb')"
                        model="requirements_max_file_size"
                        icon="upload" />
                </div>

                {{-- Allowed extensions for requirements files --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('dashboard.t_allowed_exts_for_requirements_files')"
                        :placeholder="__('dashboard.t_separate_each_ext_with_comma')"
                        model="requirements_allowed_extensions"
                        icon="floppy-disk"
                        :rows="4" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-2">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs leading-7">
                                @lang('dashboard.t_delivered_work_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Delivered work maximum file size --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_file_size_for_delivered_work')"
                        :placeholder="__('dashboard.t_insert_size_in_mb')"
                        model="delivered_work_max_file_size"
                        icon="upload" />
                </div>

                {{-- Allowed extensions for delivered work --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('dashboard.t_allowed_exts_for_delivered_work')"
                        :placeholder="__('dashboard.t_separate_each_ext_with_comma')"
                        model="delivered_work_allowed_extensions"
                        icon="floppy-disk"
                        :rows="4" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Alert --}}
                <div class="col-span-12">
                    <div class="py-2.5 px-3 rounded text-blue-700 bg-blue-50">
                        <div class="flex items-center gap-x-2">
                            <svg class="inline-block w-5 h-5 flex-none text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            <h3 class="font-semibold grow text-xs leading-7">
                                @lang('dashboard.t_media_restrictions_settings_explain')
                            </h3>
                        </div>
                    </div>
                </div>

                {{-- Maximum files restrictions --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_files')"
                        :placeholder="__('dashboard.t_insert_a_value')"
                        model="restrictions_max_files"
                        icon="files" />
                </div>

                {{-- Restrictions maximum file size --}}
                <div class="col-span-12">
                    <x-forms.text-input required
                        :label="__('dashboard.t_max_single_file_size')"
                        :placeholder="__('dashboard.t_insert_size_in_mb')"
                        model="restrictions_max_size"
                        icon="upload" />
                </div>

                {{-- Allowed extensions for restrictions files --}}
                <div class="col-span-12">
                    <x-forms.textarea required
                        :label="__('dashboard.t_allowed_extensions')"
                        :placeholder="__('dashboard.t_separate_each_ext_with_comma')"
                        model="restrictions_allowed_extensions"
                        icon="floppy-disk"
                        :rows="4" />
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
