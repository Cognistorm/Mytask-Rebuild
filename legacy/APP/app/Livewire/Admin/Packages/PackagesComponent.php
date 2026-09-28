<?php

namespace App\Livewire\Admin\Packages;

use App\Models\Package;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class PackagesComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $orders = [];

    /**
     * Initialize component
     */
    public function mount(): void
    {

        foreach ($this->packages as $package) {

            $this->fill([

                "orders.{$package->id}" => $package->order_number,

            ]);

        }

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

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_packages'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.packages.packages', [

            'packages' => $this->packages,

        ]);

    }

    /**
     * Get list of available packages
     */
    public function getPackagesProperty(): object
    {

        return Package::withTranslation()
            ->orderBy('order_number', 'asc')
            ->paginate(20);

    }

    /**
     * Upadate package order

     *

     * @param  int  $id
     */
    public function updateOrder($id): void
    {

        // Check if package is set

        if (isset($this->orders[$id])) {

            // Get package

            $package = Package::where('id', $id)->firstOrFail();

            // Set the value

            $value = (int) $this->orders[$id];

            // Update package

            $package->order_number = $value;

            $package->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        }

    }

}
