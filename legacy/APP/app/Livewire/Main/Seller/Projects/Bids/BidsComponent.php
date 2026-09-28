<?php

namespace App\Livewire\Main\Seller\Projects\Bids;

use App\Models\ProjectBid;
use App\Models\ProjectBidUpgrade;
use App\Models\ProjectReportedBid;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class BidsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

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

        $title = __('messages.t_submitted_proposals')." $separator ".settings('general')->title;

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

        return view('livewire.main.seller.projects.bids.bids', [

            'bids' => $this->bids,

        ]);

    }

    /**
     * Get submitted bids

     *

     * @return object
     */
    public function getBidsProperty()
    {

        return ProjectBid::where('user_id', auth()->id())
            ->with(['project' => function ($query) {

                return $query->select('id', 'pid', 'slug', 'status', 'awarded_bid_id');

            }])
            ->latest()
            ->paginate(42);

    }

    /**
     * Confirm delete

     *

     * @param  string  $id
     * @return void
     */
    public function confirmDelete($id)
    {

        try {

            // Get bid

            $bid = ProjectBid::where('uid', $id)
                ->where('user_id', auth()->id())
                ->where('is_awarded', false)
                ->first();

            // Check bid exists

            if (! $bid) {

                // Not found

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_no_results_found'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Confirm dialog

            $this->dialog()->confirm([

                'title' => __('messages.t_confirm_delete'),

                'description' => "<div class='leading-relaxed'>".__('messages.t_are_u_sure_u_want_to_delete_this_proposal').'<br>'.__('messages.t_this_action_cannot_be_undone').'</div>',

                'icon' => 'error',

                'accept' => [

                    'label' => __('messages.t_delete'),

                    'method' => 'delete',

                    'params' => $bid->uid,

                ],

                'reject' => [

                    'label' => __('messages.t_cancel'),

                ],

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
     * Delete bid

     *

     * @param  string  $id
     * @return void
     */
    public function delete($id)
    {

        try {

            // Get bid

            $bid = ProjectBid::where('uid', $id)
                ->where('user_id', auth()->id())
                ->where('is_awarded', false)
                ->firstOrFail();

            // Delete all upgrades for this bid

            ProjectBidUpgrade::where('bid_id', $bid->id)->delete();

            // Delete reports on this bid

            ProjectReportedBid::where('bid_id', $bid->id)->delete();

            // Delete this bid

            $bid->delete();

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
