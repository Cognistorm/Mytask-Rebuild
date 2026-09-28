<?php

namespace App\Livewire\Installation;

use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class StartComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $phone;

    public $purchase_link;

    public $purchase_code;

    public $username;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Set application url

        Config::write('app.url', url('/'));

        Config::write('app.asset_url', url('public'));

        Config::write('app.mix_url', url('public'));

        // Set filesystems links

        Config::write('filesystems.disks.public.url', url('storage'));

        Config::write('filesystems.disks.custom.url', url('public/storage'));

        Config::write('filesystems.disks.chat.url', url('public/storage/chat'));

        // Clear cache

        Artisan::call('config:clear');

        // Set purchase link

        $this->purchase_link = config('global.purchase_link');

        // Set support phone

        // We prefer whatsapp support for fast replies

        // But first you have to add a comment in Codecanyon

        $this->phone = config('global.whatsapp');

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.install')]

    public function render()
    {

        // SEO

        $this->seo()->setTitle('Installation | Get started');

        return view('livewire.installation.start');

    }

    /**
     * Go to next step

     *

     * @return void
     */
    public function next()
    {

        // Check if purchase code and username are valid

        if (! $this->purchase_code || ! $this->username) {

            // Error

            $this->notification([

                'title' => __('messages.t_error'),

                'description' => 'Please insert your purchase code and CodeCanyon username',

                'icon' => 'error',

            ]);

            return;

        }

        // Set purchase code and username

        Config::write('envato.purchase_code', $this->purchase_code);

        Config::write('envato.buyer', $this->username);

        // Clear cache

        Artisan::call('config:clear');

        // Redirect to next step

        return redirect('install/requirements');

    }

}
