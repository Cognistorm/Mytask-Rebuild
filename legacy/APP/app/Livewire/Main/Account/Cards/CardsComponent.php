<?php

namespace App\Livewire\Main\Account\Cards;

use App\Models\UserPaymentMethod;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class CardsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    /**
     * Render component
     *
     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.main-app')]
    public function render()
    {
        $separator = settings('general')->separator;
        $title = __('messages.t_payment_methods') . " $separator " . settings('general')->title;
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
        $this->seo()->twitter()->setSite('@' . settings('seo')->twitter_username);
        $this->seo()->twitter()->addValue('card', 'summary_large_image');
        $this->seo()->metatags()->addMeta('fb:page_id', settings('seo')->facebook_page_id, 'property');
        $this->seo()->metatags()->addMeta('fb:app_id', settings('seo')->facebook_app_id, 'property');
        $this->seo()->metatags()->addMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', 'name');
        $this->seo()->jsonLd()->setTitle($title);
        $this->seo()->jsonLd()->setDescription($description);
        $this->seo()->jsonLd()->setUrl(url()->current());
        $this->seo()->jsonLd()->setType('WebSite');

        // Get user payment methods
        $paymentMethods = UserPaymentMethod::where('user_id', auth()->id())
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();


        return view('livewire.main.account.cards.cards', [
            'paymentMethods' => $paymentMethods
        ]);
    }

    /**
     * Delete payment method
     *
     * @param int $id
     * @return void
     */
    public function deletePaymentMethod($id)
    {
        try {
            UserPaymentMethod::where('id', $id)
                ->where('user_id', auth()->id())
                ->delete();

            // Close the modal
            $this->dispatch('close-modal', 'modal-delete-payment-method-container-' . $id);

            // Show success message
            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_payment_method_deleted'),
                'icon' => 'success'
            ]);

        } catch (\Exception $e) {
            // Show error message
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_toast_something_went_wrong'),
                'icon' => 'error'
            ]);
        }
    }
}
