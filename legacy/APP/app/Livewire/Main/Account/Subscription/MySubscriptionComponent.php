<?php

namespace App\Livewire\Main\Account\Subscription;

use App\Notifications\User\Everyone\SubscriptionCancelled;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class MySubscriptionComponent extends Component
{
    use LivewireAlert;

    public $currentSubscription;
    public $subscriptionStatus;
    public $planDetails;

    public function mount()
    {
        if (auth()->check()) {
            $this->currentSubscription = auth()->user()->subscriptions()
                ->with('plan')
                ->whereNull('canceled_at')
                ->where('ends_at', '>', now())
                ->first();

            if ($this->currentSubscription) {
                if ($this->currentSubscription->cancels_at) {
                    $this->subscriptionStatus = 'canceled';
                } else {
                    $this->subscriptionStatus = 'active';
                }
                $this->planDetails = $this->currentSubscription->plan;
            } else {
                $this->subscriptionStatus = 'inactive';
                $this->planDetails = null;
            }
        }
    }

    public function cancelSubscription()
    {
        if ($this->currentSubscription) {
            $this->currentSubscription->update([
                'cancels_at' => $this->currentSubscription->ends_at,
            ]);

            auth()->user()->notify((new SubscriptionCancelled($this->currentSubscription))->locale(config('app.locale')));

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params( __('messages.t_subscription_canceled_successfully') )

            );

            $this->mount();
        }
    }

    #[Layout('components.layouts.main-app')]
    public function render()
    {
        return view('livewire.main.account.subscription.my-subscription-component');
    }
}
