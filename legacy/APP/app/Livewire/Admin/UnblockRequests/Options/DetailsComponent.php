<?php

namespace App\Livewire\Admin\UnblockRequests\Options;

use App\Models\UnblockMoneyRequest;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;
use App\Enums\UnblockMoneyRequestStatus;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class DetailsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $request;

    /**
     * Init component
     *
     * @param string $id
     * @return void
     */
    public function mount($id)
    {
        // Get unblock request
        $request = UnblockMoneyRequest::where('uid', $id)->with('freelancer')->firstOrFail();

        // Set request
        $this->request = $request;

        // Mark as seen by admin
        $this->request->update([
            'is_seen_by_admin' => true,
        ]);
    }

    /**
     * Render component
     *
     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]
    public function render()
    {
        // SEO
        $this->seo()->setTitle(setSeoTitle(__('messages.t_unblock_request_details'), true));
        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.unblock-requests.options.details');
    }

    /**
     * Approve unblock request
     *
     * @return void
     */
    public function approve()
    {
        try {
            // Must be pending
            if ($this->request->status !== UnblockMoneyRequestStatus::PENDING) {
                return;
            }

            $request = UnblockMoneyRequest::where('id', $this->request->id)->with('requestable')->first();
            if ($request && $request->requestable instanceof Project) {
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

            // Use database transaction to ensure data consistency
            \DB::transaction(function () {
                // Update request status
                $this->request->status = UnblockMoneyRequestStatus::APPROVED;
                $this->request->save();

                // Add money to freelancer's available balance
                $freelancer = $this->request->freelancer;
                $freelancer->balance_available = convertToNumber($freelancer->balance_available) + convertToNumber($this->request->amount);
                $freelancer->save();
            });

            // Send notification to freelancer
            notification([
                'text' => 't_app_name_has_approved_ur_unblock_request',
                'action' => url('seller/unblock-requests'),
                'user_id' => $this->request->freelancer_id,
                'params' => ['app_name' => config('app.name'), 'amount' => money($this->request->amount, settings('currency')->code, true)->format()],
            ]);

            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_u_have_approved_this_unblock_request'),
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
     * Decline unblock request
     *
     * @return void
     */
    public function decline()
    {
        try {
            // Must be pending
            if ($this->request->status !== UnblockMoneyRequestStatus::PENDING) {
                return;
            }

            // Update request status
            $this->request->status = UnblockMoneyRequestStatus::REJECTED;
            $this->request->save();

            // Send notification to freelancer
            notification([
                'text' => 't_app_name_has_declined_ur_unblock_request',
                'action' => url('seller/unblock-requests'),
                'user_id' => $this->request->freelancer_id,
                'params' => ['app_name' => config('app.name'), 'amount' => money($this->request->amount, settings('currency')->code, true)->format()],
            ]);

            // Success
            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_u_have_declined_this_unblock_request'),
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
}
