<?php

namespace App\Livewire\Main\Auth\Password;

use App\Http\Validators\Main\Auth\ResetPasswordValidator;
use App\Models\PasswordReset;
use App\Models\User;
use App\Notifications\User\Everyone\PasswordReset as PasswordResetNotification;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class ResetComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $email;

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

        $title = __('messages.t_reset_password')." $separator ".settings('general')->title;

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

        return view('livewire.main.auth.password.reset');

    }

    /**
     * Send password reset to user

     *

     * @return void
     */
    public function send()
    {

        try {

            // Validate form

            ResetPasswordValidator::validate($this);

            // Get email address

            $email = clean($this->email);

            // Get user with same email address

            $user = User::where('email', $email)
                ->whereIn('status', ['active', 'verified', 'pending'])
                ->whereNotNull('password')
                ->first();

            // Check if there is a user with that email address

            if ($user) {

                // Delete old tokens

                PasswordReset::where('email', $user->email)->delete();

                // Generate a token

                $token = uid(64);

                // Save token

                $reset = new PasswordReset;

                $reset->token = $token;

                $reset->email = $email;

                $reset->expires_at = now()->addMinutes(settings('auth')->password_reset_expiry_period);

                $reset->save();

                // Send notification to user

                $user->notify((new PasswordResetNotification($reset))->locale(config('app.locale')));

            }

            // Success

            return redirect('auth/login')->with('success', __('messages.t_password_reset_link_sent_success'));

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
