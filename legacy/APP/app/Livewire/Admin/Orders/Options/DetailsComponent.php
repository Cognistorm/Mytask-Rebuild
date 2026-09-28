<?php

namespace App\Livewire\Admin\Orders\Options;

use App\Models\Order;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class DetailsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $order;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get order

        $order = Order::where('uid', $id)->firstOrFail();

        // Set order

        $this->order = $order;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_order_details'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.orders.options.details');

    }

}
