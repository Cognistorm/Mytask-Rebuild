<?php

namespace App\Livewire\Admin\Chat;

use App\Models\ChMessage;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Database\Eloquent\Builder;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class ChatComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    public $from;

    public $to;

    public $perPage = 10;

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

        return view('livewire.admin.chat.chat', [

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
        if($this->from && $this->to){
            return ChMessage::query()
                ->with(['to', 'from'])
                ->where(function (Builder $query) {
                    $query->where('from_id', $this->from)
                        ->orWhere('to_id', $this->from);
                })
                ->where(function (Builder $query) {
                    $query->where('from_id', $this->to)
                        ->orWhere('to_id', $this->to);
                })
                ->latest()
                ->paginate($this->perPage);

        }

        return ChMessage::query()->where('from_id', 0)->paginate($this->perPage);

    }

    public function loadMore()
    {
        $this->perPage += 10;
    }

}
