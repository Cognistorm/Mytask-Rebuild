<?php

namespace App\Livewire\Admin\Reviews;

use App\Models\Gig;
use App\Models\Review;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class ReviewsComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_reviews'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.reviews.reviews', [

            'reviews' => $this->reviews,

        ]);

    }

    /**
     * Get list of reviews

     *

     * @return object
     */
    public function getReviewsProperty()
    {

        return Review::latest()->paginate(42);

    }

    /**
     * Delete selected review

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        // Get review

        $review = Review::where('id', $id)->firstOrFail();

        // Calculate total stars

        $total_stars = Review::where('gig_id', $review->gig_id)->where('id', '!=', $review->id)->sum('rating');

        // Calculate total reviews

        $total_reviews = Review::where('gig_id', $review->gig_id)->where('id', '!=', $review->id)->count();

        // Calculate rating

        $rating = $total_reviews === 0 ? 0 : $total_stars / $total_reviews;

        // Update gig reviews

        Gig::where('id', $review->gig_id)->update([

            'rating' => $rating,

            'counter_reviews' => $total_reviews,

        ]);

        // Now we can delete review

        $review->delete();

    }

}
