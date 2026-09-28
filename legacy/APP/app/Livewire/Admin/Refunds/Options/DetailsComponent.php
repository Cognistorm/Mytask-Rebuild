<?php

namespace App\Livewire\Admin\Refunds\Options;

use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\RefundConversation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class DetailsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $refund;

    public $messages;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get refund

        $refund = Refund::where('uid', $id)->firstOrFail();

        // Get refund conversation

        $messages = RefundConversation::where('refund_id', $refund->id)->latest()->get();

        // Set data

        $this->refund = $refund;

        $this->messages = $messages;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_refund_details'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.refunds.options.details');

    }

    /**
     * Accept refund

     *

     * @return void
     */
    public function accept()
    {

        // Check refund status

        if ($this->refund->status !== 'rejected_by_seller' && ! $this->refund->request_admin_intervention) {

            $this->notification([

                'title' => __('messages.t_error'),

                'description' => __('messages.t_u_cant_do_action_for_this_refund'),

                'icon' => 'error',

            ]);

            return;

        }

        $item = $this->refund->item;

        DB::transaction(function () use ($item) {
            $this->refund->status = 'accepted_by_admin';
            $this->refund->save();

            OrderItem::where('id', $item->id)->update([
                'status'      => 'refunded',
                'is_finished' => true,
                'refunded_at' => now(),
            ]);

            if ($item->gig->total_orders_in_queue() > 0) {
                $item->gig()->decrement('orders_in_queue');
            }

            $buyer = $this->refund->buyer()->lockForUpdate()->first();
            $seller = $this->refund->seller()->lockForUpdate()->first();

            if ($buyer) {
                $buyer->increment('balance_available', convertToNumber($item->total_value));
            }

            if ($seller) {
                $pendingToRelease = convertToNumber($item->profit_value);
                $newPending = max(0, convertToNumber($seller->balance_pending) - $pendingToRelease);
                $seller->update(['balance_pending' => $newPending]);
            }
        });

        // Send notification to buyer

        notification([

            'text' => 't_app_name_has_approved_ur_refund_request',

            'action' => url('account/refunds/details', $this->refund->uid),

            'user_id' => $this->refund->buyer_id,

            'params' => ['app_name' => config('app.name'), 'username' => $this->refund->buyer->username],

        ]);

        // Send notification to seller

        notification([

            'text' => 't_app_name_has_approved_refund_request_from_buyer',

            'action' => url('seller/refunds/details', $this->refund->uid),

            'user_id' => $this->refund->seller_id,

            'params' => ['app_name' => config('app.name'), 'username' => $this->refund->buyer->username],

        ]);

        // Refresh refund

        $this->refund->refresh();

        // Success

        $this->notification([

            'title' => __('messages.t_success'),

            'description' => __('messages.t_u_have_approved_this_refund'),

            'icon' => 'success',

        ]);

    }

    /**
     * Decline dispute

     *

     * @return void
     */
    public function decline()
    {
        // Check refund status
        if ($this->refund->status !== 'rejected_by_seller' && ! $this->refund->request_admin_intervention) {
            $this->notification([
                'title'       => __('messages.t_error'),
                'description' => __('messages.t_u_cant_do_action_for_this_refund'),
                'icon'        => 'error',
            ]);
            return;
        }

        $item = $this->refund->item;

        DB::transaction(function () use ($item) {
            $this->refund->status = 'rejected_by_admin';
            $this->refund->save();

            if (! $item->is_finished) {
                $seller = $this->refund->seller()->lockForUpdate()->first();
                if ($seller) {
                    $pending = convertToNumber($item->profit_value);
                    $seller->update([
                        'balance_pending'   => max(0, convertToNumber($seller->balance_pending) - $pending),
                        'balance_available' => convertToNumber($seller->balance_available) + $pending,
                    ]);
                }

                $item->is_finished = true;
                $item->save();
            }
        });

        // Refresh refund

        $this->refund->refresh();

        // Send notification to buyer

        notification([

            'text' => 't_app_name_has_declined_ur_refund_request',

            'action' => url('account/refunds/details', $this->refund->uid),

            'user_id' => $this->refund->buyer_id,

            'params' => ['app_name' => config('app.name'), 'username' => $this->refund->buyer->username],

        ]);

        // Send notification to seller

        notification([

            'text' => 't_app_name_has_declined_ur_refund_request',

            'action' => url('seller/refunds/details', $this->refund->uid),

            'user_id' => $this->refund->seller_id,

            'params' => ['app_name' => config('app.name'), 'username' => $this->refund->buyer->username],

        ]);

        // Success

        $this->notification([

            'title' => __('messages.t_success'),

            'description' => __('messages.t_u_have_declined_this_refund'),

            'icon' => 'success',

        ]);

    }

}
