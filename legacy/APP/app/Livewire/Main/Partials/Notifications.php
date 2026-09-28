<?php

namespace App\Livewire\Main\Partials;

use App\Models\Notification;
use Livewire\Component;

class Notifications extends Component
{
    public $notifications = [];

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Get notifications

        $notifications = Notification::where('user_id', auth()->id())->where('is_seen', false)->latest()->get();

        // Set notifications

        $this->notifications = $notifications;

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.main-app')]

    public function render()
    {

        return view('livewire.main.partials.notifications');

    }

    /**
     * Mark notification as read

     *

     * @param  string  $id
     * @return void
     */
    public function read($id)
    {

        // Get notification

        Notification::where('uid', $id)->where('user_id', auth()->id())->update([

            'is_seen' => true,

        ]);

        // Refresh notifications

        $this->notifications = Notification::where('user_id', auth()->id())->where('is_seen', false)->latest()->get();

    }

}
