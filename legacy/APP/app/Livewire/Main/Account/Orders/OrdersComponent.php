<?php

namespace App\Livewire\Main\Account\Orders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Notifications\User\Seller\OrderItemCanceled;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class OrdersComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    public $orderDetailsText = '';
    public $selectedItemUid = null;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.buyer-app')]

    public function render()
    {

        // SEO

        $separator = settings('general')->separator;

        $title = __('messages.t_my_orders')." $separator ".settings('general')->title;

        $description = settings('seo')->description;

        $ogimage = src(settings('seo')->ogimage);

        $this->seo()->setTitle($title);

        $this->seo()->setDescription($description);

        $this->seo()->setCanonical(url()->current());

        $this->seo()->opengraph()->setTitle($title);

        $this->seo()->opengraph()->setDescription($description);

        $this->seo()->opengraph()->setUrl(url()->current());

        $this->seo()->opengraph()->setType('website');

        $this->seo()->opengraph()->addImage($ogimage);

        $this->seo()->twitter()->setImage($ogimage);

        $this->seo()->twitter()->setUrl(url()->current());

        $this->seo()->twitter()->setSite('@'.settings('seo')->twitter_username);

        $this->seo()->twitter()->addValue('card', 'summary_large_image');

        $this->seo()->metatags()->addMeta('fb:page_id', settings('seo')->facebook_page_id, 'property');

        $this->seo()->metatags()->addMeta('fb:app_id', settings('seo')->facebook_app_id, 'property');

        $this->seo()->metatags()->addMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', 'name');

        $this->seo()->jsonLd()->setTitle($title);

        $this->seo()->jsonLd()->setDescription($description);

        $this->seo()->jsonLd()->setUrl(url()->current());

        $this->seo()->jsonLd()->setType('WebSite');

        return view('livewire.main.account.orders.orders', [

            'orders' => $this->orders,

        ]);

    }

    /**
     * Get list of orders

     *

     * @return object
     */
    public function getOrdersProperty()
    {

        return Order::with([
                'invoice',
                'items' => function ($q) {
                    $q->with([
                        'gig',
                        'upgrades',
                        'refund',
                        'owner',
                        'order.invoice',
                    ]);
                },
            ])
            ->where('buyer_id', auth()->id())
            ->orderByDesc('id')
            ->paginate(42);

    }

    /**
     * Open the "Send Order Details" modal for a specific item
     */
    public function openDetailsModal(string $itemUid): void
    {
        $item = OrderItem::where('uid', $itemUid)
            ->whereHas('order', fn($q) => $q->where('buyer_id', auth()->id()))
            ->firstOrFail();

        if ($item->status !== 'pending') {
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_u_cant_submit_requirements_for_item'),
                'icon' => 'error',
            ]);
            return;
        }

        if (!$item->order->invoice || $item->order->invoice->status !== 'paid') {
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_we_are_waiting_for_payment_first'),
                'icon' => 'error',
            ]);
            return;
        }

        $this->selectedItemUid = $itemUid;
        $this->orderDetailsText = (string) ($item->order_details ?? '');

        // Reset and refresh the component state to ensure proper data binding
        $this->resetValidation();

        // Open the modal using the system modal component
        $this->dispatch('open-modal', 'order-details-modal');

        // Dispatch event to set content in the editor with a small delay
        // This ensures the modal and CKEditor are fully rendered before setting content
        $this->dispatch('order-details:open', [
            'html' => $this->orderDetailsText,
        ]);
    }

    /**
     * Save order details for selected item
     */
    public function saveOrderDetails(): void
    {
        if (!$this->selectedItemUid) return;

        $item = OrderItem::where('uid', $this->selectedItemUid)
            ->whereHas('order', fn($q) => $q->where('buyer_id', auth()->id()))
            ->firstOrFail();

        if ($item->status !== 'pending') {
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_u_cant_submit_requirements_for_item'),
                'icon' => 'error',
            ]);
            return;
        }

        if (!$item->order->invoice || $item->order->invoice->status !== 'paid') {
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_we_are_waiting_for_payment_first'),
                'icon' => 'error',
            ]);
            return;
        }

        $item->order_details = $this->orderDetailsText;
        $item->save();

        $this->dispatch('close-modal', 'order-details-modal');
        $this->notification([
            'title' => __('messages.t_success'),
            'description' => __('messages.t_toast_operation_success'),
            'icon' => 'success',
        ]);
    }

    /**
     * Cancel order

     *

     * @param  string  $id
     * @return void
     */
    public function cancel($id)
    {

        // Get item

        $item = OrderItem::where('uid', $id)
            ->whereHas('order', function ($query) {

                return $query->where('buyer_id', auth()->id());

            })
            ->where('status', 'pending')
            ->firstOrFail();

        // Remove item price from seller balance

        $item->owner()->update([

            'balance_pending' => convertToNumber($item->owner->balance_pending) - convertToNumber($item->profit_value),

        ]);

        // Add item price to buyer balance

        $item->order->buyer()->update([

            'balance_available' => convertToNumber($item->order->buyer->balance_available) + convertToNumber($item->total_value),

        ]);

        // Update item

        $item->status = 'canceled';

        $item->canceled_by = 'buyer';

        $item->canceled_at = now();

        $item->is_finished = true;

        $item->save();

        // Decrement orders in queue

        if ($item->gig->total_orders_in_queue() > 0) {

            $item->gig()->decrement('orders_in_queue');

        }

        // Check if item has any opened refund

        if ($item->refund && $item->refund?->status === 'pending') {

            // Let's close this refund

            $item->refund->status = 'closed';

            $item->refund->save();

        }

        // Send notification to seller

        $item->owner->notify((new OrderItemCanceled($item))->locale(config('app.locale')));

        // Send notification

        notification([

            'text' => 't_buyer_has_canceled_order',

            'action' => url('seller/orders/details', $item->uid),

            'user_id' => $item->owner_id,

            'params' => ['buyer' => auth()->user()->username],

        ]);

        // success

        $this->notification([

            'title' => __('messages.t_success'),

            'description' => __('messages.t_order_has_been_successfully_canceled'),

            'icon' => 'success',

        ]);

    }

    /**
     * Pay for pending order
     *
     * @param  string  $orderId
     * @return void
     */
    public function pay($orderId)
    {
        $order = Order::where('uid', $orderId)
            ->where('buyer_id', auth()->id())
            ->whereHas('invoice', function ($query) {
                return $query->where('status', 'pending');
            })
            ->firstOrFail();

        // Clear any existing cart data
        session()->forget('cart');

        // Recreate cart from order items
        $cart = [];

        foreach ($order->items as $item) {
            $cartItem = [
                'id' => $item->gig->uid,
                'quantity' => $item->quantity,
                'gig' => [
                    'title' => $item->gig->title,
                    'slug' => $item->gig->slug,
                    'price' => $item->gig->price,
                    'delivery' => $item->gig->delivery_time,
                    'thumbnail' => src($item->gig->thumbnail),
                ],
                'upgrades' => []
            ];

            // Add upgrades if they exist
            if ($item->upgrades && count($item->upgrades) > 0) {
                foreach ($item->upgrades as $upgrade) {
                    $cartItem['upgrades'][] = [
                        'id' => $upgrade->upgrade_uid,
                        'title' => $upgrade->title,
                        'price' => $upgrade->price,
                        'delivery' => $upgrade->extra_days,
                        'checked' => 1
                    ];
                }
            }

            $cart[] = $cartItem;
        }

        // Set cart in session
        session()->put('cart', $cart);

        // Redirect to checkout
        return redirect('/checkout');
    }

    /**
     * Delete pending payment order
     *
     * @param  string  $orderId
     * @return void
     */
    public function deletePendingOrder($orderId)
    {
        // Get order
        $order = Order::where('uid', $orderId)
            ->where('buyer_id', auth()->id())
            ->whereHas('invoice', function ($query) {
                return $query->where('status', 'pending');
            })
            ->firstOrFail();

        foreach ($order->items as $item) {
            if ($item->owner && $item->profit_value > 0) {
                $item->owner()->update([
                    'balance_pending' => convertToNumber($item->owner->balance_pending) - convertToNumber($item->profit_value),
                ]);
            }

            if ($item->gig && $item->gig->total_orders_in_queue() > 0) {
                $item->gig()->decrement('orders_in_queue');
            }

            $item->delete();
        }

        if ($order->invoice) {
            $order->invoice->delete();
        }

        $order->delete();

        $this->notification([
            'title' => __('messages.t_success'),
            'description' => __('messages.t_pending_order_deleted_successfully'),
            'icon' => 'success',
        ]);
    }

}
