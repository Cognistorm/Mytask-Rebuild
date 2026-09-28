<?php

namespace App\Livewire\Main\Seller\Reviews;

use App\Models\Review;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class ReviewsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

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

        $title = __('messages.t_reviews')." $separator ".settings('general')->title;

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

        return view('livewire.main.seller.reviews.reviews', [

            'reviews' => $this->reviews,

        ]);

    }

    /**
     * Get reviews history

     *

     * @return object
     */
    public function getReviewsProperty()
    {

        // Get reviews

        return Review::where('seller_id', auth()->id())
            ->whereHas('gig')
            ->whereHas('user')
            ->latest()
            ->paginate(42);

    }

    /**
     * Get review details

     *

     * @param  string  $id
     * @return void
     */
    public function details($id)
    {

        try {

            // Get review

            $review = Review::where('uid', $id)->where('seller_id', auth()->id())->firstOrFail();

            // Show modal

            $this->dialog()->show([

                'title' => __('messages.t_review_details'),

                'description' => "<div class='leading-relaxed text-sm'>".$review->message.'</div>',

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

}
