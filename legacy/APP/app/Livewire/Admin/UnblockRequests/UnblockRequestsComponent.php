<?php

namespace App\Livewire\Admin\UnblockRequests;

use App\Models\OrderItem;
use App\Models\UnblockMoneyRequest;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Enums\UnblockMoneyRequestStatus;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class UnblockRequestsComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination, Actions;

    /**
     * Render component
     *
     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]
    public function render()
    {
        // Seo
        $this->seo()->setTitle(setSeoTitle(__('messages.t_unblock_money_requests'), true));
        $this->seo()->setDescription(settings('seo')->description);
        return view('livewire.admin.unblock-requests.unblock-requests', [
            'requests' => $this->requests,
        ]);
    }

    /**
     * Get list of unblock money requests
     *
     * @return object
     */
    public function getRequestsProperty()
    {
        // Get unblock money requests
        $requests = UnblockMoneyRequest::with(['freelancer'])
            ->latest()
            ->paginate(42);

        return $requests;
    }

    /**
     * Accept unblock money request
     *
     * @param string $uid
     * @return void
     */
    public function accept($uid)
    {
        try {
            // Find the request
            $request = UnblockMoneyRequest::where('uid', $uid)
                ->where('status', UnblockMoneyRequestStatus::PENDING)
                ->with(['freelancer', 'requestable'])
                ->firstOrFail();

            // Prevent approving if project has refunded milestones
            if ($request->requestable instanceof Project) {
                $hasRefunded = ProjectMilestone::where('project_id', $request->requestable->id)
                    ->where('status', \App\Enums\ProjectMilestoneStatus::REFUNDED->value)
                    ->exists();
                if ($hasRefunded) {
                    $this->notification([
                        'title'       => __('messages.t_error'),
                        'description' => __('messages.t_cannot_unblock_refunded_project_milestone'),
                        'icon'        => 'error',
                    ]);
                    return;
                }
            }

            // Update request status to approved
            $request->status = UnblockMoneyRequestStatus::APPROVED;
            $request->is_seen_by_admin = true;
            $request->save();

            // Transfer money from pending to available balance
            $freelancer = $request->freelancer;
            $freelancer->update([
                'balance_pending' => convertToNumber($freelancer->balance_pending) - convertToNumber($request->amount),
                'balance_available' => convertToNumber($freelancer->balance_available) + convertToNumber($request->amount)
            ]);

            // Update project or order status based on requestable type
            $requestable = $request->requestable;
            if ($requestable instanceof Project) {
                // Update project status to completed
                $requestable->status = 'completed';
                $requestable->save();

                // Update related milestones to paid/completed status
                ProjectMilestone::where('project_id', $requestable->id)
                    ->whereIn('status', ['delivered', 'pending_payment'])
                    ->update(['status' => 'paid']);

            } elseif ($requestable instanceof OrderItem) {
                $requestable->is_finished = 1;
                $requestable->save();
            }

            // Send notification to freelancer
            notification([
                'text' => 't_admin_approved_unblock_request',
                'action' => url('seller/unblock-requests'),
                'user_id' => $freelancer->id,
                'params' => [
                    'amount' => money($request->amount, settings('currency')->code, true)->format()
                ],
            ]);

            // Success message
            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_unblock_request_approved_successfully'),
                'icon' => 'success',
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
     * Decline unblock money request
     *
     * @param string $uid
     * @return void
     */
    public function decline($uid)
    {
        try {
            // Find the request
            $request = UnblockMoneyRequest::where('uid', $uid)
                ->where('status', UnblockMoneyRequestStatus::PENDING)
                ->with('freelancer')
                ->firstOrFail();

            // Update request status to rejected
            $request->status = UnblockMoneyRequestStatus::REJECTED;
            $request->is_seen_by_admin = true;
            $request->save();

            // Send notification to freelancer
            notification([
                'text' => 't_admin_declined_unblock_request',
                'action' => url('seller/unblock_requests'),
                'user_id' => $request->freelancer->id,
                'params' => [
                    'amount' => money($request->amount, settings('currency')->code, true)->format()
                ],
            ]);

            // Success message
            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_unblock_request_declined_successfully'),
                'icon' => 'success',
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
     * Confirm accept action
     *
     * @param string $uid
     * @return void
     */
    public function confirmAccept($uid)
    {
        $this->dialog()->confirm([
            'title' => __('messages.t_confirm'),
            'description' => __('messages.t_confirm_approve_unblock_request'),
            'icon' => 'question',
            'accept' => [
                'label' => __('messages.t_approve'),
                'method' => 'accept',
                'params' => $uid,
            ],
            'reject' => [
                'label' => __('messages.t_cancel'),
            ],
        ]);
    }

    /**
     * Confirm decline action
     *
     * @param string $uid
     * @return void
     */
    public function confirmDecline($uid)
    {
        $this->dialog()->confirm([
            'title' => __('messages.t_confirm'),
            'description' => __('messages.t_confirm_decline_unblock_request'),
            'icon' => 'question',
            'accept' => [
                'label' => __('messages.t_decline'),
                'method' => 'decline',
                'params' => $uid,
            ],
            'reject' => [
                'label' => __('messages.t_cancel'),
            ],
        ]);
    }
}
