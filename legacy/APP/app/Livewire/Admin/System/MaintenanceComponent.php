<?php

namespace App\Livewire\Admin\System;

use App\Models\Admin;
use App\Notifications\Admin\SiteIsDown;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Artisan;
use Config;
use Illuminate\Support\Str;
use Livewire\Attributes\Layout;
use Livewire\Component;

class MaintenanceComponent extends Component
{
    use SEOToolsTrait;

    public $status;

    public $headline;

    public $message;

    public $secret;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Check maintenance mode

        $this->status = app()->isDownForMaintenance() ? 'down' : 'up';

        // Fill form

        $this->fill([

            'headline' => config('maintenance.headline'),

            'message' => config('maintenance.message'),

            'secret' => config('maintenance.secret'),

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_maintenance_mode'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.system.maintenance');

    }

    /**
     * Update maintenance mode

     *

     * @return void
     */
    public function update()
    {

        try {

            // Check status

            if ($this->status === 'up') {

                // Site is up

                Artisan::call('up');

                // Clear cache

                Artisan::call('config:clear');

            } elseif ($this->status === 'down') {

                // Generate secret

                $secret = (string) Str::uuid()->toString();

                // Set maintenance mode settings

                Config::write('maintenance.headline', str_replace(["'", '"'], '', $this->headline));

                Config::write('maintenance.message', str_replace(["'", '"'], '', $this->message));

                Config::write('maintenance.secret', $secret);

                // Put site in maintnenace mode

                Artisan::call('down', ['--secret' => "$secret"]);

                // Clear config cache

                Artisan::call('config:clear');

                // Send admin a message

                Admin::first()->notify(new SiteIsDown($secret));

                // Success

                $this->alert(

                    'success',

                    __('messages.t_success'),

                    livewire_alert_params(__('messages.t_toast_operation_success'))

                );

            }

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
