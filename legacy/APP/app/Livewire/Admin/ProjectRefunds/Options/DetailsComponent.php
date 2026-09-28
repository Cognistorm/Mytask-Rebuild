<?php

namespace App\Livewire\Admin\ProjectRefunds\Options;

use App\Models\ProjectRefund;
use App\Models\ProjectRefundConversation;
use App\Models\User;
use App\Enums\ProjectRefundStatus;
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
     * @param string $id
     * @return void
     */
    public function mount($id)
    {
        // Get refund
        $refund = ProjectRefund::where('uid', $id)->with('client')->firstOrFail();

        // Set refund
        $this->refund = $refund;
        // Get messages
        $this->messages = ProjectRefundConversation::where('project_refund_id', $this->refund->id)->latest()->get();

        // Mark as seen by admin
        $this->refund->update([
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
        $this->seo()->setTitle(setSeoTitle(__('messages.t_refund_details'), true));
        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.project-refunds.options.details');
    }

    /**
     * Accept refund
     *
     * @return void
     */
    public function accept()
    {
        try {
            if (!in_array($this->refund->status, [ProjectRefundStatus::PENDING, ProjectRefundStatus::REJECTED_BY_SELLER])) {
                return;
            }
            \DB::transaction(function () {
                $this->refund->status = ProjectRefundStatus::ACCEPTED_BY_ADMIN;
                $this->refund->save();

                $this->refund->project->status = \App\Enums\ProjectStatus::COMPLETED->value;
                $this->refund->project->save();


                $funded = $this->refund->project
                    ->milestones()
                    ->first(['amount', 'employer_commission', 'freelancer_commission', 'status']);


                $totalEmployerLocked = 0;
                $totalFreelancerPending = 0;
                $totalEmployerLocked   += convertToNumber($funded->amount) + convertToNumber($funded->employer_commission);
                $totalFreelancerPending += max(0, convertToNumber($funded->amount) - convertToNumber($funded->freelancer_commission));

                $client = $this->refund->client()->lockForUpdate()->first();
                if ($client) {
                    $client->update([
                        'balance_available' => convertToNumber($client->balance_available) + $totalEmployerLocked,
                    ]);
                }

                if ($totalFreelancerPending > 0) {
                    $freelancer = $this->refund->freelancer()->lockForUpdate()->first();
                    if ($freelancer) {
                        $freelancer->update([
                            'balance_pending' => max(0, convertToNumber($freelancer->balance_pending) - $totalFreelancerPending),
                        ]);
                    }
                }

                $this->refund->project->milestones()->update(['status' => \App\Enums\ProjectMilestoneStatus::REFUNDED->value]);
            });

            notification([
                'text' => 't_app_name_has_approved_ur_refund_request',
                'action' => url('account/project-refunds/details', $this->refund->uid),
                'user_id' => $this->refund->client_id,
                'params' => ['app_name' => config('app.name'), 'username' => $this->refund->client->username],
            ]);

            notification([
                'text' => 't_app_name_has_approved_ur_refund_request',
                'action' => url('seller/refunds/details/' . $this->refund->uid),
                'user_id' => $this->refund->freelancer_id,
                'params' => ['app_name' => config('app.name'), 'username' => $this->refund->client->username],
            ]);

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
     * Decline refund
     *
     * @return void
     */
    public function decline()
    {
        try {
            if (!in_array($this->refund->status, [ProjectRefundStatus::PENDING, ProjectRefundStatus::REJECTED_BY_SELLER])) {
                return;
            }

            \DB::transaction(function () {
                $this->refund->status = ProjectRefundStatus::REJECTED_BY_ADMIN;
                $this->refund->save();

                $this->refund->project->status = \App\Enums\ProjectStatus::COMPLETED->value;
                $this->refund->project->save();

                $funded = $this->refund->project
                    ->milestones()
                    ->where('status', \App\Enums\ProjectMilestoneStatus::FUNDED->value)
                    ->first(['amount', 'employer_commission', 'freelancer_commission']);

                $totalEmployerLocked = 0;
                $totalFreelancerPending = 0;
                $totalEmployerLocked   += convertToNumber($funded->amount) + convertToNumber($funded->employer_commission);
                $totalFreelancerPending += max(0, convertToNumber($funded->amount) - convertToNumber($funded->freelancer_commission));

                if ($totalFreelancerPending > 0) {
                    $freelancer = $this->refund->freelancer()->lockForUpdate()->first();
                    if ($freelancer) {
                        $freelancer->update([
                            'balance_available' => convertToNumber($freelancer->balance_available) + $totalFreelancerPending,
                        ]);
                    }
                }

                if ($totalEmployerLocked > 0) {
                    $client = $this->refund->client()->lockForUpdate()->first();
                    if ($client) {
                        $client->update([
                            'balance_pending' => max(0, convertToNumber($client->balance_pending) - $totalEmployerLocked),
                        ]);
                    }
                }
            });

            notification([
                'text' => 't_app_name_has_declined_ur_refund_request',
                'action' => url('account/project-refunds/details', $this->refund->uid),
                'user_id' => $this->refund->client_id,
                'params' => ['app_name' => config('app.name'), 'username' => $this->refund->client->username],
            ]);

            notification([
                'text' => 't_app_name_has_declined_ur_refund_request',
                'action' => url('seller/refunds/details/' . $this->refund->uid),
                'user_id' => $this->refund->freelancer_id,
                'params' => ['app_name' => config('app.name'), 'username' => $this->refund->client->username],
            ]);

            // Success
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
}
