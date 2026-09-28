<?php

namespace App\Livewire\Admin\Projects\Subscriptions;

use App\Models\ProjectSubscription;
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_projects_subscriptions'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.subscriptions.subscriptions', [

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

        return ProjectSubscription::with('project')->latest()->paginate(42);

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

            $subscription = ProjectSubscription::where('id', $id)->firstOrFail();

            // Get project

            $project = $subscription->project;

            // Check if this subscription not paid yet

            if ($subscription->status === 'pending') {

                // We have to update project first

                if ($project->status === 'pending_payment') {

                    // Update this project

                    $project->is_featured = false;

                    $project->is_urgent = false;

                    $project->is_highlighted = false;

                    $project->is_alert = false;

                    $project->status = settings('projects')->auto_approve_projects ? 'active' : 'pending_approval';

                    $project->save();

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
