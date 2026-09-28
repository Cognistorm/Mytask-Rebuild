<?php

namespace App\Livewire\Main\Account\ProjectRefunds\Options;

use App\Models\ProjectRefund;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class DetailsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $refund;

    /**
     * Init component
     *
     *
     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get refund
        $refund = ProjectRefund::where('uid', $id)
            ->where('client_id', auth()->id())
            ->with(['project', 'freelancer'])
            ->firstOrFail();
        // Set refund
        $this->refund = $refund;

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

        $title = __('messages.t_refund_details')." $separator ".settings('general')->title;

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

        return view('livewire.main.account.project-refunds.options.details');

    }

    // Conversation messages removed

    /**
     * Raise dispute
     *
     * @return void
     */
    public function raise()
    {
        try {
            if ($this->refund->status !== \App\Enums\ProjectRefundStatus::REJECTED_BY_SELLER || $this->refund->request_admin_intervention) {
                return;
            }


            $this->refund->update([
                'request_admin_intervention' => true,
            ]);

            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_raise_dispute_request_received_success'),
                'icon' => 'success',
            ]);

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

}
