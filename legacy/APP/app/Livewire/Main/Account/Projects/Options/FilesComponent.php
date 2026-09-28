<?php

namespace App\Livewire\Main\Account\Projects\Options;

use App\Http\Validators\Main\Seller\Orders\MessageValidator;
use App\Models\Project;
use App\Models\ProjectWorkDelivery;
use App\Models\ProjectWorkConversation;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class FilesComponent extends Component
{
    use SEOToolsTrait, LivewireAlert, Actions;

    public $project;
    public $workDeliveries;
    public $conversations;
    public $message;

    public function mount()
    {
        // Get project ID from request
        $projectId = request()->get('projectId');

        if (!$projectId) {
            return redirect('account/projects')->with('message', __('messages.t_project_not_found'));
        }
        $project = Project::where('uid', $projectId)
            ->where('user_id', auth()->id())
            ->whereHas('milestones', function ($query) {
                $query->whereIn('status', ['funded', 'paid']);
            })
            ->with(['freelancer', 'milestones'])
            ->firstOrFail();

        if (!in_array($project->status, ['pending_final_review', 'completed'])) {
            return redirect('account/projects')->with('message', __('messages.t_project_not_accessible'));
        }


        $workDeliveries = ProjectWorkDelivery::where('project_id', $project->id)
            ->with(['freelancer', 'milestone'])
            ->orderBy('created_at', 'desc')
            ->get();


        $conversations = ProjectWorkConversation::where('project_id', $project->id)
            ->with(['sender', 'freelancer', 'employer'])
            ->orderBy('created_at', 'asc')
            ->get();

        $this->project = $project;
        $this->workDeliveries = $workDeliveries;
        $this->conversations = $conversations;
    }

    #[Layout('components.layouts.buyer-app')]
    public function render()
    {
        // SEO
        $separator = settings('general')->separator;
        $title = __('messages.t_project_files') . " $separator " . settings('general')->title;
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
        $this->seo()->twitter()->setSite("@" . settings('seo')->twitter_username);
        $this->seo()->twitter()->setTitle($title);
        $this->seo()->twitter()->setDescription($description);
        $this->seo()->jsonLd()->setTitle($title);
        $this->seo()->jsonLd()->setDescription($description);
        $this->seo()->jsonLd()->setUrl(url()->current());
        $this->seo()->jsonLd()->setType('WebSite');

        return view('livewire.main.account.projects.options.files');
    }

    public function sendMessage()
    {
        try {
            if ($this->project->status === 'completed') {
                return;
            }

            MessageValidator::validate($this);
            $message = new ProjectWorkConversation();
            $message->project_id = $this->project->id;
            $message->freelancer_id = $this->project->awarded_freelancer_id;
            $message->employer_id = $this->project->user_id;
            $message->msg_from = auth()->id();
            $message->msg_content = clean($this->message);
            $message->save();

            // Reset form
            $this->reset('message');

            // Refresh conversations
            $this->conversations = ProjectWorkConversation::where('project_id', $this->project->id)
                ->with(['sender', 'freelancer', 'employer'])
                ->orderBy('created_at', 'asc')
                ->get();

            // Success
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params(__('messages.t_toast_operation_success'))
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
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

    public function downloadFile($workId)
    {
        try {
            $work = ProjectWorkDelivery::where('uid', $workId)
                ->where('project_id', $this->project->id)
                ->firstOrFail();
            if (!$work->attached_work) {
                $this->alert(
                    'error',
                    __('messages.t_error'),
                    livewire_alert_params(__('messages.t_no_file_attached'), 'error')
                );
                return;
            }

            $fileInfo = $work->attached_work;
            $filePath = public_path('storage/projects/delivered_work/' . $work->attached_work['id'] . '.' . $work->attached_work['extension']);
            if (!file_exists($filePath)) {
                $this->alert(
                    'error',
                    __('messages.t_error'),
                    livewire_alert_params(__('messages.t_file_not_found'), 'error')
                );
                return;
            }
            $downloadUrl = route('project_delivered.download', ['projectId' => $this->project->uid, 'workId' => $work->uid, 'fileId' => $fileInfo['id']]);
            return redirect($downloadUrl);

        } catch (\Throwable $th) {
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')
            );
        }
    }
}
