<?php

namespace App\Livewire\Main\Auth;

use App\Http\Validators\Main\Auth\LoginValidator;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Auth;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class LoginComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $email;

    public $password;

    public $recaptcha_token;

    public $remember_me = true;

    public $social_grid;

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

        // Redirect to previous url
        if (! session()->has('url.intended')) {
            session(['url.intended' => url()->previous()]);
        }

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
        $title = __('messages.t_login')." $separator ".settings('general')->title;
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

        return view('livewire.main.auth.login');
    }

    /**
     * Login
     *
     * @return void
     */
    public function login($form)
    {
        try {

            // Verify form first
            if (! is_array($form) || ! isset($form['email']) || ! isset($form['password'])) {
                return;
            }

            // Set data
            $this->email = $form['email'];
            $this->password = $form['password'];
            $this->recaptcha_token = $form['recaptcha_token'];

            // Validate form
            LoginValidator::validate($this);

            // Set login credentials
            $credentials = ['email' => $this->email, 'password' => $this->password];

            // Attempt login
            if (Auth::attempt($credentials, $this->remember_me)) {

                // Check if user active
                if (in_array(auth()->user()->status, ['active', 'verified'])) {

                    // Go to home
                    return redirect()->intended('/');

                } else {

                    // Logout
                    Auth::logout();

                    request()->session()->invalidate();

                    request()->session()->regenerateToken();

                    // Error
                    $this->notification([
                        'title' => __('messages.t_error'),
                        'description' => __('messages.t_toast_something_went_wrong'),
                        'icon' => 'error',
                    ]);

                    return;

                }

            }

            // Failed
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_invalid_login_credentials_pls_try_again'),
                'icon' => 'error',
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_form_validation_error'), 'error')
            );

            throw $e;
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
