<?php

namespace App\Livewire\Admin\Conversations;

use App\Models\ChMessage;
use App\Models\User;
use Livewire\Component;

class ConversationViewer extends Component
{
    public bool  $show   = false;
    public array $thread = [];

    // Pagination properties
    public int $currentPage = 1;
    public int $perPage = 30;
    public bool $hasMoreMessages = false;
    public bool $loadingMore = false;
    public int $fromUserId = 0;
    public int $toUserId = 0;

    // 👇 NEW
    protected $listeners = ['openConversation' => 'open', 'loadMoreMessages' => 'loadMoreMessages'];

    public function open(int $fromId, int $toId): void
    {
        // Reset pagination state
        $this->currentPage = 1;
        $this->thread = [];
        $this->hasMoreMessages = false;
        $this->loadingMore = false;
        $this->fromUserId = $fromId;
        $this->toUserId = $toId;

        // Load first page of messages
        $this->loadMessages();

        $this->show = true;
    }

    public function loadMoreMessages(): void
    {
        if ($this->hasMoreMessages && !$this->loadingMore) {
            $this->loadingMore = true;
            $this->currentPage++;
            $this->loadMessages(true);
            $this->loadingMore = false;
        }
    }

    private function loadMessages(bool $append = false): void
    {
        $user1 = User::findOrFail($this->fromUserId);
        $user2 = User::findOrFail($this->toUserId);

        $query = ChMessage::query()
            ->where(fn ($q) => $q->where('from_id', $user1->id)->where('to_id', $user2->id))
            ->orWhere(fn ($q) => $q->where('from_id', $user2->id)->where('to_id', $user1->id))
            ->with('from:id,username')
            ->select('id', 'from_id', 'to_id', 'body', 'attachment', 'seen', 'created_at')
            ->latest();

        $messages = $query->paginate($this->perPage, ['*'], 'page', $this->currentPage);

        $newMessages = $messages->items();

        if ($append) {
            // Prepend older messages to the beginning of the array
            $this->thread = array_merge(array_reverse($newMessages), $this->thread);
        } else {
            // Initial load - reverse to show newest first
            $this->thread = array_reverse($newMessages);
        }

        $this->hasMoreMessages = $messages->hasMorePages();
    }

    public function render()
    {
        return view('livewire.admin.conversations.conversation-viewer');
    }
}
