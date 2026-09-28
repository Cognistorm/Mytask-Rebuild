<?php

namespace App\Livewire\Main\Auth;

use App\Models\EmailVerification;
use App\Models\User;
use App\Models\Referral;
use App\Models\ReferralEarning;
use App\Enums\ReferralStatus;
use App\Services\Referral\ReferralBenefitService;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Carbon\Carbon;
use Livewire\Component;

class VerifyComponent extends Component
{
    use SEOToolsTrait;

    public $token;

    public $email;

    protected $queryString = ['token', 'email'];

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Get verification

        $verification = EmailVerification::where('token', $this->token)->where('email', $this->email)->first();

        // Check if verification exists

        if (! $verification) {

            return redirect('auth/request')->with('error', __('messages.t_verification_email_not_exists'));

        }

        // Get expiry date

        $expiry_date = new Carbon($verification->expires_at);

        // Check if verification expired

        if ($expiry_date->isPast()) {

            return redirect('auth/request')->with('error', __('messages.t_verification_email_link_expired'));

        }

        // Verification is correct, activate account

        $user = User::where('email', $verification->email)->firstOrFail();

        // Update user status

        $user->status = 'active';

        $user->email_verified_at = now();

        $user->save();

        $this->processPendingReferrals($user);

        $verification->delete();

        return redirect('auth/login')->with('success', __('messages.t_ur_account_has_been_successfully_verified_email'));

    }
    private function processPendingReferrals(User $user): void
    {
        try {
            $referral = Referral::where('referred_user_id', $user->id)
                ->where('status', ReferralStatus::PENDING)
                ->first();

            if ($referral) {
                $referral->status = ReferralStatus::VERIFIED;
                $referral->save();

                ReferralEarning::createSignupEarning($referral->referrer_id, $user->id);
                $referral->referrer->addPoints(10, 'referral_signup_verified');

                (new ReferralBenefitService())->applyBenefitsForCode($user, $referral->referral_code);
            }
        } catch (\Exception $e) {
            \Log::error('Processing pending referrals failed: ' . $e->getMessage());
        }
    }

}
