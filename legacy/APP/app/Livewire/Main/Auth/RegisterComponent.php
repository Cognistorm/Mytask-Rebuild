<?php

namespace App\Livewire\Main\Auth;

use App\Http\Validators\Main\Auth\RegisterValidator;
use App\Models\Admin;
use App\Models\EmailVerification;
use App\Models\Referral;
use App\Models\ReferralEarning;
use App\Models\User;
use App\Notifications\Admin\PendingUser;
use App\Notifications\User\Everyone\VerifyEmail;
use App\Enums\ReferralStatus;
use App\Services\Referral\ReferralBenefitService;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Hash;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class RegisterComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $email;

    public $username;

    public $password;

    public $fullname;

    public $recaptcha_token;

    public $social_grid;

    public $referral_code;

    public $agree_terms;

    /**
     * Initialize component
     *
     * @return void
     */
    public function mount()
    {
        // Set empty social grid counter
        $social_grid_counter = 0;

        // Get auth settings
        $settings_auth = settings('auth');

        // Check if facebook login enabled
        if ($settings_auth->is_facebook_login) {
            $social_grid_counter += 1;
        }

        // Check if twitter login enabled
        if ($settings_auth->is_twitter_login) {
            $social_grid_counter += 1;
        }

        // Check if google login enabled
        if ($settings_auth->is_google_login) {
            $social_grid_counter += 1;
        }

        // Check if github login enabled
        if ($settings_auth->is_github_login) {
            $social_grid_counter += 1;
        }

        // Check if linkedin login enabled
        if ($settings_auth->is_linkedin_login) {
            $social_grid_counter += 1;
        }

        // Set grid
        $this->social_grid = $social_grid_counter;

        $this->referral_code = request()->get('ref');
    }

    /**
     * Render component
     *
     * @return Illuminate\View\View
     */
    #[Layout('livewire.main.auth.layout.auth')]
    public function render()
    {
        // SEO
        $separator = settings('general')->separator;
        $title = __('messages.t_signup')." $separator ".settings('general')->title;
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

        return view('livewire.main.auth.register');
    }

    /**
     * Create new account
     *
     * @param  array  $form
     * @return mixed
     */
    public function register($form)
    {
        try {

            // Verify form first
            if (! is_array($form) || ! isset($form['email']) || ! isset($form['password']) || ! isset($form['fullname']) || ! isset($form['username'])) {
                return;
            }

            // Set data
            $this->email = $form['email'];
            $this->password = $form['password'];
            $this->fullname = $form['fullname'];
            $this->username = $form['username'];
            $this->recaptcha_token = $form['recaptcha_token'];
            $this->referral_code = $form['referral_code'] ?? null;
            $this->agree_terms = $form['agree_terms'] ?? false;

            // Validate form
            RegisterValidator::validate($this);

            // Get auth settings
            $settings = settings('auth');

            // Create new user
            $user = new User;
            $user->uid = uid();
            $user->fullname = clean($this->fullname);
            $user->email = clean($this->email);
            $user->username = clean($this->username);
            $user->password = Hash::make($this->password);
            $user->status = $settings->verification_required ? 'pending' : 'active';
            $user->level_id = 1;
            $user->referral_code = $this->generateReferralCode();
            $user->save();

            if (!empty($this->referral_code)) {
                $this->handleReferral($user);
            }

            // Check if user requires verification
            if ($settings->verification_required) {

                // Check if verification using email
                if ($settings->verification_type === 'email') {

                    // Generate token
                    $token = uid(64);

                    // Generate verification
                    $verification = new EmailVerification;
                    $verification->token = $token;
                    $verification->email = $this->email;
                    $verification->expires_at = now()->addMinutes($settings->verification_expiry_period);
                    $verification->save();

                    // Send notification to user
                    $user->notify((new VerifyEmail($verification))->locale(config('app.locale')));

                    // Redirect to same page with success message
                    return redirect('auth/login')->with('success', __('messages.t_register_verification_email_sent', ['email' => $this->email, 'minutes' => $settings->verification_expiry_period]));

                } elseif ($settings->verification_type === 'admin') {

                    // Send notification to admin
                    Admin::first()->notify((new PendingUser($user))->locale(config('app.locale')));

                    // Redirect to same page with success
                    return redirect('auth/login')->with('success', __('messages.t_register_verification_admin_pending'));

                }

            }

            if (!$settings->verification_required && !empty($this->referral_code)) {
                $this->processReferralAfterVerification($user);
            }

            // Now login
            auth()->login($user, true);

            // Redirect to home
            return redirect('/');

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params($e->getMessage(), 'error')
            );

            $this->dispatch('focusErrorInput', true);

            throw $e;
        } catch (\Throwable $th) {

            // Something went wrong
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')
            );

        }
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
     * Handle referral logic
     *
     * @param User $newUser
     * @return void
     */
    private function handleReferral(User $newUser)
    {
        try {
            $referrer = User::where('referral_code', $this->referral_code)->first();

            if ($referrer) {
                Referral::create([
                    'referrer_id' => $referrer->id,
                    'referred_user_id' => $newUser->id,
                    'referral_code' => $this->referral_code,
                    'status' => ReferralStatus::PENDING,
                    'referred_at' => now(),
                ]);

                \Log::info("Referral created but pending email verification for user {$newUser->id}");
            }
        } catch (\Exception $e) {
            \Log::error('Referral processing failed: ' . $e->getMessage());
        }
    }

    private function processReferralAfterVerification(User $user)
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
                $this->applyReferralCodeBenefits($user, $referral->referral_code);
            }
        } catch (\Exception $e) {
            \Log::error('Processing referral after verification failed: ' . $e->getMessage());
        }
    }

    private function applyReferralCodeBenefits(User $user, string $referralCode)
    {
        try {
            $benefitService = new ReferralBenefitService();
            $benefitService->applyBenefitsForCode($user, $referralCode);
        } catch (\Exception $e) {
            \Log::error('Failed to apply referral code benefits: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'referral_code' => $referralCode
            ]);
        }
    }
}
