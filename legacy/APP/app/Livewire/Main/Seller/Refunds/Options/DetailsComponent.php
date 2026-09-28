<?php

namespace App\Livewire\Main\Seller\Refunds\Options;

use App\Enums\ProjectStatus;
use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\ProjectRefund;
use App\Models\ProjectMilestone;
use App\Enums\ProjectRefundStatus;
use App\Enums\ProjectMilestoneStatus;
use App\Notifications\User\Buyer\RefundAccepted;
use App\Notifications\User\Buyer\RefundDeclined;
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

    public $refundType;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Try to find gig refund first
        $gigRefund = Refund::where('uid', $id)->where('seller_id', auth()->id())->with(['item.gig', 'buyer'])->first();

        if ($gigRefund) {
            $this->refund = $gigRefund;
            $this->refundType = 'gig';
            return;
        }

        // Try to find project refund
        $projectRefund = ProjectRefund::where('uid', $id)->where('freelancer_id', auth()->id())->with(['project', 'client'])->first();

        if ($projectRefund) {
            $this->refund = $projectRefund;
            $this->refundType = 'project';
            return;
        }

        // If neither found, throw 404
        abort(404);

    }

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

        $title = __('messages.t_refund_details')." $separator ".settings('general')->title;

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

        return view('livewire.main.seller.refunds.options.details', [
            'refundType'    => $this->refundType,
            'isPending'     => $this->isPending,
            'statusDisplay' => $this->statusDisplay,
        ]);

    }

    /**
     * Check if refund is pending
     *
     *
     * @return bool
     */
    public function getIsPendingProperty()
    {
        if ($this->refundType === 'gig') {
            return $this->refund->status === 'pending';
        } else {
            return $this->refund->status === ProjectRefundStatus::PENDING;
        }
    }

    /**
     * Get status display value
     *
     *
     * @return string
     */
    public function getStatusDisplayProperty()
    {
        if ($this->refundType === 'gig') {
            return $this->refund->status;
        } else {
            return $this->refund->status->value;
        }
    }

    /**
     * Accept refund

     *

     * @return void
     */
    public function accept()
    {
        try {
            if ($this->refundType === 'gig') {
                $this->acceptGigRefund();
            } else {
                $this->acceptProjectRefund();
            }

            // Refresh refund
            $this->refund->refresh();

            // Success
            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_u_have_approved_this_refund'),
                'icon' => 'success',
            ]);

        } catch (\Throwable $th) {
            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')
            );
            throw $th;
        }
    }

    /**
     * Accept gig refund
     */
    private function acceptGigRefund()
    {
        if ($this->refund->status !== 'pending') {
            return;
        }

        // Get refund item
        $item = $this->refund->item;

        DB::transaction(function () use ($item) {
            OrderItem::where('id', $item->id)->update([
                'status'      => 'refunded',
                'is_finished' => true,
                'refunded_at' => now(),
            ]);

            $this->refund->update([
                'status' => 'accepted_by_seller',
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
        $this->refund->buyer->notify((new RefundAccepted($this->refund))->locale(config('app.locale')));

        notification([
            'text' => 't_seller_has_accepted_ur_refund',
            'action' => url('account/refunds/details', $this->refund->uid),
            'user_id' => $this->refund->buyer_id,
            'params' => ['seller' => auth()->user()->username],
        ]);
    }

    /**
     * Accept project refund
     */
    private function acceptProjectRefund()
    {
        if ($this->refund->status !== ProjectRefundStatus::PENDING) {
            return;
        }

        \DB::transaction(function () {
            $this->refund->status = ProjectRefundStatus::ACCEPTED_BY_SELLER;
            $this->refund->save();

            $funded = ProjectMilestone::where('project_id', $this->refund->project_id)
                ->where('status', ProjectMilestoneStatus::FUNDED->value)
                ->get(['amount', 'employer_commission', 'freelancer_commission']);

            $totalEmployerLocked = 0;
            $totalFreelancerPending = 0;

            foreach ($funded as $m) {
                $totalEmployerLocked   += convertToNumber($m->amount) + convertToNumber($m->employer_commission);
                $totalFreelancerPending += max(0, convertToNumber($m->amount) - convertToNumber($m->freelancer_commission));
            }

            $client = $this->refund->client()->lockForUpdate()->first();
            if ($client && $totalEmployerLocked > 0) {
                $client->balance_available = convertToNumber($client->balance_available) + $totalEmployerLocked;
                $client->balance_pending = max(0, convertToNumber($client->balance_pending) - $totalEmployerLocked);
                $client->save();
            }

            if ($totalFreelancerPending > 0) {
                $freelancer = $this->refund->project->awarded_bid
                    ? $this->refund->project->awarded_bid->user()->lockForUpdate()->first()
                    : null;

                if ($freelancer) {
                    $freelancer->balance_pending = max(0, convertToNumber($freelancer->balance_pending) - $totalFreelancerPending);
                    $freelancer->save();
                }
            }

            ProjectMilestone::where('project_id', $this->refund->project_id)
                ->update(['status' => ProjectMilestoneStatus::REFUNDED->value]);

            $this->refund->project->status = ProjectStatus::COMPLETED->value;
            $this->refund->project->save();
        });

        notification([
            'text' => 't_freelancer_has_accepted_ur_refund',
            'action' => url('account/project-refunds/details', $this->refund->uid),
            'user_id' => $this->refund->client_id,
            'params' => ['freelancer' => auth()->user()->username],
        ]);
    }

    /**
     * Decline refund

     *

     * @return void
     */
    public function decline()
    {
        try {
            if ($this->refundType === 'gig') {
                $this->declineGigRefund();
            } else {
                $this->declineProjectRefund();
            }

            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_u_have_declined_this_refund'),
                'icon' => 'success',
            ]);

        } catch (\Throwable $th) {
            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')
            );
            throw $th;
        }
    }

    /**
     * Decline gig refund
     */
    private function declineGigRefund()
    {
        // Must be pending
        if ($this->refund->status !== 'pending') {
            return;
        }

        // Update refund
        $this->refund->update([
            'status' => 'rejected_by_seller',
        ]);

        // Send notification to buyer
        $this->refund->buyer->notify((new RefundDeclined($this->refund))->locale(config('app.locale')));

        // Send notification
        notification([
            'text' => 't_seller_has_declined_ur_refund',
            'action' => url('account/refunds/details', $this->refund->uid),
            'user_id' => $this->refund->buyer_id,
            'params' => ['seller' => auth()->user()->username],
        ]);
    }

    /**
     * Decline project refund
     */
    private function declineProjectRefund()
    {
        // Must be pending
        if ($this->refund->status !== ProjectRefundStatus::PENDING) {
            return;
        }

        // Update refund status
        $this->refund->status = ProjectRefundStatus::REJECTED_BY_SELLER;
        $this->refund->save();

        // Send notification to client
        notification([
            'text' => 't_freelancer_has_declined_ur_refund',
            'action' => url('account/project-refunds/details', $this->refund->uid),
            'user_id' => $this->refund->client_id,
            'params' => ['freelancer' => auth()->user()->username],
        ]);
    }

}
