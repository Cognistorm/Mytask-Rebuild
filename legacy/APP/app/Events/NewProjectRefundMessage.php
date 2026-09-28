<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\ProjectRefundConversation;
use App\Models\ProjectRefund;

class NewProjectRefundMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $projectRefund;
    public $message;

    /**
     * Create a new event instance.
     */
    public function __construct(ProjectRefund $projectRefund, ProjectRefundConversation $message)
    {
        $this->projectRefund = $projectRefund;
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
            new PrivateChannel('project-refund.' . $this->projectRefund->uid),
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
                'id' => $this->message->author_type === 'freelancer' ? $this->message->freelancer->id : $this->message->client->id,
                'username' => $this->message->author_type === 'freelancer' ? $this->message->freelancer->username : $this->message->client->username,
                'avatar' => $this->message->author_type === 'freelancer' ? $this->message->freelancer->avatar : $this->message->client->avatar,
            ]
        ];
    }
}
