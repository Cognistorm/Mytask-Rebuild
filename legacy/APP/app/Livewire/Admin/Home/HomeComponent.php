<?php

namespace App\Livewire\Admin\Home;

use App\Models\ConversationMessage;
use App\Models\Gig;
use App\Models\GigVisit;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TrackerAgent;
use App\Models\TrackerDevice;
use App\Models\TrackerGeoip;
use App\Models\TrackerReferer;
use App\Models\User;
use App\Models\UserWithdrawalHistory;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\Layout;
use Livewire\Component;

class HomeComponent extends Component
{
    use SEOToolsTrait;

    public Collection $recent_users;

    public Collection $recent_gigs;

    public Collection $recent_projects;

    public Collection $tracker_map;

    public Collection $tracker_referers;

    public Collection $tracker_browsers;

    public Collection $tracker_platforms;

    public Collection $tracker_devices;

    public $net_income;

    public $income_from_taxes;

    public $income_from_commission;

    public $withdrawn_money;

    public $total_sales;

    public $total_gigs;

    public $total_users;

    public $total_messages;

    public $visits_by_countries;

    public $latest_users;

    public $browsers;

    public $os;

    public $devices;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Get recent users

        $this->recent_users = User::latest()
            ->select('id', 'avatar_id', 'username', 'created_at', 'status')
            ->with('avatar')
            ->take(10)
            ->get();

        // Get recent gigs

        $this->recent_gigs = Gig::latest()
            ->select('id', 'image_thumb_id', 'title', 'created_at', 'status')
            ->with('thumbnail')
            ->take(10)
            ->get();

        // Set tracker map

        $this->tracker_map = TrackerGeoip::whereNotNull('country_code')
            ->select('country_code', DB::raw('COUNT(country_code) as count'))
            ->groupBy('country_code')
            ->orderBy('count', 'desc')
            ->get();

        // Set tracker referers

        $this->tracker_referers = TrackerReferer::select('domain_id', DB::raw('COUNT(domain_id) as count'))
            ->whereHas('domain')
            ->with('domain')
            ->groupBy('domain_id')
            ->orderBy('count', 'desc')
            ->take(8)
            ->get();

        // Set tracker browsers

        $this->tracker_browsers = TrackerAgent::whereNotNull('browser')
            ->select('browser', DB::raw('COUNT(browser) as count'))
            ->groupBy('browser')
            ->orderBy('count', 'desc')
            ->take(5)
            ->get();

        // Platforms

        $this->tracker_platforms = TrackerDevice::whereNotNull('platform')
            ->select('platform', DB::raw('COUNT(platform) as count'))
            ->groupBy('platform')
            ->orderBy('count', 'desc')
            ->take(5)
            ->get();

        // Devices

        $this->tracker_devices = TrackerDevice::whereNotNull('kind')
            ->select('kind', DB::raw('COUNT(kind) as count'))
            ->groupBy('kind')
            ->orderBy('count', 'desc')
            ->take(5)
            ->get();

        // Calculate net income

        $this->net_income = Order::whereHas('items', function ($query) {

            return $query->whereIn('status', ['pending', 'proceeded', 'delivered']);

        })->sum('total_value');

        // Calculate income from taxes

        $this->income_from_taxes = Order::sum('taxes_value');

        // Calculate income from commission

        $this->income_from_commission = OrderItem::where('is_finished', true)->where('status', 'delivered')->sum('commission_value');

        // Caluclate withdrawn money

        $this->withdrawn_money = UserWithdrawalHistory::where('status', 'paid')->sum('amount');

        // Calculate total sales

        $this->total_sales = OrderItem::where('status', 'delivered')->where('is_finished', true)->count();

        // Calculate total gigs

        $this->total_gigs = Gig::count();

        // Caluclate total users

        $this->total_users = User::count();

        // Calculate users messages

        $this->total_messages = ConversationMessage::count();

        // Get visits by countries

        $this->visits_by_countries = GigVisit::whereNotNull('country_code')
            ->select('country_code', DB::raw('COUNT(country_code) as count'))
            ->groupBy('country_code')
            ->orderBy('count', 'desc')
            ->get();

        // Get latest 10 users

        $this->latest_users = User::latest()->take(10)->get();

        // Get top browsers

        $this->browsers = GigVisit::whereNotNull('browser_name')
            ->select('browser_name', DB::raw('COUNT(browser_name) as count'))
            ->groupBy('browser_name')
            ->orderBy('count', 'desc')
            ->get();

        // Get top os

        $this->os = GigVisit::whereNotNull('os_name')
            ->select('os_name', DB::raw('COUNT(os_name) as count'))
            ->groupBy('os_name')
            ->orderBy('count', 'desc')
            ->get();

        // Get top devices

        $this->devices = GigVisit::whereNotNull('device_type')
            ->select('device_type', DB::raw('COUNT(device_type) as count'))
            ->groupBy('device_type')
            ->orderBy('count', 'desc')
            ->get();

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(__('messages.t_dashboard').' '.settings('general')->separator.' '.settings('general')->title);

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.home.home');

    }

}
