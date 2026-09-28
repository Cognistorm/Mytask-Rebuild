<div>

    {{-- --------------  the modal -------------- --}}
    @if($show)
        <div class="fixed inset-0 z-[60] overflow-y-auto" wire:key="conversation-modal">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="fixed inset-0 bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 transition-opacity"></div>

                <div class="relative bg-white dark:bg-zinc-700 rounded-lg shadow-lg max-w-xl w-full">
                    {{-- Modal header --}}
                    <div class="flex justify-between items-center py-3 px-6 rounded-t-lg border-b border-gray-100 dark:border-zinc-600">
                        <h3 class="text-sm font-semibold text-slate-600 dark:text-white tracking-wide pt-px">
                            Conversation
                        </h3>
                        <button wire:click="$set('show', false)" type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ltr:ml-auto rtl:mr-auto inline-flex items-center dark:hover:bg-zinc-600 dark:hover:text-white mt-px">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                        </button>
                    </div>

                    {{-- Modal body --}}
                    <div id="messages-container" class="p-6 space-y-6 w-full overflow-y-auto max-h-[calc(100vh-15rem)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-zinc-900 dark:scrollbar-track-zinc-600 relative"
                         x-data="{
                             isInitialLoad: true,
                             anchor: 0,
                             isLoadingMore: false,
                             init() {
                                 this.$nextTick(() => {
                                     if (this.isInitialLoad) {
                                         this.scrollToBottom();
                                         this.isInitialLoad = false;
                                     }
                                     this.setupScrollListener();
                                 });
                             },
                             scrollToBottom() {
                                 this.$el.scrollTop = this.$el.scrollHeight;
                             },
                             setupScrollListener() {
                                 const container = this.$el;
                                 container.addEventListener('scroll', () => {
                                     if (container.scrollTop <= 50 && this.$wire.get('hasMoreMessages') && !this.isLoadingMore) {
                                         this.isLoadingMore = true;
                                         this.anchor = container.scrollHeight - container.scrollTop;
                                         @this.call('loadMoreMessages').then(() => {
                                             this.$nextTick(() => {
                                                 container.scrollTop = container.scrollHeight - this.anchor;
                                                 this.isLoadingMore = false;
                                             });
                                         });
                                     }
                                 });
                             }
                         }"
                         x-init="init()"
                         x-ref="container">

                        {{-- Loading indicator --}}
                        @if($hasMoreMessages)
                            <div class="text-center py-2" wire:loading.remove wire:target="loadMoreMessages">
                                <span class="text-xs text-gray-500 dark:text-zinc-400">Scroll up to load more messages</span>
                            </div>
                        @endif

                        @if($loadingMore)
                            <div class="text-center py-2" wire:loading wire:target="loadMoreMessages">
                                <div class="inline-flex items-center">
                                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span class="text-xs text-gray-500 dark:text-zinc-400">Loading more messages...</span>
                                </div>
                            </div>
                        @endif

                        <div class="space-y-3">
                            @forelse($thread as $m)
                                <div class="{{ $m['from_id']===$fromUserId ? 'text-left' : 'text-right' }}">
                                    <div class="inline-block {{ $m['from_id']===$fromUserId ? 'bg-gray-100 dark:bg-zinc-600' : 'bg-blue-100 dark:bg-zinc-800' }} px-3 py-2 rounded">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-xs font-medium text-gray-700 dark:text-zinc-200">{{ $m['from']['username'] }}</span>
                                            <span class="text-xs text-gray-500 dark:text-zinc-400 ml-2">{{ \Carbon\Carbon::parse($m['created_at'])->format('M j, H:i') }}</span>
                                        </div>
                                        <span class="text-sm text-gray-700 dark:text-zinc-200">{{ $m['body'] }}</span>
                                        @if(isset($m['attachment']) && $m['attachment'])
                                            @php $attachment = json_decode($m['attachment']); @endphp
                                            @if($attachment && isset($attachment->new_name))
                                                <div class="mt-2 w-fit bg-gray-200 dark:bg-zinc-700 rounded-md py-2 px-3">
                                                    <div class="flex items-center justify-end space-x-5 rtl:space-x-reverse">
                                                        <span class="fiv-sqo fiv-icon-{{ $attachment->extension ?? 'default' }} text-4xl"></span>
                                                        <div class="flex flex-col justify-center">
                                                            <span class="text-[13px] font-semibold text-zinc-700 dark:text-slate-200 truncate max-w-xs">{{ $attachment->old_name ?? 'File' }}</span>
                                                            <div class="flex items-center space-x-3 rtl:space-x-reverse text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                                @if(isset($attachment->size))
                                                                    <span>{{ format_bytes($attachment->size) }}</span>
                                                                @endif
                                                                <a href="{{ route('admin.chat.download', $attachment->new_name) }}" class="text-blue-600 hover:underline">@lang('messages.t_download')</a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            @endif
                                        @endif
                                    </div>
                                </div>
                            @empty
                                <p class="text-center text-gray-500 dark:text-zinc-400">No messages.</p>
                            @endforelse
                        </div>
                    </div>
                </div>
            </div>
        </div>
    @endif
</div>
