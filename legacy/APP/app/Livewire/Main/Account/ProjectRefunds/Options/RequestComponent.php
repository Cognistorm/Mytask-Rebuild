<?php

namespace App\Livewire\Main\Account\ProjectRefunds\Options;

use App\Enums\ProjectRefundStatus;
use App\Http\Validators\Main\Account\Refunds\RequestValidator;
use App\Models\Project;
use App\Models\ProjectRefund;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class RequestComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $project;

    public $reason;

    /**
     * Init component
     *
     *
     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get project
        $project = Project::where('uid', $id)
            ->where('user_id', auth()->id())
            ->where('status', 'pending_final_review')
            ->whereHas('awarded_bid', function ($query) {
                return $query->where('is_freelancer_accepted', true);
            })
            ->whereHas('milestones', function ($query) {
                return $query->whereIn('status', ['funded', 'paid']);
            })
            ->firstOrFail();

        $refund = ProjectRefund::where('project_id', $project->id)->where('client_id', auth()->id())->first();

        if ($refund) {
            return redirect('account/project-refunds/details/'.$refund->uid);
        }

        // Set project
        $this->project = $project;

    }

    /**
     * Render component
     *
     *
     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.buyer-app')]

    public function render()
    {

        // SEO
        $separator = settings('general')->separator;

        $title = __('messages.t_request_refund')." $separator ".settings('general')->title;

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

        return view('livewire.main.account.project-refunds.options.request');

    }

    /**
     * Request refund
     *
     *
     * @return mixed
     */
    public function request()
    {

        try {

            // Validate form
            RequestValidator::validate($this);

            // Create refund request
            $refund = new ProjectRefund;

            $refund->uid = uid();

            $refund->project_id = $this->project->id;

            $refund->freelancer_id = $this->project->awarded_freelancer_id;

            $refund->client_id = auth()->id();

            $refund->reason = clean($this->reason);

            $refund->status = ProjectRefundStatus::PENDING;

            $refund->save();

            // Send notification via web app
            notification([
                'text'    => 't_subject_freelancer_client_requested_project_refund',
                'action'  => url('seller/refunds/details/'.$refund->uid),
                'user_id' => $this->project->awarded_freelancer_id,
            ]);

            // Success
            $this->notification([
                'title'       => __('messages.t_success'),
                'description' => __('messages.t_ur_refund_request_has_been_sent'),
                'icon'        => 'success'
            ]);

            // Redirect to refund details
            return redirect('account/project-refunds/details/'.$refund->uid);

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
