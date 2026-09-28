<?php

namespace App\Livewire\Admin\Conversations;

use App\Models\ChMessage;
use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class ConversationsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    public $search = '';

    public function updatingSearch()
    {
        $this->resetPage();
    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_conversations'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.conversations.conversations', [

            'messages' => $this->messages,

        ]);

    }

    /**
     * Get list of messages

     *

     * @return object
     */
    public function getMessagesProperty()
    {
        $query = ChMessage::query()
            ->selectRaw('
            LEAST(from_id, to_id)    AS user1_id,
            GREATEST(from_id, to_id) AS user2_id
        ')
            ->whereHas('from')
            ->whereHas('to');

        if (!empty($this->search)) {
            $searchTerm = '%' . $this->search . '%';
            $query->where(function($q) use ($searchTerm) {
                $q->whereHas('from', function($subQ) use ($searchTerm) {
                    $subQ->where('username', 'LIKE', $searchTerm)
                         ->orWhere('fullname', 'LIKE', $searchTerm);
                })->orWhereHas('to', function($subQ) use ($searchTerm) {
                    $subQ->where('username', 'LIKE', $searchTerm)
                         ->orWhere('fullname', 'LIKE', $searchTerm);
                });
            });
        }

        $pairs = $query->groupBy('user1_id', 'user2_id')
            ->get()
            ->map(function($pair): object {
                $u1 = $pair->user1_id;
                $u2 = $pair->user2_id;

                $user1 = User::find($u1);
                $user2 = User::find($u2);

                $thread = ChMessage::between($u1, $u2)
                    ->orderBy('created_at', 'asc')
                    ->get();

                $latest = $thread->last();

                return (object) [
                    'id'            => $latest->id,
                    'from_id'       => $u1,
                    'to_id'         => $u2,
                    'from'          => $user1,
                    'to'            => $user2,
                    'seen'          => $latest->seen,
                    'message_count' => $thread->count(),
                    'latest_message_at' => $latest->created_at,
                    'latest_message' => $latest,
                ];
            })
            ->sortByDesc('latest_message_at')
            ->values();

        $perPage = 10;
        $page    = request()->get('page', 1);
        $total   = $pairs->count();

        $currentPageItems = $pairs
            ->slice(($page - 1) * $perPage, $perPage)
            ->values();

        return new LengthAwarePaginator(
            $currentPageItems,
            $total,
            $perPage,
            $page,
            [
                'path'  => request()->url(),
                'query' => request()->query(),
            ]
        );
    }
    /**
     * Confirm delete message

     *

     * @param  int  $id
     * @return void
     */
    public function confirmDelete($id)
    {

        try {

            // Get message

            $message = ChMessage::where('id', $id)->firstOrFail();

            // Confirm delete

            $this->dialog()->confirm([

                'title' => __('messages.t_confirm_delete'),

                'description' => "<div class='leading-relaxed'>".__('messages.t_are_u_sure_u_want_to_delete_this_msg').'</div>',

                'icon' => 'error',

                'accept' => [

                    'label' => __('messages.t_delete'),

                    'method' => 'delete',

                    'params' => $message->id,

                ],

                'reject' => [

                    'label' => __('messages.t_cancel'),

                ],

            ]);

        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

        }

    }

    /**
     * Delete message

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        try {

            // Get message

            $message = ChMessage::where('id', $id)->firstOrFail();

            // Check if message has attachment

            if ($message->attachment) {

                // Decode attachment

                $attachment = json_decode($message->attachment);

                // Get path to this file

                $path = config('chatify.attachments.folder').'/'.$attachment->new_name;

                // Check if file exists

                if (Storage::disk(config('chatify.storage_disk_name'))->exists($path)) {

                    // Delete

                    Storage::disk(config('chatify.storage_disk_name'))->delete($path);

                }

            }

            // Delete message

            $message->delete();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

        }

    }

}
