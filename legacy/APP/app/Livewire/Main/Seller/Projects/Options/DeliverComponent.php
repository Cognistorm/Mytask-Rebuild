<?php

namespace App\Livewire\Main\Seller\Projects\Options;

use App\Enums\ProjectWorkDeliveryStatus;
use App\Http\Validators\Main\Seller\Orders\DeliverValidator;
use App\Http\Validators\Main\Seller\Orders\MessageValidator;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\ProjectWorkDelivery;
use App\Models\ProjectWorkConversation;
use App\Notifications\User\Employer\ProjectCompleted;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\File;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use URL;
use WireUi\Traits\Actions;

class DeliverComponent extends Component
{
    use WithFileUploads, SEOToolsTrait, LivewireAlert, Actions;

    public $project;
    public $milestone;
    public $work;
    public $quick_response;
    public $message;
    public $existingWork;
    public $conversations;

    /**
     * Initialize component
     *
     * @param string $id
     * @return void
     */
    public function mount($id, $milestone_id = null)
    {
        // Get project
        $project = Project::where('uid', $id)
                         ->where('awarded_freelancer_id', auth()->id())
                         ->firstOrFail();
        // Get milestone if provided
        $milestone = null;
        if ($milestone_id) {
            $milestone = ProjectMilestone::where('uid', $milestone_id)
                                       ->where('project_id', $project->id)
                                       ->where('freelancer_id', auth()->id())
                                       ->firstOrFail();
        }

        // Check if project is in correct status
        if (!in_array($project->status, [ 'pending_final_review', 'completed'])) {
            return redirect('seller/projects')->with('message', __('messages.t_u_cant_send_delivered_work_anymore_status_wrong'));
        }

        // Set project and milestone
        $this->project = $project;
        $this->milestone = $milestone;

        // Check for existing work delivery
        $existingWork = ProjectWorkDelivery::where('project_id', $project->id)
                                         ->where('freelancer_id', auth()->id());

        if ($milestone) {
            $existingWork->where('milestone_id', $milestone->id);
        }

        $this->existingWork = $existingWork->first();

        // If existing work found, populate form fields
        if ($this->existingWork) {
            $this->quick_response = $this->existingWork->quick_response;
        }
        // Get conversations for this project
        $this->conversations = ProjectWorkConversation::where('project_id', $project->id)
                                                    ->with(['sender', 'freelancer', 'employer'])
                                                    ->orderBy('created_at', 'asc')
                                                    ->get();
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
        $separator   = settings('general')->separator;
        $title       = __('messages.t_deliver_completed_work') . " $separator " . settings('general')->title;
        $description = settings('seo')->description;
        $ogimage     = src( settings('seo')->ogimage );

        $this->seo()->setTitle( $title );
        $this->seo()->setDescription( $description );
        $this->seo()->setCanonical( url()->current() );
        $this->seo()->opengraph()->setTitle( $title );
        $this->seo()->opengraph()->setDescription( $description );
        $this->seo()->opengraph()->setUrl( url()->current() );
        $this->seo()->opengraph()->setType('website');
        $this->seo()->opengraph()->addImage( $ogimage );
        $this->seo()->twitter()->setImage( $ogimage );
        $this->seo()->twitter()->setUrl( url()->current() );
        $this->seo()->twitter()->setSite( "@" . settings('seo')->twitter_username );
        $this->seo()->twitter()->setTitle( $title );
        $this->seo()->twitter()->setDescription( $description );
        $this->seo()->jsonLd()->setTitle( $title );
        $this->seo()->jsonLd()->setDescription( $description );
        $this->seo()->jsonLd()->setUrl( url()->current() );
        $this->seo()->jsonLd()->setType('WebSite');
        return view('livewire.main.seller.projects.options.deliver');
    }

    /**
     * Submit completed work to the employer
     *
     * @return mixed
     */
    public function submit()
    {
        try {
            $oldFileToDelete = null;
            if ($this->existingWork && $this->existingWork->attached_work && $this->work) {
                $oldFileToDelete = $this->existingWork->attached_work;
            }

            // Validate form
            DeliverValidator::validate($this);

            // Check if request has files
            if ($this->work) {
                // Generate a unique name for this file
                $id        = uid(45);

                // Get file extension
                $extension = $this->work->extension();

                // Get file mime type
                $mime      = $this->work->getMimeType();

                // Get file size
                $size      = $this->work->getSize();

                // Move this file to local storage
                $this->work->storeAs('projects/delivered_work', "$id.$extension", $disk = 'custom');

                // Set file data
                $file = [
                    'id'        => $id,
                    'extension' => $extension,
                    'mime'      => $mime,
                    'size'      => $size
                ];
            } else {
                // No files selected
                $file = null;
            }

            // Save or update work
            if ($this->existingWork) {
                // Update existing work
                $work = $this->existingWork;
                $work->attached_work = $file ?: $work->attached_work; // Keep existing file if no new file uploaded
                $work->quick_response = $this->quick_response ? clean($this->quick_response) : null;
                $work->status = ProjectWorkDeliveryStatus::DELIVERED;
                $work->delivered_at = now();
                $work->save();
            } else {
                // Create new work
                $work = new ProjectWorkDelivery();
                $work->uid = uid();
                $work->project_id = $this->project->id;
                $work->milestone_id = $this->milestone ? $this->milestone->id : null;
                $work->freelancer_id = auth()->id();
                $work->attached_work = $file;
                $work->quick_response = $this->quick_response ? clean($this->quick_response) : null;
                $work->status = ProjectWorkDeliveryStatus::DELIVERED;
                $work->delivered_at = now();
                $work->save();
            }

            // Delete old file if it was replaced
            if ($oldFileToDelete) {
                $oldFilePath = public_path('storage/projects/delivered_work/' . $oldFileToDelete['id'] . '.' . $oldFileToDelete['extension']);
                if (file_exists($oldFilePath)) {
                    unlink($oldFilePath);
                }
            }

            // Update project status if needed
            if ($this->milestone) {
                // Update milestone status
                $this->milestone->status = 'delivered';
                $this->milestone->save();
            } else {
                // Update project status
                $this->project->status = 'pending_final_review';
                $this->project->save();
            }

            // Refresh project
            $this->project->refresh();

            // Send notification to client (project owner)
            $this->project->client->notify( (new ProjectCompleted($this->project))->locale(config('app.locale')) );

            // Send notification
            notification([
                'text'    => 't_freelancer_has_delivered_project_work',
                'action'  => url('account/projects/files?projectId=' . $this->project->uid),
                'user_id' => $this->project->user_id,
                'params'  => ['freelancer' => auth()->user()->username]
            ]);

            // Reset form
            $this->reset(['work', 'quick_response']);

            // Refresh existing work and project
            $this->existingWork = ProjectWorkDelivery::where('project_id', $this->project->id)
                                                   ->where('freelancer_id', auth()->id())
                                                   ->when($this->milestone, function($query) {
                                                       return $query->where('milestone_id', $this->milestone->id);
                                                   })
                                                   ->first();

            // Success
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params( __('messages.t_toast_operation_success') )
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {
            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;
        }
    }

    /**
     * Re-submit work again
     *
     * @return mixed
     */
    public function resubmit()
    {
        try {
            // Check if project has delivered work
            if ($this->existingWork) {
                // Check if work has files
                if ($this->existingWork->attached_work) {
                    // Get file path
                    $filePath = public_path('storage/projects/delivered_work/' . $this->existingWork->attached_work['id'] . '.' . $this->existingWork->attached_work['extension']);

                    // Check if file exists and delete it
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }

                // Delete the work record
                $this->existingWork->delete();

                // Reset existing work
                $this->existingWork = null;

                // Reset form fields
                $this->reset(['work', 'quick_response']);

                // Refresh project
                $this->project->refresh();

                // Success
                $this->alert(
                    'success',
                    __('messages.t_success'),
                    livewire_alert_params( __('messages.t_toast_operation_success') )
                );
            }

        } catch (\Throwable $th) {
            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;
        }
    }

    /**
     * Send message
     *
     * @return mixed
     */
    public function sendMessage()
    {
        try {
            // Check if project is not finished yet
            if ($this->project->status === ProjectWorkDeliveryStatus::COMPLETED->value) {
                return;
            }

            // Validate form
            MessageValidator::validate($this);

            // Save message
            $message              = new ProjectWorkConversation();
            $message->project_id  = $this->project->id;
            $message->freelancer_id = $this->project->awarded_freelancer_id;
            $message->employer_id = $this->project->user_id;
            $message->msg_from    = auth()->id();
            $message->msg_content = clean($this->message);
            $message->save();

            // Reset form
            $this->reset('message');

            // Refresh conversations
            $this->conversations = ProjectWorkConversation::where('project_id', $this->project->id)
                                                        ->with(['sender', 'freelancer', 'employer'])
                                                        ->orderBy('created_at', 'asc')
                                                        ->get();

            // Refresh project
            $this->project->refresh();

            // Success
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params( __('messages.t_toast_operation_success') )
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {
            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;
        }
    }
}
