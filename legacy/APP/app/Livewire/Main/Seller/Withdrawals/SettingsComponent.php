<?php

namespace App\Livewire\Main\Seller\Withdrawals;

use App\Http\Validators\Main\Seller\Withdrawals\SettingsValidator;
use App\Models\UserWithdrawalSettings;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class SettingsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $selected;

    public $paypal_email;

    public $offline_info;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Get user withdrawal settings

        $payout_account = UserWithdrawalSettings::firstOrCreate(['user_id' => auth()->id()]);

        // Check payout method

        if ($payout_account->gateway_provider_name === 'paypal') {

            // Set paypal email

            $this->paypal_email = $payout_account->gateway_provider_id;

            $this->selected = 'paypal';

        } elseif ($payout_account->gateway_provider_name === 'offline') {

            // Set offline info

            $this->offline_info = $payout_account->gateway_provider_id;

            $this->selected = 'offline';

        }

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.seller-app')]

    public function render()
    {

        // SEO

        $separator = settings('general')->separator;

        $title = __('messages.t_withdrawal_settings')." $separator ".settings('general')->title;

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

        return view('livewire.main.seller.withdrawals.settings');

    }

    /**
     * Update withdrawal settings

     *

     * @return void
     */
    public function update($selected)
    {

        try {

            // Validate form

            SettingsValidator::validate($this);

            // One at least is required

            if (! $this->paypal_email && ! $this->offline_info) {

                // Error

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_toast_form_validation_error'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Check if paypal

            if (boolval(config('payouts.paypal.enabled')) && $selected === 'paypal' && $this->paypal_email) {

                // Save settings

                UserWithdrawalSettings::where('user_id', auth()->id())->update([

                    'gateway_provider_id' => $this->paypal_email,

                    'gateway_provider_name' => 'paypal',

                ]);

            } elseif (boolval(config('payouts.offline.enabled')) && $selected === 'offline' && $this->offline_info) {

                // Save settings

                UserWithdrawalSettings::where('user_id', auth()->id())->update([

                    'gateway_provider_id' => $this->offline_info,

                    'gateway_provider_name' => 'offline',

                ]);

            } else {

                // Return

                return;

            }

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

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

}
