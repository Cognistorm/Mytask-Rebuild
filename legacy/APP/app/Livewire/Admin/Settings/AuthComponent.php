<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\AuthValidator;
use App\Models\Level;
use App\Models\SettingsAuth;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class AuthComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $verification_required;

    public $verification_type;

    public $verification_expiry_period;

    public $password_reset_expiry_period;

    public $auth_img_id;

    public $default_buyer_level;

    public $default_seller_level;

    public $is_facebook_login;

    public $is_google_login;

    public $is_twitter_login;

    public $is_github_login;

    public $is_linkedin_login;

    public $facebook_client_id;

    public $facebook_client_secret;

    public $twitter_client_id;

    public $twitter_client_secret;

    public $google_client_id;

    public $google_client_secret;

    public $github_client_id;

    public $github_client_secret;

    public $linkedin_client_id;

    public $linkedin_client_secret;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('auth');

        // Fill default settings

        $this->fill([

            'verification_required' => $settings->verification_required ? 1 : 0,

            'verification_type' => $settings->verification_type,

            'verification_expiry_period' => $settings->verification_expiry_period,

            'password_reset_expiry_period' => $settings->password_reset_expiry_period,

            'is_facebook_login' => $settings->is_facebook_login ? 1 : 0,

            'is_google_login' => $settings->is_google_login ? 1 : 0,

            'is_twitter_login' => $settings->is_twitter_login ? 1 : 0,

            'is_github_login' => $settings->is_github_login ? 1 : 0,

            'is_linkedin_login' => $settings->is_linkedin_login ? 1 : 0,

            'facebook_client_id' => config('services.facebook.client_id'),

            'facebook_client_secret' => config('services.facebook.client_secret'),

            'twitter_client_id' => config('services.twitter.client_id'),

            'twitter_client_secret' => config('services.twitter.client_secret'),

            'google_client_id' => config('services.google.client_id'),

            'google_client_secret' => config('services.google.client_secret'),

            'github_client_id' => config('services.github.client_id'),

            'github_client_secret' => config('services.github.client_secret'),

            'linkedin_client_id' => config('services.linkedin.client_id'),

            'linkedin_client_secret' => config('services.linkedin.client_secret'),

            'default_buyer_level' => $settings->default_buyer_level_id,

            'default_seller_level' => $settings->default_seller_level_id,

        ]);

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_auth_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.auth', [

            'levels' => $this->levels,

        ]);

    }

    /**
     * Get levels
     */
    public function getLevelsProperty(): object
    {

        return Level::withTranslation()->latest('id')->get();

    }

    /**
     * Remove auth wallpaper
     */
    public function removeAuthWallpaper()
    {
        $this->auth_img_id = null;
    }

    /**
     * Update settings

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            AuthValidator::validate($this);

            // Get old settings

            $settings = settings('auth');

            // Check if request has auth wallpaper
            if ($this->auth_img_id) {

                $auth_img_id = ImageUploader::make($this->auth_img_id)
                    ->folder('site/auth')
                    ->deleteById($settings->auth_img_id)
                    ->handle();

            } elseif ($this->auth_img_id === null) {

                if ($settings->auth_img_id) {
                    ImageUploader::make(null)->deleteById($settings->auth_img_id);
                }
                $auth_img_id = null;

            } else {

                $auth_img_id = $settings->auth_img_id;

            }

            // Update settings

            SettingsAuth::first()->update([

                'verification_required' => $this->verification_required ? 1 : 0,

                'verification_type' => $this->verification_type,

                'verification_expiry_period' => $this->verification_expiry_period,

                'password_reset_expiry_period' => $this->password_reset_expiry_period,

                'auth_img_id' => $auth_img_id,

                'is_facebook_login' => $this->is_facebook_login ? 1 : 0,

                'is_google_login' => $this->is_google_login ? 1 : 0,

                'is_twitter_login' => $this->is_twitter_login ? 1 : 0,

                'is_github_login' => $this->is_github_login ? 1 : 0,

                'is_linkedin_login' => $this->is_linkedin_login ? 1 : 0,

                'default_buyer_level_id' => $this->default_buyer_level,

                'default_seller_level_id' => $this->default_seller_level,

            ]);

            // Write config

            Config::write('services.facebook.client_id', $this->facebook_client_id);

            Config::write('services.facebook.client_secret', $this->facebook_client_secret);

            Config::write('services.facebook.redirect', url('auth/facebook/callback'));

            Config::write('services.twitter.client_id', $this->twitter_client_id);

            Config::write('services.twitter.client_secret', $this->twitter_client_secret);

            Config::write('services.twitter.redirect', url('auth/twitter/callback'));

            Config::write('services.google.client_id', $this->google_client_id);

            Config::write('services.google.client_secret', $this->google_client_secret);

            Config::write('services.google.redirect', url('auth/google/callback'));

            Config::write('services.github.client_id', $this->github_client_id);

            Config::write('services.github.client_secret', $this->github_client_secret);

            Config::write('services.github.redirect', url('auth/github/callback'));

            Config::write('services.linkedin.client_id', $this->linkedin_client_id);

            Config::write('services.linkedin.client_secret', $this->linkedin_client_secret);

            Config::write('services.linkedin.redirect', url('auth/linkedin/callback'));

            // Clear config

            Artisan::call('config:clear');

            // Refresh data from cache

            settings('auth', true);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

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

            throw $th;
        }

    }

}
