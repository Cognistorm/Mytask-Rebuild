<?php

namespace App\Livewire\Main\Account\Settings;

use App\Enums\ProjectStatus;
use App\Http\Validators\Main\Account\Settings\EditValidator;
use App\Models\Country;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Project;
use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Hash;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class SettingsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $username;

    public $email;

    public $fullname;

    public $country;

    public $city;

    public $password;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Get user

        $user = auth()->user();

        // Fill form

        $this->fill([

            'username' => $user->username,

            'email' => $user->email,

            'fullname' => $user->fullname,

            'country' => $user->country_id,

            'city' => $user->city,

        ]);

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

        $title = __('messages.t_account_settings')." $separator ".settings('general')->title;

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

        return view('livewire.main.account.settings.settings', [

            'countries' => $this->countries,

        ]);

    }

    /**
     * Get list of countries

     *

     * @return object
     */
    public function getCountriesProperty()
    {

        return Country::where('is_active', true)->orderBy('name', 'asc')->get();

    }

    /**
     * Update user account settings

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Set current user

            $user = auth()->user();

            // Validate current password

            if ($user->password && ! Hash::check($this->password, $user->password)) {

                // Password does not match

                $this->notification([

                    'title' => __('messages.t_error'),

                    'description' => __('messages.t_ur_current_pass_does_not_match'),

                    'icon' => 'error',

                ]);

                return;

            }

            // Update user data

            User::where('id', auth()->id())->update([

                'username' => clean($this->username),

                'email' => clean($this->email),

                'fullname' => $this->fullname ? clean($this->fullname) : null,

                'country_id' => $this->country ? $this->country : null,

                'city' => $this->city ? clean($this->city) : null,

            ]);

            // Refresh user

            $user->refresh();

            // Reset password input

            $this->reset('password');

            // Success

            $this->notification([

                'title' => __('messages.t_success'),

                'description' => __('messages.t_ur_account_settings_updated'),

                'icon' => 'success',

            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error



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
     * Check if user has active orders or projects
     */
    public function hasActiveOrdersOrProjects(): bool
    {
        $userId = auth()->id();

        $activeOrderStatuses = ['pending', 'proceeded', 'delivered'];
        $activeProjectStatuses = [
            ProjectStatus::ACTIVE->value,
            ProjectStatus::PENDING_FINAL_REVIEW->value,
            ProjectStatus::PENDING_PAYMENT->value,
            ProjectStatus::UNDER_DEVELOPMENT->value,
        ];

        $hasActiveOrdersAsBuyer = Order::where('buyer_id', $userId)
            ->whereHas('items', fn ($q) => $q->whereIn('status', $activeOrderStatuses)->where('is_finished', false))
            ->exists();

        $hasActiveOrdersAsSeller = OrderItem::where('owner_id', $userId)
            ->whereIn('status', $activeOrderStatuses)
            ->where('is_finished', false)
            ->exists();



        $hasActiveProjectsAsClient = Project::where('user_id', $userId)
            ->whereIn('status', $activeProjectStatuses)
            ->exists();


        $hasActiveProjectsAsFreelancer = Project::where('awarded_freelancer_id', $userId)
            ->whereIn('status', $activeProjectStatuses)
            ->exists();


        return $hasActiveOrdersAsBuyer
            || $hasActiveOrdersAsSeller
            || $hasActiveProjectsAsClient
            || $hasActiveProjectsAsFreelancer;
    }

    /**
     * Confirm delete account
     */
    public function confirmDeleteAccount(): void
    {
        if ($this->hasActiveOrdersOrProjects()) {
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_cannot_delete_account_active_orders_projects'),
                'icon' => 'error',
            ]);

            return;
        }

        $this->dialog()->confirm([
            'title' => __('messages.t_confirm_delete_account'),
            'description' => "<div class='leading-relaxed'>" . __('messages.t_delete_account_warning') . '</div>',
            'icon' => 'error',
            'accept' => [
                'label' => __('messages.t_delete'),
                'method' => 'deleteAccount',
            ],
            'reject' => [
                'label' => __('messages.t_cancel'),
            ],
        ]);
    }

    /**
     * Delete the user account
     */
    public function deleteAccount(): void
    {
        try {
            if ($this->hasActiveOrdersOrProjects()) {
                $this->notification([
                    'title' => __('messages.t_error'),
                    'description' => __('messages.t_cannot_delete_account_active_orders_projects'),
                    'icon' => 'error',
                ]);

                return;
            }

            $user = auth()->user();

            auth()->logout();

            $user->delete();

            session()->invalidate();
            session()->regenerateToken();

            $this->redirect('/', navigate: true);
        } catch (\Throwable $th) {
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')
            );
        }
    }
}
