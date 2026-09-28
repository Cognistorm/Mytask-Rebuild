<?php

namespace App\Livewire\Main\Search;

use App\Models\Gig;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Arr;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class SearchComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    public $q;
    public $delivery_times;
    public $sort_by;

    // filters
    public $min_price;
    public $max_price;
    public $delivery_time;
    public $rating;
    protected $queryString = [
        'q'             => ['except' => ''],
        'min_price'     => ['except' => ''],
        'max_price'     => ['except' => ''],
        'delivery_time' => ['except' => ''],
        'rating'        => ['except' => ''],
        'sort_by'       => ['except' => ''],
    ];

    // Use Livewire pagination theme (recognized via property_exists check)
    public $paginationTheme = 'tailwind';

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {
        // Clean query
        $this->q = clean($this->q);

        // Initialize filter properties if not set
        $this->min_price = $this->min_price ?? '';
        $this->max_price = $this->max_price ?? '';
        $this->delivery_time = $this->delivery_time ?? '';
        $this->rating = $this->rating ?? '';
        $this->sort_by = $this->sort_by ?? '';

        // Set delivery times

        $this->delivery_times = [

            ['value' => 1, 'text' => __('messages.t_1_day')],

            ['value' => 2, 'text' => __('messages.t_2_days')],

            ['value' => 3, 'text' => __('messages.t_3_days')],

            ['value' => 4, 'text' => __('messages.t_4_days')],

            ['value' => 5, 'text' => __('messages.t_5_days')],

            ['value' => 6, 'text' => __('messages.t_6_days')],

            ['value' => 7, 'text' => __('messages.t_1_week')],

            ['value' => 14, 'text' => __('messages.t_2_weeks')],

            ['value' => 21, 'text' => __('messages.t_3_weeks')],

            ['value' => 30, 'text' => __('messages.t_1_month')],

        ];

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

        $title = __('messages.t_search_results_for_q', ['q' => $this->q])." $separator ".settings('general')->title;

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

        return view('livewire.main.search.search', [

            'gigs' => $this->gigs,

        ]);

    }

    /**
     * Get gigs

     *

     * @return object
     */
    public function getGigsProperty()
    {

        $keyword = str_replace(['-', ' ', '_', "'", '"', '/', '`', '+'], ' ', $this->q);

        // start a new query

        $query = Gig::query()->with('owner.subscriptions')->active();


        // Check price

        if ($this->min_price) {

            $query->whereBetween('price', [$this->min_price, 999999]);

        }

        // Set max price

        if ($this->max_price) {

            $query->whereBetween('price', [0, $this->max_price]);

        }

        // Check delivery time

        if ($this->delivery_time) {

            $query->where('delivery_time', $this->delivery_time);

        }

        // Check rating

        if ($this->rating) {

            $query->where('rating', '>=', $this->rating);

        }

        // Check sort by

        if ($this->sort_by) {

            switch ($this->sort_by) {

                // Most popular

                case 'popular':

                    $query->orderByDesc('counter_visits');

                    break;

                    // Best rating

                case 'rating':

                    $query->orderByDesc('rating');

                    break;

                    // Most sales

                case 'sales':

                    $query->orderByDesc('counter_sales');

                    break;

                    // Newest

                case 'newest':

                    $query->orderByDesc('id');

                    break;

                    // Price low to high

                case 'price_low_high':

                    $query->orderByRaw('CAST(price AS DECIMAL(10,2)) ASC');

                    break;

                    // Price high to low

                case 'price_high_low':

                    $query->orderByRaw('CAST(price AS DECIMAL(10,2)) DESC');

                    break;

                default:

                    $query->orderByRaw('RAND()');

                    break;

            }

        }

        // Set results

        $query = $query->where(function ($builder) use ($keyword) {

            return $builder->whereTranslationLike('title', "%{$keyword}%")
                ->orWhereTranslationLike('description', "%{$keyword}%");

        });

        if (app()->getLocale() === 'en') {
            $query->withEnglishTranslation();
        }

        return $query->paginate(42)
            // Persist current filters/sort on pagination links
            ->appends($this->queryParams())
            ->withPath(url()->route('main.search'));
    }

    /**
     * Filter data
     *
     * @return void
     */
    public function filter()
    {
        // Reset pagination when filters change
        $this->resetPage();

        // The queryString property will automatically handle URL updates
        // No need to manually redirect anymore
    }

    /**
     * Handle when any filter property is updated
     *
     * @param string $propertyName
     * @return void
     */
    public function updatedMinPrice()
    {
        $this->resetPage();
    }

    public function updatedMaxPrice()
    {
        $this->resetPage();
    }

    public function updatedDeliveryTime()
    {
        $this->resetPage();
    }

    public function updatedRating()
    {
        $this->resetPage();
    }

    public function updatedSortBy()
    {
        $this->resetPage();
    }

    /**
     * Fallback reset for snake_case properties updates
     *
     * @param string $property
     * @return void
     */
    public function updated($property)
    {
        // Ensure pagination resets when any of these change, regardless of hook naming
        if (in_array($property, ['sort_by', 'min_price', 'max_price', 'delivery_time', 'rating'])) {
            $this->resetPage();
        }
    }

    /**
     * Explicitly set sort and reset to first page
     *
     * @param string $sort
     * @return void
     */
    public function setSort(string $sort): void
    {
        $this->sort_by = $sort;
        $this->resetPage();

        // Dispatch event to close Alpine.js dropdown
        $this->dispatch('sort-updated');
    }

    // Remove custom pagination view override to let Livewire handle links

    /**
     * Reset filter
     *
     * @return void
     */
    public function resetFilter()
    {
        // Reset all filter properties
        $this->min_price     = '';
        $this->max_price     = '';
        $this->delivery_time = '';
        $this->rating        = '';
        $this->sort_by       = '';

        // Reset pagination
        $this->resetPage();

        // QueryString will automatically update the URL
    }

    /**
     * Build query params to append to paginator links
     *
     * @return array<string, mixed>
     */
    private function queryParams(): array
    {
        $params = [
            'q'             => $this->q,
            'min_price'     => $this->min_price,
            'max_price'     => $this->max_price,
            'delivery_time' => $this->delivery_time,
            'rating'        => $this->rating,
            'sort_by'       => $this->sort_by,
        ];

        // Remove empty values to keep URL clean
        return array_filter($params, static function ($value) {
            return !($value === '' || $value === null);
        });
    }

}
