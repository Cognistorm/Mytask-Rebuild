<?php

namespace App\Livewire\Main\Account\Referrals;

use App\Enums\ReferralEarningStatus;
use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class ReferralsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    protected $paginationTheme = 'tailwind';

    public $referralCode;
    public $referralLink;

    /**
     * Init component
     *
     * @return void
     */
    public function mount()
    {
        // Generate referral code if user doesn't have one
        $user = auth()->user();

        if (!$user->referral_code) {
            $user->referral_code = $this->generateReferralCode();
            $user->save();
        }

        $this->referralCode = $user->referral_code;
        $this->referralLink = url('/auth/register?ref=' . $this->referralCode);
    }

    /**
     * Generate unique referral code
     *
     * @return string
     */
    private function generateReferralCode()
    {
        do {
            $code = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8));
        } while (User::where('referral_code', $code)->exists());

        return $code;
    }

    /**
     * Copy referral link to clipboard
     *
     * @return void
     */
    public function copyReferralLink()
    {
        $this->notification([
            'title' => __('messages.t_success'),
            'description' => __('Referral link copied to clipboard!'),
            'icon' => 'success',
        ]);
    }

    /**
     * Get referral statistics
     *
     * @return object
     */
    public function getReferralStatsProperty()
    {
        $user = auth()->user();

        $referrals = $user->referrals()
            ->with(['referredUser.subscriptions' => fn ($q) => $q->active()])
            ->get();

        $paidPremiumReferrals = $referrals->filter(fn ($referral) => $referral->referredUser?->hasPaidPremium())->count();

        $bonusPremiumReferrals = $referrals->filter(fn ($referral) => $referral->referredUser?->hasGiftedPremium())->count();

        return (object) [
            'total_referrals' => $referrals->count(),
            'premium_referrals' => $paidPremiumReferrals + $bonusPremiumReferrals,
            'paid_premium_referrals' => $paidPremiumReferrals,
            'bonus_premium_referrals' => $bonusPremiumReferrals,
            'total_points' => $user->referralEarnings()->where('status', ReferralEarningStatus::APPROVED)->sum('points'),
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
        $title = __('Referrals') . " $separator " . settings('general')->title;
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

        $recentReferrals = auth()->user()->referrals()
            ->with(['referredUser.country', 'referredUser.subscriptions'])
            ->latest()
            ->paginate(10)
            ->withPath(url()->current());

        return view('livewire.main.account.referrals.referrals', [
            'stats' => $this->referralStats,
            'recentReferrals' => $recentReferrals,
        ]);
    }
}
