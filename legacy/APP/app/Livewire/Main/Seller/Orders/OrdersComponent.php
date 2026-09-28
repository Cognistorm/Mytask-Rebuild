<?php

namespace App\Livewire\Main\Seller\Orders;

use App\Models\OrderItem;
use App\Models\UnblockMoneyRequest;
use App\Enums\UnblockMoneyRequestStatus;
use App\Notifications\User\Buyer\OrderItemCanceled;
use App\Notifications\User\Buyer\OrderItemInProgress;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class OrdersComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.seller-app')]
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

        return view('livewire.main.seller.orders.orders', [

            'orders' => $this->orders,

        ]);

    }

    /**
     * Get seller's received orders

     *

     * @return object
     */
    public function getOrdersProperty()
    {

        // Get orders by this seller

        // Return orders

        return OrderItem::where('owner_id', auth()->id())
            ->whereHas('gig')
            ->whereHas('order.invoice', function ($query) {
                $query->where('status', 'paid');
            })
            ->latest()->paginate(42);

    }

    /**
     * Undocumented function

     *

     * @param [type] $id

     * @return void
     */
    public function confirmCancel($id)
    {
        // Get item

        $item = OrderItem::where('uid', $id)
            ->where('owner_id', auth()->id())
            ->where('status', 'pending')
            ->firstOrFail();

        // Check if invoice paid

        if ($item->order->invoice->status === 'pending') {

            return;

        }

        // Confirm

        $this->dialog()->confirm([

            'title' => __('messages.t_confirm_cancellation'),

            'description' => "<div class='leading-relaxed'>".__('messages.t_are_u_sure_u_want_to_cancel_order').'</div>',

            'icon' => 'error',

            'accept' => [

                'label' => __('messages.t_confirm'),

                'method' => 'cancel',

                'params' => $item->uid,

            ],

            'reject' => [

                'label' => __('messages.t_cancel'),

            ],

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

        $item = OrderItem::where('uid', $id)->where('owner_id', auth()->id())->where('status', 'pending')->firstOrFail();

        // Offline payment, invoice must be paid

        if ($item->order->invoice->status === 'pending') {

            return;

        }

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

        $item->canceled_by = 'seller';

        $item->canceled_at = now();

        $item->is_finished = true;

        $item->save();

        // Decrement orders in queue

        if ($item->gig->total_orders_in_queue() > 0) {

            $item->gig()->decrement('orders_in_queue');

        }

        // Send notification to buyer

        $item->order->buyer->notify((new OrderItemCanceled($item))->locale(config('app.locale')));

        // Send notification

        notification([

            'text' => 't_seller_has_canceled_ur_order',

            'action' => url('account/orders'),

            'user_id' => $item->order->buyer_id,

            'params' => ['seller' => auth()->user()->username],

        ]);

        // success

        $this->notification([

            'title' => __('messages.t_success'),

            'description' => __('messages.t_order_has_been_successfully_canceled'),

            'icon' => 'success',

        ]);

        // Refresh page

        $this->dispatch('refresh');

    }

    /**
     * Confirm pgrogressing order

     *

     * @param  string  $id
     * @return void
     */
    public function confirmProgress($id)
    {

        try {

            // Get item

            $item = OrderItem::where('uid', $id)
                ->where('owner_id', auth()->id())
                ->where('status', 'pending')
                ->firstOrFail();

            // Offline payment, invoice must be paid

            if ($item->order->invoice->status === 'pending') {

                return;

            }

            // Require buyer order details before starting
            if (empty($item->order_details)) {
                $this->alert(
                    'error',
                    __('messages.t_error'),
                    livewire_alert_params(__('messages.t_buyer_didnt_send_requirements_yet_continue'))
                );
                return;
            }

            // Show confirmation dialog with x/o buttons
            $this->dialog()->confirm([
                'title'       => __('messages.t_start_order_confirmation'),
                'description' => __('messages.t_are_you_ready_to_start_working_on_this_order'),
                'icon'        => 'question',
                'accept'      => [
                    'label'  => __('messages.t_yes_start'),
                    'method' => 'progress',
                    'params' => $id,
                ],
                'reject' => [
                    'label'  => __('messages.t_cancel'),
                ],
            ]);

        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

    /**
     * Progress order

     *

     * @param  string  $id
     * @return void
     */
    public function progress($id)
    {

        // Get item

        $item = OrderItem::where('uid', $id)->where('owner_id', auth()->id())->where('status', 'pending')->firstOrFail();

        // Offline payment, invoice must be paid

        if ($item->order->invoice->status === 'pending') {

            return;

        }

        // Require buyer order details before starting
        if (empty($item->order_details)) {
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_buyer_didnt_send_requirements_yet_continue'))
            );
            return;
        }

        // Update item

        if (! $item->expected_delivery_date) {

            $item->expected_delivery_date = $this->calculateExpectedDeliveryDate($item);

        }

        $item->status = 'proceeded';

        $item->proceeded_at = now();

        $item->save();

        // Send notification to buyer

        $item->order->buyer->notify((new OrderItemInProgress($item))->locale(config('app.locale')));

        // Send notification

        notification([

            'text' => 't_seller_has_started_ur_order',

            'action' => url('account/orders'),

            'user_id' => $item->order->buyer_id,

            'params' => ['seller' => auth()->user()->username],

        ]);

        // success

        $this->notification([

            'title' => __('messages.t_success'),

            'description' => __('messages.t_order_has_been_successfully_marked_progress'),

            'icon' => 'success',

        ]);

        // Refresh page

        $this->dispatch('refresh');

    }

    /**
     * Caculate expected delivery date

     *

     * @param  object  $item
     * @return string
     */
    private function calculateExpectedDeliveryDate($item)
    {

        // Set empty days variable

        $days = 0;

        // Culculate extra days for upgrades

        $days += $item->upgrades()->exists() ? $item->upgrades->sum('extra_days') : 0;

        // Add gig delivery time

        $days += $item->gig->delivery_time;

        // Calculate expected delivery date

        return now()->addDays($days);

    }

    /**
     * Check if user has any pending unblock requests for a specific order
     *
     * @param OrderItem $order
     * @return bool
     */
    public function hasPendingUnblockRequest($order)
    {
        return UnblockMoneyRequest::where('freelancer_id', auth()->id())
            ->where('status', UnblockMoneyRequestStatus::PENDING)
            ->where('requestable_id', $order->id)
            ->where('requestable_type', get_class($order))
            ->exists();
    }
}
