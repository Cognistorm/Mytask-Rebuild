<?php

namespace App\Livewire\Main\Account\Projects;

use App\Enums\ProjectWorkDeliveryStatus;
use App\Models\Project;
use App\Models\ProjectBid;
use App\Models\ProjectBidUpgrade;
use App\Models\ProjectMilestone;
use App\Models\ProjectReportedBid;
use App\Models\ProjectRequiredSkill;
use App\Models\ProjectSubscription;
use App\Models\ProjectVisit;
use App\Models\ReportedProject;
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

    /**
     * Initialize component

     *

     * @return mixed
     */
    public function mount()
    {

        // Check if this section enabled

        if (! settings('projects')->is_enabled) {

            // Redirect to home page

            return redirect('/');

        }

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.buyer-app')]

    public function render()
    {

        // SEO

        $separator = settings('general')->separator;

        $title = __('messages.t_my_projects')." $separator ".settings('general')->title;

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

        return view('livewire.main.account.projects.projects', [

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

        return Project::where('user_id', auth()->id())
            ->withCount('bids')
            ->with(['subscriptions' => function ($query) {

                return $query->where('status', 'pending')->latest()->first();

            }, 'workDeliveries' => function ($query) {
                return $query->where('status', ProjectWorkDeliveryStatus::DELIVERED);
            }])
            ->latest()
            ->paginate(42);

    }

    /**
     * Confirm deleting project

     *

     * @param  string  $id
     * @return mixed
     */
    public function confirmDelete($id)
    {

        // Get project

        $project = Project::where('uid', $id)
            ->where('user_id', auth()->id())
            ->whereIn('status', ['pending_approval', 'pending_payment', 'active', 'rejected', 'hidden'])
            ->firstOrFail();

        // Confirm delete

        $this->dialog()->confirm([

            'title' => __('messages.t_confirm_delete'),

            'description' => "<div class='leading-relaxed'>".__('messages.t_are_u_sure_u_want_to_delete_this_project')."<br><div class='font-semibold'>".$project->title.'</div>'.__('messages.t_all_records_related_to_project_will_erased').'</div>',

            'icon' => 'error',

            'accept' => [

                'label' => __('messages.t_delete'),

                'method' => 'delete',

                'params' => $project->uid,

            ],

            'reject' => [

                'label' => __('messages.t_cancel'),

            ],

        ]);

    }

    /**
     * Delete project

     *

     * @param  string  $id
     * @return mixed
     */
    public function delete($id)
    {

        try {

            // Get project

            $project = Project::where('uid', $id)
                ->where('user_id', auth()->id())
                ->whereIn('status', ['pending_approval', 'pending_payment', 'active', 'rejected', 'hidden'])
                ->firstOrFail();

            // Disable foreign key check

            Schema::disableForeignKeyConstraints();

            // Get bids

            $bids = ProjectBid::where('project_id', $project->id)->get();

            // Loop through bids

            foreach ($bids as $bid) {

                // Delete upgrades for this bid

                ProjectBidUpgrade::where('bid_id', $bid->id)->delete();

                // Delete reported bid

                ProjectReportedBid::where('bid_id', $bid->id)->delete();

                // Delete bid

                $bid->delete();

            }

            // Delete milestone payments

            ProjectMilestone::where('project_id', $project->id)->delete();

            // Delete required skills

            ProjectRequiredSkill::where('project_id', $project->id)->delete();

            // Delete subscription

            ProjectSubscription::where('project_id', $project->id)->delete();

            // Delete visits stats

            ProjectVisit::where('project_id', $project->id)->delete();

            // Delete reports on this project

            ReportedProject::where('project_id', $project->id)->delete();

            // Delete project

            $project->delete();

            // Enable foreign key check

            Schema::enableForeignKeyConstraints();

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

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

        }

    }

}
