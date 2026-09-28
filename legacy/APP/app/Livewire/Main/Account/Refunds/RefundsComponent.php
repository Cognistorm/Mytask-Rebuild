<?php

namespace App\Livewire\Main\Account\Refunds;

use App\Models\Refund;
use App\Models\ProjectRefund;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class RefundsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

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

        $title = __('messages.t_refunds')." $separator ".settings('general')->title;

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

        return view('livewire.main.account.refunds.refunds', [

            'refunds' => $this->refunds,

        ]);

    }

    /**
     * Get buyer refunds

     *

     * @return object
     */
    public function getRefundsProperty()
    {
        // Get gig refunds
        $gigRefunds = Refund::where('buyer_id', auth()->id())
            ->with(['item.gig', 'seller'])
            ->get()
            ->map(function ($refund) {
                $refund->refund_type = 'gig';
                return $refund;
            });

        // Get project refunds
        $projectRefunds = ProjectRefund::where('client_id', auth()->id())
            ->with(['project', 'freelancer'])
            ->get()
            ->map(function ($refund) {
                $refund->refund_type = 'project';
                return $refund;
            });

        // Combine and sort by created_at
        $allRefunds = $gigRefunds->concat($projectRefunds)
            ->sortByDesc('created_at')
            ->values();

        // Manual pagination
        $perPage = 42;
        $currentPage = request()->get('page', 1);
        $offset = ($currentPage - 1) * $perPage;

        $paginatedItems = $allRefunds->slice($offset, $perPage);

        return new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedItems,
            $allRefunds->count(),
            $perPage,
            $currentPage,
            ['path' => request()->url(), 'pageName' => 'page']
        );

    }

}
