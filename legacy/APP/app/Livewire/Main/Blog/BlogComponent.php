<?php

namespace App\Livewire\Main\Blog;

use App\Mail\User\Everyone\NewsletterVerification as EveryoneNewsletterVerification;
use App\Models\Article;
use App\Models\NewsletterList;
use App\Models\NewsletterVerification;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Mail;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class BlogComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    public $email;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Check if blog system enabled

        if (! settings('blog')->enable_blog) {

            return redirect('/');

        }

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.main-app')]

    public function render()
    {

        // SEO

        $separator = settings('general')->separator;

        $title = __('messages.t_blog')." $separator ".settings('general')->title;

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

        return view('livewire.main.blog.blog', [

            'articles' => $this->articles,

        ]);

    }

    /**
     * Get articles

     *

     * @return object
     */
    public function getArticlesProperty()
    {

        return Article::withTranslation()->with('image')->latest()->paginate(20);

    }

    /**
     * Subscribe to newseletter
     */
    public function subscribe(): void
    {

        try {

            // Clean this email address

            $email_address = clean($this->email);

            // Check if newsletter enabled

            if (! settings('newsletter')->is_enabled) {

                return;

            }

            // Validate email address

            if (! filter_var($email_address, FILTER_VALIDATE_EMAIL)) {

                // Error

                $this->alert(

                    'error',

                    __('messages.t_error'),

                    livewire_alert_params(__('messages.t_pls_enter_valid_email_address'), 'error')

                );

                return;

            }

            // Get email in list

            $email = NewsletterList::where('email', $email_address)->first();

            // Check if email exists

            if ($email) {

                // Check if email already verified

                if ($email->status === 'verified') {

                    // Reset form

                    $this->reset('email');

                    // Success

                    $this->alert(

                        'success',

                        __('messages.t_success'),

                        livewire_alert_params(__('messages.t_u_have_success_subscribed_to_newsletter'))

                    );

                    // Return

                    return;

                } else {

                    // Delete old verifications

                    NewsletterVerification::where('list_id', $email->id)->delete();

                    // Generate verification token

                    $token = uid(60);

                    // Generate verification

                    $verification = new NewsletterVerification;

                    $verification->list_id = $email->id;

                    $verification->token = $token;

                    $verification->save();

                    // Send verification token

                    Mail::to($email_address)->send(new EveryoneNewsletterVerification($token));

                    // Reset form

                    $this->reset('email');

                    // Success

                    $this->alert(

                        'success',

                        __('messages.t_success'),

                        livewire_alert_params(__('messages.t_we_sent_verification_link_newsletter'))

                    );

                }

            } else {

                // Add email to list

                $list = new NewsletterList;

                $list->uid = uid();

                $list->email = $email_address;

                $list->ip_address = request()->ip();

                $list->save();

                // Email not found, generate verification token

                $token = uid(60);

                // Generate verification

                $verification = new NewsletterVerification;

                $verification->list_id = $list->id;

                $verification->token = $token;

                $verification->save();

                // Send verification token

                Mail::to($email_address)->send(new EveryoneNewsletterVerification($token));

                // Reset form

                $this->reset('email');

                // Success

                $this->alert(

                    'success',

                    __('messages.t_success'),

                    livewire_alert_params(__('messages.t_we_sent_verification_link_newsletter'))

                );

            }

        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

        }

    }

}
