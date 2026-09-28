<?php

namespace App\Livewire\Main\Cards;

use App\Http\Validators\Main\Bid\ReportValidator;
use App\Models\Admin;
use App\Models\Notification;
use App\Models\ProjectBid;
use App\Models\ProjectReportedBid;
use App\Notifications\Admin\BidReported;
use App\Notifications\User\Freelancer\ProjectAwarded;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class Bid extends Component
{
    use Actions, LivewireAlert;

    public $bid_id;

    private $freelancer;

    protected $bid;

    protected $project;

    public $view_data = [];

    // Report form

    public $report_reason;

    public $report_description;

    /**
     * Initialize component

     *

     * @param  string  $bid_id
     * @return void
     */
    public function mount($bid_id)
    {

        // Get bid

        $bid = ProjectBid::whereUid($bid_id)->whereStatus('active')->firstOrFail();

        // Get user

        $freelancer = $bid->user;

        // Get project

        $project = $bid->project;

        // Set Bid

        $this->bid = $bid;

        // Set freelancer

        $this->freelancer = $freelancer;

        // Set project

        $this->project = $project;

        // Set bid id

        $this->bid_id = $bid_id;

        // Check if current visitor/user can see the is bid's details

        $can_view = $this->canView();

        // Let's chat if employer can chat with this user

        if ($this->project->awarded_bid) {

            if ($freelancer->id === $this->project->awarded_freelancer_id) {

                $chat = true;

            } else {

                $chat = false;

            }

        } else {

            $chat = true;

        }

        // Set freelancer for the view

        $this->view_data['freelancer'] = [

            'id' => $freelancer->id,

            'username' => $freelancer->username,

            'fullname' => $freelancer->fullname,

            'avatar' => src($freelancer->avatar),

            'country' => $freelancer->country ? ['name' => $freelancer->country->name, 'code' => $freelancer->country->code] : null,

            'rating' => $freelancer->rating(),

            'verified' => $freelancer->status === 'verified' ? true : false,

            'chat' => $chat,

        ];

        // Set bid for the view

        $this->view_data['bid'] = [

            'id' => $bid->uid,

            'is_highlight' => $bid->is_highlight,

            'is_sponsored' => $bid->is_sponsored,

            'is_sealed' => $bid->is_sealed,

            'is_awarded' => $bid->is_awarded,

            'amount' => $can_view ? $bid->amount : null,

            'days' => $can_view ? $bid->days : null,

            'message' => $can_view ? $bid->message : null,

            'date' => $bid->created_at,

        ];

        // Set project for the view

        $this->view_data['project'] = [

            'id' => $project->uid,

            'employer_id' => $project->client->uid,

            'status' => $project->status,

            'awarded' => $project->awarded_bid,

        ];

    }

    /**
     * Render component

     *

     * @return void
     */
    #[Layout('components.layouts.main-app')]

    public function render()
    {

        return view('livewire.main.cards.bid');

    }

    /**
     * Verify if current user can see this bid if its sealed

     *

     * @return bool
     */
    private function canView()
    {

        // If bid is not sealed, anyone can view it

        if (! $this->bid->is_sealed) {

            return true;

        }

        // Check if admin authenticated

        if (auth('admin')->check()) {

            // Can view it

            return true;

        } elseif (auth()->check() && (auth()->id() == $this->project->user_id || auth()->id() == $this->freelancer->id)) {

            // Can view it

            return true;

        } else {

            // Cannot see it

            return false;

        }

    }

    /**
     * Update current bid

     *

     * @return void
     */
    public function updateBid()
    {

        // Get the bid

        $bid = ProjectBid::whereUid($this->bid_id)->whereStatus('active')->firstOrFail();

        // Set the bid

        $this->bid = $bid;

        // Set freelancer

        $this->freelancer = $bid->user;

        // Set project

        $this->project = $bid->project;

        // Check if current visitor/user can see the is bid's details

        $can_view = $this->canView();

        // Set bid for the view

        $this->view_data['bid'] = [

            'id' => $bid->uid,

            'is_highlight' => $bid->is_highlight,

            'is_sponsored' => $bid->is_sponsored,

            'is_sealed' => $bid->is_sealed,

            'is_awarded' => $bid->is_awarded,

            'amount' => $can_view ? $bid->amount : null,

            'days' => $can_view ? $bid->days : null,

            'message' => $can_view ? $bid->message : null,

            'date' => $bid->created_at,

        ];

        $this->render();

    }

    /**
     * Report bid

     *

     * @return mixed
     */
    public function report()
    {

        try {

            // Get bid

            $bid = ProjectBid::whereUid($this->bid_id)->whereStatus('active')->firstOrFail();

            // First user must be authenticated to report this bid

            if (! auth()->check()) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_pls_login_or_register_report_bid'),

                    'icon' => 'error',

                ]);

                return;

            }

            // So user is online, but we can't let him report his own bids

            // In frontend we don't allow that, but we have to be sure in backend as well

            if (auth()->id() == $bid->user->id) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_u_cannot_report_ur_own_bids'),

                    'icon' => 'error',

                ]);

                return;

            }

            // User is able to report this bid, but what if he already did that

            $already_reported = ProjectReportedBid::whereUserId(auth()->id())
                ->whereBidId($bid->id)
                ->whereIsSeen(false)
                ->first();

            // Let's check that

            if ($already_reported) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_u_already_reported_this_bid'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Validate form

            ReportValidator::validate($this);

            // Create new report

            $report = new ProjectReportedBid;

            $report->uid = uid();

            $report->bid_id = $bid->id;

            $report->user_id = auth()->id();

            $report->reason = $this->report_reason;

            $report->description = clean($this->report_description);

            $report->save();

            // Let's reset the report form

            $this->reset(['report_reason', 'report_description']);

            // Now let's send a notification to admin

            Admin::first()->notify(new BidReported($bid->project, $report));

            // Close the modal

            $this->dispatch('close-modal', 'modal-report-bid-container-'.$bid->uid);

            // Success

            $this->notification([

                'title' => __('messages.t_tnx_for_the_feedback'),

                'description' => __('messages.t_we_have_received_bid_report_success'),

                'icon' => 'success',

            ]);

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

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

            throw $th;
        }

    }

    public function checkBid() {
        $this->dialog()->confirm([

            'title' => '<h1 class="text-base font-bold tracking-wide">' . __('messages.t_bid_confirmation') . '</h1>',

            'description' => __('messages.t_are_you_sure_accept_bid'),

            'icon' => 'shield-check',

            'iconColor' => 'text-slate-500 dark:text-secondary-400 p-1',

            'iconBackground' => 'bg-slate-100 rounded-full p-3 dark:bg-secondary-700',

            'accept' => [

                'label' => __('messages.t_confirm'),

                'method' => 'accept',

                'color' => 'secondary',

            ],

            'reject' => [

                'label' => __('messages.t_cancel'),

            ],

        ]);
    }

    /**
     * Accept offer

     *

     * @return mixed
     */
    public function accept()
    {

        try {

            // Check if user authenticated

            if (! auth()->check()) {

                return;

            }

            // Get bid

            $bid = ProjectBid::whereUid($this->bid_id)->with(['project', 'user'])->firstOrFail();

            // Get project

            $project = $bid->project;

            // Get current user id

            $user_id = auth()->id();

            // This user must have permissions to accept this offer first

            if ($project->user_id != $user_id) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_u_dont_have_permissions_to_do_action'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Check employer already awarded this project to a freelancer

            // And this freelancer accepted to work on it

            if ($project->awarded_bid_id != $bid->id && $bid->is_freelancer_accepted) {

                // Looks like you already awarded this project to another freelancer

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_looks_like_u_already_awarded_project_other'),

                    'icon' => 'error',

                ]);

                return;

            }

            // After that, we have to check if this bid is active

            if ($bid->status !== 'active') {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_this_bid_is_not_active_yet'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Now the project must be open

            if ($project->status !== 'active') {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_project_is_not_open_for_bid'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Get awarded bid

            $awarded_bid = ProjectBid::where('project_id', $project->id)
                ->where('is_awarded', true)
                ->where('id', '!=', $bid->id)
                ->first();

            // Check if an awarded bid already exists

            if ($awarded_bid) {

                // Update this awarded bid

                $awarded_bid->is_awarded = false;

                $awarded_bid->is_freelancer_accepted = false;

                $awarded_bid->awarded_date = null;

                $awarded_bid->save();

                // Delete notifications for the old awarded bid
                $this->deleteAwardNotifications($awarded_bid->user_id);

                // Update awarded bid card with more information
                // Include both the old awarded bid UID and the new bid UID
                $this->dispatch('update-awarded-bid-card', [
                    'old_awarded_bid_uid' => $awarded_bid->uid,
                    'new_awarded_bid_uid' => $bid->uid,
                ]);

            }

            // Update this bid's status

            $bid->is_awarded = true;

            $bid->awarded_date = now();

            $bid->save();

            // Update project

            $project->awarded_bid_id = $bid->id;

            $project->awarded_freelancer_id = $bid->user_id;

            $project->save();

            // Send notification to the freelancer (From website)

            notification([

                'text' => 't_congratulations_employer_awarded_u_their_project_title',

                'action' => url('seller/projects'),

                'user_id' => $bid->user_id,

                'params' => ['username' => $project->client->username, 'title' => $project->title],

            ]);

            // Send notification to the freelancer (By email)

            $bid->user->notify((new ProjectAwarded($bid, $project))->locale(config('app.locale')));

            // Update bid in the card

            $this->view_data['bid']['is_awarded'] = true;

            // Success

            $this->notification([

                'title' => __('messages.t_success'),

                'description' => __('messages.t_u_have_accepted_this_bid_success'),

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
     * Delete award notifications for a user
     *
     * @param int $user_id
     * @return void
     */
    private function deleteAwardNotifications($user_id)
    {
        Notification::where('user_id', $user_id)
            ->where('text', 't_congratulations_employer_awarded_u_their_project_title')
            ->delete();
    }

    /**
     * Revoke offer

     *

     * @return mixed
     */
    public function revoke()
    {

        try {

            // Check if user authenticated

            if (! auth()->check()) {

                return;

            }

            // Get bid

            $bid = ProjectBid::whereUid($this->bid_id)->firstOrFail();

            // Delete award notifications
            $this->deleteAwardNotifications($bid->user_id);

            // Get project

            $project = $bid->project;

            // Get current user id

            $user_id = auth()->id();

            // This user must have permissions to accept this offer first

            if ($project->user_id != $user_id) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_u_dont_have_permissions_to_do_action'),

                    'icon' => 'error',

                ]);

                return;

            }

            // After that, we have to check if this bid is active

            if ($bid->status !== 'active') {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_this_bid_is_not_active_yet'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Now the project must be open

            if ($project->status !== 'active') {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_project_is_not_open_for_bid'),

                    'icon' => 'error',

                ]);

                return;

            }

            // This bid must be awarded so you can revoke it

            if (! $bid->is_awarded) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_this_bid_is_not_awarded_to_revoke_it'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Update this bid's status

            $bid->is_awarded = false;

            $bid->save();

            $project->awarded_bid_id = null;

            $project->awarded_freelancer_id = null;

            $project->save();

            // Update bid in the card

            $this->view_data['bid']['is_awarded'] = false;

            // Success

            $this->notification([

                'title' => __('messages.t_success'),

                'description' => __('messages.t_u_have_success_revoked_this_bid'),

                'icon' => 'success',

            ]);

        } catch (\Throwable $th) {

            throw $th;
        }

    }

}
