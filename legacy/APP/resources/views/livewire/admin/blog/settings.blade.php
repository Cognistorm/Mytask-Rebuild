<div class="w-full sm:mx-auto sm:max-w-2xl">
	<x-form wire:submit="update" class="card px-4 py-10 sm:p-10 md:mx-0" has-files>

        {{-- Loading --}}
        <x-forms.loading />

        {{-- Section head --}}
        <div class="flex items-center gap-4 border-b pb-6 border-slate-100 dark:border-zinc-700 mb-8">
            <div class="bg-slate-100 flex h-14 items-center justify-center rounded-full shrink-0 text-2xl text-slate-500 w-14 dark:bg-zinc-700 dark:text-zinc-400">
                <i class="ph-duotone ph-note"></i>
            </div>
            <div class="text-muted-700 block text-xl font-semibold">
                <h3 class="text-sm font-bold text-zinc-700 dark:text-white pb-2">
                    @lang('messages.t_blog_settings')
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                    @lang('dashboard.t_blog_settings_subtitle')
                </p>
            </div>
        </div>

        {{-- Section body --}}
        <div class="w-full">
            <div class="grid grid-cols-12 md:gap-x-8 gap-y-8 mb-6">

                {{-- Enable blog system --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_blog"
                        name="enable_blog"
                        :label="__('messages.t_enable_blog_system')"
                        label_position="right" />
                </div>

                {{-- Disaply recent posts --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$display_recent_posts"
                        name="display_recent_posts"
                        :label="__('dashboard.t_display_recent_posts_blog_settings')"
                        label_position="right" />
                </div>

                {{-- Divider --}}
                <div class="col-span-12 -mx-4 sm:-mx-10">
                    <div class="h-0.5 w-full bg-zinc-100 dark:bg-zinc-700 block"></div>
                </div>

                {{-- Enable comments --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$enable_comments"
                        name="enable_comments"
                        :label="__('messages.t_enable_comments_in_blog_articles')"
                        label_position="right" />
                </div>

                {{-- Auto approve comments --}}
                <div class="col-span-12">
                    <x-bladewind.toggle
                        :checked="$auto_approve_comments"
                        name="auto_approve_comments"
                        :label="__('messages.t_auto_approve_comments_in_articles')"
                        label_position="right" />
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