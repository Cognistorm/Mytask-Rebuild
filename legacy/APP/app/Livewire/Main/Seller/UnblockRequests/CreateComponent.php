<?php

namespace App\Livewire\Main\Seller\UnblockRequests;

use App\Models\UnblockMoneyRequest;
use App\Models\OrderItem;
use App\Models\Project;
use App\Enums\UnblockMoneyRequestStatus;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class CreateComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $reason;
    public $uid;
    public $type;
    public $requestable;

    protected $rules = [
        'reason' => 'required|string|min:10|max:1000',
    ];

    protected $messages = [
        'reason.required' => 'Reason is required',
        'reason.min' => 'Reason must be at least 10 characters',
        'reason.max' => 'Reason cannot exceed 1000 characters',
    ];

    /**
     * Init component
     *
     * @param string $uid
     * @param string $type
     * @return void
     */
    public function mount($uid, $type)
    {
        $this->uid = $uid;
        $this->type = $type;

        // Validate the type (both 'order' and 'project' are supported)
        if (!in_array($this->type, ['order', 'project'])) {
            abort(404, 'Invalid request type');
        }

        // Load the appropriate entity based on type
        if ($this->type === 'order') {
            // Validate and load the order
            $this->requestable = OrderItem::where('uid', $this->uid)
                ->where('owner_id', auth()->id())
                ->where('status', 'delivered')
                ->where('is_finished', false)
                ->first();

            if (!$this->requestable) {
                abort(404, 'Order not found or not eligible for unblock request');
            }
        } elseif ($this->type === 'project') {
            // Validate and load the project
            $this->requestable = Project::where('uid', $this->uid)
                ->where('awarded_freelancer_id', auth()->id())
                ->where('status', 'pending_final_review')
                ->first();
            if (!$this->requestable) {
                abort(404, 'Project not found or not eligible for unblock request');
            }

            // Prevent unblock if any milestone is refunded
            $hasRefunded = \App\Models\ProjectMilestone::where('project_id', $this->requestable->id)
                ->where('status', \App\Enums\ProjectMilestoneStatus::REFUNDED->value)
                ->exists();
            if ($hasRefunded) {
                abort(403, 'Project milestones are refunded; cannot request unblock.');
            }
        }
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
        $title = __('messages.t_create_unblock_request')." $separator ".settings('general')->title;
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

        return view('livewire.main.seller.unblock-requests.create');
    }

    /**
     * Calculate pending amount for the specific requestable entity
     *
     * @return float
     */
    private function calculatePendingAmount()
    {
        if ($this->type === 'order') {
            // Return the profit value for the specific order
            return $this->requestable->profit_value;
        } elseif ($this->type === 'project') {
            // For projects, we might need to calculate based on project milestones or total value
            // This depends on your business logic - adjust as needed
            return $this->requestable->awarded_bid->amount;
        }

        return 0;
    }

    /**
     * Get delivery timestamp for the requestable entity
     *
     * @return \Carbon\Carbon|null
     */
    private function getDeliveryTimestamp()
    {

        if ($this->requestable instanceof OrderItem) {
            return $this->requestable->delivered_at ? \Carbon\Carbon::parse($this->requestable->delivered_at) : null;
        } elseif ($this->requestable instanceof Project) {
            $latestDelivery = $this->requestable->workDeliveries()
                ->whereNotNull('delivered_at')
                ->orderBy('delivered_at', 'desc')
                ->first();
            return $latestDelivery && $latestDelivery->delivered_at ?
                \Carbon\Carbon::parse($latestDelivery->delivered_at) : null;
        }

        return null;
    }

    /**
     * Check if 72 hours have passed since delivery
     *
     * @return bool
     */
    public function canSubmitUnblockRequest()
    {
        $deliveryTimestamp = $this->getDeliveryTimestamp();

        if (!$deliveryTimestamp) {
            return false;
        }

        return $deliveryTimestamp->addHours(72)->isPast();
    }

    /**
     * Get remaining time until unblock request can be submitted
     *
     * @return string|null
     */
    public function getRemainingTimeProperty()
    {
        $deliveryTimestamp = $this->getDeliveryTimestamp();

        if (!$deliveryTimestamp) {
            return null;
        }

        $canSubmitAt = $deliveryTimestamp->copy()->addHours(72);

        if ($canSubmitAt->isPast()) {
            return null; // Can submit now
        }

        return $canSubmitAt->diffForHumans();
    }

    /**
     * Submit unblock money request
     *
     * @return void
     */
    public function submit()
    {
        try {
            // Validate form data
            $this->validate();

            // Check if 72 hours have passed since delivery
            if (!$this->canSubmitUnblockRequest()) {
                $remainingTime = $this->remainingTime;
                $errorMessage = $remainingTime ?
                    __('messages.t_unblock_request_72_hour_wait', ['time' => $remainingTime]) :
                    __('messages.t_unblock_request_no_delivery_found');

                $this->alert(
                    'error',
                    __('messages.t_error'),
                    livewire_alert_params($errorMessage, 'error')
                );
                return;
            }

            // Calculate the total pending amount
            $pendingAmount = $this->calculatePendingAmount();

            // Check if there's any pending money to request
            if ($pendingAmount <= 0) {
                $this->alert(
                    'error',
                    __('messages.t_error'),
                    livewire_alert_params(__('messages.t_no_pending_money_to_unblock'), 'error')
                );
                return;
            }

            // Extra guard: prevent unblock if project milestones are refunded
            if ($this->type === 'project') {
                $hasRefunded = \App\Models\ProjectMilestone::where('project_id', $this->requestable->id)
                    ->where('status', \App\Enums\ProjectMilestoneStatus::REFUNDED->value)
                    ->exists();
                if ($hasRefunded) {
                    $this->alert(
                        'error',
                        __('messages.t_error'),
                        livewire_alert_params(__('messages.t_cannot_unblock_refunded_project_milestone'), 'error')
                    );
                    return;
                }
            }

            // Check if user already has a pending request for this specific requestable entity
            $existingRequest = UnblockMoneyRequest::where('freelancer_id', auth()->id())
                ->where('requestable_id', $this->requestable->id)
                ->where('requestable_type', get_class($this->requestable))
                ->where('status', UnblockMoneyRequestStatus::PENDING)
                ->first();
            if ($existingRequest) {
                $errorMessage = $this->type === 'order'
                    ? __('messages.t_you_already_have_request_for_this_order')
                    : __('messages.t_you_already_have_request_for_this_project');

                $this->alert(
                    'error',
                    __('messages.t_error'),
                    livewire_alert_params($errorMessage, 'error')
                );
                return;
            }

            // Create unblock money request with polymorphic relations
            $requestData = [
                'uid' => uid(),
                'freelancer_id' => auth()->id(),
                'requestable_id' => $this->requestable->id,
                'requestable_type' => get_class($this->requestable),
                'amount' => $pendingAmount,
                'reason' => $this->reason,
                'status' => UnblockMoneyRequestStatus::PENDING,
                'is_seen_by_freelancer' => true,
                'is_seen_by_admin' => false,
                'request_admin_intervention' => true,
            ];

            UnblockMoneyRequest::create($requestData);

            // Success message
            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_unblock_request_submitted_successfully'),
                'icon' => 'success',
            ]);

            // Reset form
            $this->reset(['reason']);

            // Redirect to listing page
            return redirect()->route('seller.unblock_requests.index');

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
}
