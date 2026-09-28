<?php

namespace App\Livewire\Main\Home;

use App\Mail\User\Everyone\NewsletterVerification as EveryoneNewsletterVerification;
use App\Models\Category;
use App\Models\Gig;
use App\Models\NewsletterList;
use App\Models\NewsletterVerification;
use App\Models\Project;
use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Mail;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class HomeComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $email;

    /**
     * Init component
     *
     * @return void
     */
    public function mount()
    {
        // Check if app installed
        if (! isInstalled()) {
            return redirect('install');
        }
    }

    /**
     * Render component
     *
     * @return \Illuminate\Contracts\Foundation\Application|\Illuminate\Contracts\View\Factory|\Illuminate\Contracts\View\View|\Illuminate\Foundation\Application
     */
    #[Layout('components.layouts.main-app')]
    public function render()
    {
        // SEO
        $separator = settings('general')->separator;
        $title = settings('general')->title." $separator ".settings('general')->subtitle;
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
        $this->seo()->metatags()->addMeta(
            'robots',
            'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
            'name'
        );
        $this->seo()->jsonLd()->setTitle($title);
        $this->seo()->jsonLd()->setDescription($description);
        $this->seo()->jsonLd()->setUrl(url()->current());
        $this->seo()->jsonLd()->setType('WebSite');

        return view('livewire.main.home.home', [
            'categories' => $this->categories,
            'sellers' => $this->sellers,
            'gigs' => $this->gigs,
            'projects' => $this->projects,
        ]);
    }

    public function getGigsProperty(): \Illuminate\Support\Collection
    {
        $base = Gig::active()
            ->with(['translations', 'thumbnail', 'owner.avatar'])
            ->withExists('favoritesByUser')
            ->when(app()->getLocale() === 'en', fn($query) => $query->withEnglishTranslation());

        $subscribed = (clone $base)
            ->whereHas('owner.subscriptions')
            ->inRandomOrder()
            ->take(4)
            ->get();

        if ($subscribed->count() >= 4) {
            return $subscribed;
        }

        $needed = 4 - $subscribed->count();

        $others = (clone $base)
            ->whereDoesntHave('owner.subscriptions')
            ->inRandomOrder()
            ->take($needed)
            ->get();

        return $subscribed->concat($others);
    }

    public function getCategoriesProperty(): Collection
    {
        return Category::query()
            ->with([
                'translations',
                'image',
                'gigs' => fn ($query) => $query->with([
                    'thumbnail',
                    'owner' => ['avatar'],
                ])->without('translations')
                    ->active()
                    ->when(app()->getLocale() === 'en', fn ($query) => $query->withEnglishTranslation())
                    ->when(auth()->check(), fn ($query) => $query->withExists('favoritesByUser'))
                    ->inRandomOrder()
                    ->limit(4),
            ])
            ->where('is_visible', true)
            ->inRandomOrder()
            ->get();
    }

    /**
     * Get bestsellers
     */
    public function getSellersProperty(): ?Collection
    {
        // Check if bestsellers section enabled
        if (settings('appearance')->is_best_sellers) {
            // Get top sellers randomly
            return User::query()
                ->with([
                    'avatar',
                    'reviews',
                    'skills' => fn ($query) => $query->inRandomOrder()->take(3),
                    'level' => ['translations'],
                ])
                ->where('account_type', 'seller')
                ->whereHas('sales')
                ->whereIn('status', ['active', 'verified'])
                ->withCount('sales')
                ->orderBy('sales_count', 'desc')
                ->take(12)
                ->get();
        } else {
            // No need to make sql query
            return null;
        }
    }

    /**
     * Get recent projects
     *
     * @return mixed
     */
    public function getProjectsProperty()
    {
        // Check if projects enabled
        if (settings('projects')->is_enabled) {
            return Project::whereIn('status', ['active'])
                ->when(app()->getLocale() === 'en', fn($query) => $query->withEnglishTranslation())
                ->orderByDesc('id')
                ->take(4)
                ->get();
        } else {
            // Not enabled
            return null;
        }
    }

    /**
     * Subscribe to our newsletter
     *
     * @return void
     */
    public function newsletter()
    {
        try {
            // Check if newsletter enabled
            if (! settings('newsletter')->is_enabled) {
                return;
            }

            // Validate email address
            if (! filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
                // Error
                $this->notification([
                    'title' => __('messages.t_error'),
                    'description' => __('messages.t_pls_enter_valid_email_address'),
                    'icon' => 'error',
                ]);

                return;
            }

            // Get email in list
            $email = NewsletterList::where('email', $this->email)->first();

            // Check if email exists
            if ($email) {
                // Check if email already verified
                if ($email->status === 'verified') {
                    // Reset form
                    $this->reset('email');

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
                    Mail::to($this->email)->send(new EveryoneNewsletterVerification($token));

                    // Reset form
                    $this->reset('email');

                    // Success
                    $this->notification([
                        'title' => __('messages.t_success'),
                        'description' => __('messages.t_we_sent_verification_link_newsletter'),
                        'icon' => 'success',
                    ]);
                }
            } else {
                // Add email to list
                $list = new NewsletterList;
                $list->uid = uid();
                $list->email = clean($this->email);
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
                Mail::to($this->email)->send(new EveryoneNewsletterVerification($token));

                // Reset form
                $this->reset('email');

                // Success
                $this->notification([
                    'title' => __('messages.t_success'),
                    'description' => __('messages.t_we_sent_verification_link_newsletter'),
                    'icon' => 'success',
                ]);
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
