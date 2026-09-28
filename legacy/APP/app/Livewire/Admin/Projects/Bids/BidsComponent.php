<?php

namespace App\Livewire\Admin\Projects\Bids;

use App\Http\Validators\Admin\Projects\Bids\RejectValidator;
use App\Models\ProjectBid;
use App\Models\ProjectBidUpgrade;
use App\Models\ProjectReportedBid;
use App\Notifications\User\Everyone\NewBidReceived;
use App\Notifications\User\Everyone\YourBidApproved;
use App\Notifications\User\Everyone\YourBidRejected;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class BidsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    public $rejection_reason;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_bids'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.bids.bids', [

            'bids' => $this->bids,

        ]);

    }

    /**
     * Get list of bids

     *

     * @return object
     */
    public function getBidsProperty()
    {

        return ProjectBid::with(['project', 'user', 'upgrades'])->whereHas('project')->latest()->paginate(42);

    }

    /**
     * Approve a bid

     *

     * @param  int  $id
     * @return void
     */
    public function approve($id)
    {

        try {

            // Get bid

            $bid = ProjectBid::whereStatus('pending_approval')->whereId($id)->firstOrFail();

            // Aprove project

            $bid->status = 'active';

            $bid->save();

            // Send notification to the freelancer

            $bid->user->notify(new YourBidApproved($bid));

            // Send notification to the employer

            // Via web app

            notification([

                'text' => 't_u_received_new_bid_on_ur_project',

                'action' => url('project/'.$bid->project->pid.'/'.$bid->project->slug),

                'user_id' => $bid->project->user_id,

            ]);

            // Send a notification via email to the employer

            $bid->project->client->notify(new NewBidReceived($bid, $bid->project));

            // Close modal

            $this->dispatch('close-modal', 'modal-approve-bid-container-'.$bid->uid);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

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
     * Reject bid

     *

     * @param  int  $id
     * @return void
     */
    public function reject($id)
    {

        try {

            // Get bid

            $bid = ProjectBid::whereStatus('pending_approval')->whereId($id)->firstOrFail();

            // Validate form

            RejectValidator::validate($this);

            // Reject bid

            $bid->status = 'rejected';

            $bid->admin_rejection_reason = $this->rejection_reason;

            $bid->save();

            // Send notification to the employer

            $bid->user->notify(new YourBidRejected($bid));

            // Reset rejection form

            $this->reset('rejection_reason');

            // Close modal

            $this->dispatch('close-modal', 'modal-reject-bid-container-'.$bid->uid);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_form_validation_error'), 'error')

            );

            throw $e;
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
     * Delete bid

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        try {

            // Get bid

            $bid = ProjectBid::where('id', $id)->firstOrFail();

            // Delete reports

            ProjectReportedBid::where('bid_id', $id)->delete();

            // Delete upgrades

            ProjectBidUpgrade::where('bid_id', $id)->delete();

            // Now delete this bid

            $bid->delete();

            // Close modal

            $this->dispatch('close-modal', 'modal-delete-bid-container-'.$bid->uid);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

}
