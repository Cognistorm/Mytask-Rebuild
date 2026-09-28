<?php

namespace App\Livewire\Admin\Projects\Bids\Subscriptions;

use App\Models\ProjectBidUpgrade;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class SubscriptionsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_bids_subscriptions'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.bids.subscriptions.subscriptions', [

            'subscriptions' => $this->subscriptions,

        ]);

    }

    /**
     * Get list of subscriptions

     *

     * @return object
     */
    public function getSubscriptionsProperty()
    {

        return ProjectBidUpgrade::with('bid')->with('bid.user')->latest()->paginate(42);

    }

    /**
     * Approve an offline subscription

     *

     * @param  int  $id
     * @return void
     */
    public function approve($id)
    {

        try {

            // Get subscription

            $subscription = ProjectBidUpgrade::where('id', $id)
                ->where('payment_method', 'offline_payment')
                ->where('status', 'pending')
                ->with('bid')
                ->firstOrFail();

            // Set bid

            $bid = $subscription->bid;

            // Update subscription status

            $subscription->status = 'paid';

            $subscription->save();

            // Update bid status

            if ($bid->status === 'pending_payment') {

                // Mark it as active

                $bid->status = 'active';

                $bid->save();

            }

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

            // close modal

            $this->dispatch('close-modal', 'modal-approve-payment-container-'.str_replace('-', '_', $subscription->uid));

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
     * Reject an offline subscription

     *

     * @param  int  $id
     * @return void
     */
    public function reject($id)
    {

        try {

            // Get subscription

            $subscription = ProjectBidUpgrade::where('id', $id)
                ->where('payment_method', 'offline_payment')
                ->where('status', 'pending')
                ->with('bid')
                ->firstOrFail();

            // Set bid

            $bid = $subscription->bid;

            // Update subscription status

            $subscription->status = 'rejected';

            $subscription->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

            // close modal

            $this->dispatch('close-modal', 'modal-reject-payment-container-'.str_replace('-', '_', $subscription->uid));

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
     * Delete a subscription

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        try {

            // Get subscription

            $subscription = ProjectBidUpgrade::where('id', $id)->firstOrFail();

            // Get bid

            $bid = $subscription->bid;

            // Check if this subscription not paid yet

            if ($subscription->status === 'pending') {

                // We have to update bid first

                if ($bid->status === 'pending_payment') {

                    // Update this bid

                    $bid->is_sponsored = false;

                    $bid->is_sealed = false;

                    $bid->is_highlight = false;

                    $bid->status = settings('bids')->auto_approve_bids ? 'active' : 'pending_approval';

                    $bid->save();

                }

            }

            // Delete subscription

            $subscription->delete();

            // Close modal

            $this->dispatch('close-modal', 'modal-delete-payment-container-'.str_replace('-', '_', $subscription->uid));

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
