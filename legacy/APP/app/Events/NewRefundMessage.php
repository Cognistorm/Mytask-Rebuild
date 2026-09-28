<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\RefundConversation;
use App\Models\Refund;

class NewRefundMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $refund;
    public $message;

    /**
     * Create a new event instance.
     */
    public function __construct(Refund $refund, RefundConversation $message)
    {
        $this->refund = $refund;
        $this->message = $message;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('refund.' . $this->refund->uid),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'new-message';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'uid' => $this->message->uid,
            'message' => $this->message->message,
            'author_type' => $this->message->author_type,
            'author_id' => $this->message->author_id,
            'created_at' => $this->message->created_at->toISOString(),
            'author' => [
                'id' => $this->message->author_type === 'seller' ? $this->message->seller->id : $this->message->buyer->id,
                'username' => $this->message->author_type === 'seller' ? $this->message->seller->username : $this->message->buyer->username,
                'avatar' => $this->message->author_type === 'seller' ? $this->message->seller->avatar : $this->message->buyer->avatar,
            ]
        ];
    }
}
