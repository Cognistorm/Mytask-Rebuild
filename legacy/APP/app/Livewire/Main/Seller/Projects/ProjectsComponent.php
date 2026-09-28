<?php

namespace App\Livewire\Main\Seller\Projects;

use App\Enums\ProjectWorkDeliveryStatus;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\UnblockMoneyRequest;
use App\Enums\UnblockMoneyRequestStatus;
use App\Notifications\User\Employer\FreelancerAcceptedYourProject;
use App\Notifications\User\Employer\FreelancerRejectedYourProject;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class ProjectsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    public $reject_reason;

    /**
     * Initialize component

     *

     * @return mixed
     */
    public function mount()
    {

        // Get settings

        $settings = settings('projects');

        // Check if this section enabled

        if (! $settings->is_enabled) {

            // Redirect to home page

            return redirect('/');

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

        $title = __('messages.t_awarded_projects')." $separator ".settings('general')->title;

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

        return view('livewire.main.seller.projects.projects', [

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

        return Project::whereHas('bids', function ($query) {

            return $query->where('user_id', auth()->id())
                ->whereIsAwarded(true)
                ->whereStatus('active')
                ->latest('updated_at');

        })
            ->where('awarded_freelancer_id', auth()->id())
            ->whereIn('status', ['active', 'completed', 'under_development', 'pending_final_review', 'incomplete', 'closed'])
            ->with(['workDeliveries' => function ($query) {
                return $query->where('freelancer_id', auth()->id())
                    ->where('status', ProjectWorkDeliveryStatus::DELIVERED);
            }])
            ->latest('updated_at')
            ->paginate(42);

    }

    /**
     * Reject this project

     *

     * @param  string  $id
     * @return mixed
     */
    public function reject($id)
    {

        try {

            // Get project

            $project = Project::where('uid', $id)
                ->whereStatus('active')
                ->whereHas('awarded_bid', function ($query) {

                    return $query->whereUserId(auth()->id())
                        ->whereIsFreelancerAccepted(false)
                        ->whereStatus('active');

                })->firstOrFail();

            // Check rejection reason

            if (! in_array($this->reject_reason, ['reason_1', 'reason_2', 'reason_3', 'reason_4', 'reason_5', 'reason_6', 'reason_7', 'reason_8'])) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_pls_select_rejection_reason'),

                    'icon' => 'error',

                ]);

                // Return back

                return;

            }

            // Let's reject this project

            $project->awarded_bid->is_awarded = false;

            $project->awarded_bid->is_freelancer_accepted = false;

            $project->awarded_bid->status = 'hidden';

            $project->awarded_bid->freelancer_rejection_reason = $this->reject_reason;

            $project->awarded_bid->freelancer_rejected_date = now();

            $project->awarded_bid->save();

            // Remove awarded freelancer and bid from project
            $project->awarded_freelancer_id = null;
            $project->awarded_bid_id = null;
            $project->save();

            // Send a notification to the employer

            $project->client->notify(new FreelancerRejectedYourProject($project, $project->awarded_bid));

            // Reset form

            $this->reset('reject_reason');

            // Close modal

            $this->dispatch('close-modal', "modal-reject-project-container-$id");

            notification([

                'text' => 't_subject_employer_freelancer_rejected_ur_project',

                'action' => url('/project', [$project->pid, $project->slug]),

                'user_id' => $project->client->id,

                'params' => [

                    'username' => $project->client->username,

                ],

            ]);

            // Success

            $this->notification([

                'title' => __('messages.t_success'),

                'description' => __('messages.t_freelancer_u_have_reject_this_project_success'),

                'icon' => 'success',

            ]);

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
     * Accept this project

     *

     * @param  string  $id
     * @return mixed
     */
    public function accept($id)
    {

        try {

            // Get project

            $project = Project::where('uid', $id)
                ->whereStatus('active')
                ->whereHas('awarded_bid', function ($query) {
                    return $query->whereUserId(auth()->id())
                        ->whereIsFreelancerAccepted(false)
                        ->whereStatus('active');

                })->firstOrFail();

            // Let's accept this project

            $project->status = 'under_development';

            $project->save();

            // Update awarded bid

            $project->awarded_bid->is_freelancer_accepted = true;

            $project->awarded_bid->freelancer_accepted_date = now();

            $project->awarded_bid->save();

            $settings = settings('projects');


            $milestone = new ProjectMilestone();

            $milestone->uid = uid();

            $milestone->project_id = $project->id;

            $milestone->created_by = 'freelancer';

            $milestone->freelancer_id = auth()->id();

            $milestone->employer_id = $project->user_id;

            $milestone->amount = $project->awarded_bid->amount;

            $milestone->employer_commission = convertToNumber($settings->commission_from_freelancer);

            $milestone->freelancer_commission = convertToNumber($settings->commission_from_publisher);

//            $milestone->description = clean($this->description);

            $milestone->status = 'request';

            $milestone->save();

            // Send a notification to the employer

            $project->client->notify(new FreelancerAcceptedYourProject($project, $project->awarded_bid));

            // Close modal

            $this->dispatch('close-modal', "modal-accept-project-container-$id");


            notification([

                'text' => 't_subject_employer_freelancer_accepted_ur_project',

                'action' => url('/account/projects/payments', [$project->uid]),

                'user_id' => $project->client->id,

                'params' => [ 'username' => $project->client->username],

            ]);

            // Success

            $this->notification([

                'title' => __('messages.t_success'),

                'description' => __('messages.t_freelancer_u_have_accepted_this_project_success'),

                'icon' => 'success',

            ]);


            // We have to redirect him to project overview section

            return redirect('seller/projects/milestones/'.$project->uid)->with('success', __('messages.t_awarded_projects_warning_msg'));

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
     * Check if user has any pending unblock requests for a specific project
     *
     * @param Project $project
     * @return bool
     */
    public function hasPendingUnblockRequest($project)
    {
        return UnblockMoneyRequest::where('freelancer_id', auth()->id())
            ->where('status', UnblockMoneyRequestStatus::PENDING)
            ->where('requestable_id', $project->id)
            ->where('requestable_type', get_class($project))
            ->exists();
    }

}
