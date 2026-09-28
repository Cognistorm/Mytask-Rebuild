<?php

namespace App\Livewire\Admin\Projects;

use App\Http\Validators\Admin\Projects\Options\RejectValidator;
use App\Models\Project;
use App\Models\ProjectBidUpgrade;
use App\Models\ProjectMilestone;
use App\Models\ProjectReportedBid;
use App\Models\ProjectRequiredSkill;
use App\Models\ProjectSubscription;
use App\Models\ReportedProject;
use App\Notifications\User\Employer\YourProjectApproved;
use App\Notifications\User\Employer\YourProjectRejected;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Schema;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class ProjectsComponent extends Component
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_projects'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.projects', [

            'projects' => $this->projects,

        ]);

    }

    /**
     * Get list of projects

     *

     * @return object
     */
    public function getProjectsProperty()
    {

        return Project::with('client')->withCount(['bids', 'milestones'])->latest()->paginate(42);

    }

    /**
     * Approve a project

     *

     * @param  int  $id
     * @return void
     */
    public function approve($id)
    {

        try {

            // Get project

            $project = Project::whereStatus('pending_approval')->whereId($id)->firstOrFail();

            // Aprove project

            $project->status = 'active';

            $project->save();

            // Send notification to the employer

            $project->client->notify(new YourProjectApproved($project));

            // Close modal

            $this->dispatch('close-modal', 'modal-approve-project-container-'.$project->uid);

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
     * Reject project

     *

     * @param  int  $id
     * @return void
     */
    public function reject($id)
    {

        try {

            // Get project

            $project = Project::whereStatus('pending_approval')->whereId($id)->firstOrFail();

            // Validate form

            RejectValidator::validate($this);

            // Reject project

            $project->status = 'rejected';

            $project->rejection_reason = $this->rejection_reason;

            $project->save();

            // Send notification to the employer

            $project->client->notify(new YourProjectRejected($project));

            // Reset rejection form

            $this->reset('rejection_reason');

            // Close modal

            $this->dispatch('close-modal', 'modal-reject-project-container-'.$project->uid);

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
     * Delete project

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        try {

            // Get project

            $project = Project::where('id', $id)->firstOrFail();

            // Disable foreign key check

            Schema::disableForeignKeyConstraints();

            // Get project bids

            $bids = $project->bids;

            // Loop through bids

            foreach ($bids as $bid) {

                // Delete bid upgrades

                ProjectBidUpgrade::whereBidId($bid->id)->delete();

                // Delete bid in reported bids

                ProjectReportedBid::whereBidId($bid->id)->delete();

                // Delete this bid

                $bid->delete();

            }

            // Delete skills

            ProjectRequiredSkill::where('project_id', $project->id)->delete();

            // Delete subscriptions

            ProjectSubscription::where('project_id', $project->id)->delete();

            // Delete muilestones

            ProjectMilestone::where('project_id', $project->id)->delete();

            // Delete reports

            ReportedProject::where('project_id', $project->id)->delete();

            // Now delete this project

            $project->delete();

            // Enable foreign key check

            Schema::enableForeignKeyConstraints();

            // Close modal

            $this->dispatch('close-modal', 'modal-delete-project-container-'.$project->uid);

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
