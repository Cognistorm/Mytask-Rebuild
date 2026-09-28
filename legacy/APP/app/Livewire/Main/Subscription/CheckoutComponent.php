<?php

namespace App\Livewire\Main\Subscription;

use App\Models\Plan;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CheckoutComponent extends Component
{
    public $plan;
    public $slug;

    public function mount($slug)
    {
        $this->slug = $slug;
        $this->plan = Plan::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();
    }

    #[Layout('components.layouts.main-app')]
    public function render()
    {
        return view('livewire.main.subscription.checkout-component', [
            'plan' => $this->plan
        ]);
    }
}
