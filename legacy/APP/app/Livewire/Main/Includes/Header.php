<?php

namespace App\Livewire\Main\Includes;

use App\Models\Gig;
use App\Models\User;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\View\Factory;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Collection;
use Livewire\Component;
use App\Models\Category;
use App\Models\Language;
use WireUi\Traits\Actions;
use App\Models\Notification;
use Conner\Tagging\Model\Tag;
use App\Models\ChMessage as Message;
use Illuminate\Support\Facades\Cookie;
use Jantinnerezo\LivewireAlert\LivewireAlert;

class Header extends Component
{
    use Actions, LivewireAlert;

    public $new_messages;
    public $notifications;

    public $q;
    public $gigs    = [];
    public $sellers = [];
    public $tags    = [];
    public $default_language_name;
    public $default_language_code;
    public $default_country_code;
    public $language;
    public $last_notification_time = 0;

    /**
     * Init component
     *
     * @return void
     */
    public function mount()
    {
        // Clean query
        $this->q = clean($this->q);

        // Check if user online
        if (auth()->check()) {
            // Count unread messages
            $unread_message = Message::where('to_id', auth()->id())
                ->where('seen', false)
                ->count();

            // Set unread messages
            $this->new_messages  = $unread_message;

            // Get notifications
            $this->notifications = Notification::where('user_id', auth()->id())->where('is_seen', false)->latest()->get();
        }

        // Get language from session
        $locale   = session()->has('locale') ? session()->get('locale') : settings('general')->default_language;

        // Get default language
        $language = Language::where('language_code', $locale)->first();
        $this->language = $language;

        // Check if language exists
        if ($language) {
            // Set default language
            $this->default_language_name = $language->name;
            $this->default_language_code = $language->language_code;
            $this->default_country_code  = $language->country_code;
        } else {
            // Not found, set default
            $this->default_language_name = "English";
            $this->default_language_code = "en";
            $this->default_country_code  = "us";
        }
    }

    /**
     * Render component
     *
     * @return Application|Factory|View|\Illuminate\Foundation\Application
     */
    public function render(): \Illuminate\Foundation\Application|View|Factory|Application
    {
        return view('livewire.main.includes.header', [
            'categories' => $this->categories,
            'languages'  => $this->languages,
        ]);
    }

    /**
     * Listen when q keyword changes
     *
     * @return void
     */
    public function updatedQ()
    {
        // Reset notification time when user starts typing
        $this->last_notification_time = 0;

        // Search
        $this->search();
    }

    /**
     * Search by query
     *
     * @return mixed
     */
    public function search()
    {
        // Check if has a searching keyword
        if ($this->q) {
            // Set keyword
            $keyword       = $this->q;

            // Get gigs same as this keyword
            $gigs          = Gig::query()
                                        ->active()
                                        ->where(function($query) use($keyword) {
                                            return $query->where('title', 'LIKE', "%{$keyword}%")
                                                        ->orWhere('slug', 'LIKE', "%{$keyword}%")
                                                        ->orWhere('description', 'LIKE', "%{$keyword}%");
                                        })
                                        ->select('id', 'title', 'slug')
                                        ->limit(10)
                                        ->get();

            // Set gigs
            $this->gigs    = $gigs;

            // Get sellers
            $sellers       = User::query()
                                        ->whereIn('status', ['verified', 'active'])
                                        ->where('account_type', 'seller')
                                        ->where(function($query) use($keyword) {
                                            return $query->where('username', 'LIKE', "%{$keyword}%")
                                                        ->orWhere('fullname', 'LIKE', "%{$keyword}%")
                                                        ->orWhere('headline', 'LIKE', "%{$keyword}%")
                                                        ->orWhere('description', 'LIKE', "%{$keyword}%");
                                        })
                                        ->select('id', 'username', 'avatar_id', 'status', 'headline', 'fullname', 'description', 'account_type')
                                        ->with('avatar')
                                        ->limit(10)
                                        ->get();

            // Set sellers
            $this->sellers = $sellers;

            // Get tags
            $tags          = Tag::query()
                                        ->where('name', 'LIKE', "%{$keyword}%")
                                        ->select('slug', 'name')
                                        ->limit(10)
                                        ->get();

            // Set tags
            $this->tags    = $tags;

        } else {
            // Reset data
            $this->reset(['q', 'gigs', 'sellers', 'tags']);
        }
    }

    /**
     * Go to search page
     *
     * @return void
     */
    public function enter()
    {
        // Check if has a search term
        if (!$this->q) {
            $now = time();
            if ($now - $this->last_notification_time >= 6) {
                $this->notification([
                    'title'       => __('messages.t_info'),
                    'description' => __('messages.t_pls_type_a_search_term_first'),
                    'icon'        => 'info',
                ]);

                $this->last_notification_time = $now;
            }

            return;
        }

        // Redirect to search page
        return redirect('search?q=' . $this->q);
    }

    /**
     * Get all parent categories
     *
     * @return Collection
     */
    public function getCategoriesProperty(): Collection
    {
        return Category::with([
            'translations',
            'icon',
            'subcategories' => fn($query) => $query->with([
                'translations', 'icon',
                'childcategories' => fn($query) => $query->with(['translations', 'icon'])
            ])->orderBy('id', 'desc')
        ])->get();
    }

    /**
     * Get supported languages
     *
     * @return object
     */
    public function getLanguagesProperty()
    {
        return Language::orderBy('name', 'asc')->get();
    }

    /**
     * Mark notification as read
     *
     * @param string $id
     * @return void
     */
    public function readNotification($id)
    {
        // Get notification
        Notification::where('uid', $id)->where('user_id', auth()->id())->update([
            'is_seen' => true
        ]);

        // Refresh notifications
        $this->notifications = Notification::where('user_id', auth()->id())->where('is_seen', false)->latest()->get();
    }

    /**
     * Close announce
     *
     * @return void
     */
    public function closeAnnounce()
    {
        // Set cookie
        Cookie::queue('header_announce_closed', true, 4320);
    }

    /**
     * Change locale
     *
     * @param string $locale
     * @return void
     */
    public function setLocale($locale)
    {
        // Get language
        $language = Language::where('language_code', $locale)->where('is_active', true)->first();

        // Check if language exists
        if (!$language) {
            // Not found
            $this->notification([
                'title'       => __('messages.t_error'),
                'description' => __('messages.t_selected_lang_does_not_found'),
                'icon'        => 'error'
            ]);

            return;
        }

        // Set default language
        session()->put('locale', $language->language_code);

        // Refresh the page
        $this->dispatch('refresh');
    }


}
