<?php

namespace App\Livewire\Admin\Auth;

use App\Http\Validators\Admin\Auth\LoginValidator;
use App\Models\BannedIp;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class LoginComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    protected $attempts = 2;

    protected $retry = 20;

    public $email;

    public $password;

    public $message;

    public $recaptcha_token;

    public $attemptsLeft;

    public $retryAfter;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Redirect if login

        if (auth('admin')->check()) {

            return redirect(config('global.dashboard_prefix'));

        }

        // Set attempts left

        $this->attemptsLeft = RateLimiter::retriesLeft($this->throttleKey(), $this->attempts);

        // Set time left

        $this->retryAfter = RateLimiter::availableIn($this->throttleKey(), $this->attempts);

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-auth')]
    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_login'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.auth.login');

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

            // Check if ip address is banned

            $this->checkTooManyFailedAttempts();

            // Validate form

            LoginValidator::validate($this);

            // Get credentials

            $credentials = [

                'email' => $this->email,

                'password' => $this->password,

            ];

            if (Auth::guard('admin')->attempt($credentials, true)) {

                // Successfull login

                request()->session()->regenerate();

                // Clear failed attempts

                RateLimiter::clear($this->throttleKey());

                // Redirect to dashboard

                return redirect()->intended(config('global.dashboard_prefix'));

            }

            // Failed login, set failed attempt

            RateLimiter::hit($this->throttleKey(), $this->retry);

            // Invalid login data

            $this->message = __('messages.t_invalid_login_credentials_pls_try_again');

            // Return

            return;

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

    /**
     * Get the rate limiting throttle key for the request.

     *

     * @return string
     */
    public function throttleKey()
    {

        // Set ip address

        $ip = str_replace('.', '_', request()->ip());

        // Return key

        return "login_ip_address_banned_$ip";

    }

    /**
     * Ensure the login request is not rate limited.

     * 5 failed attempt

     *
     * @return void
     */
    public function checkTooManyFailedAttempts()
    {

        if (! RateLimiter::tooManyAttempts($this->throttleKey(), $this->attempts)) {

            return;

        }

        // User reach limit attempts, ban his ip address

        BannedIp::updateOrCreate(['ip_address' => request()->ip()])->increment('attempts');

        // Redirect to home page

        return redirect('/');

    }
}
