<?php

namespace App\Livewire\Installation;

use App\Models\Admin;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Hash;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class AdministratorComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $email;

    public $username;

    public $password;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.install')]

    public function render()
    {

        // SEO

        $this->seo()->setTitle('Installation | Administrator');

        return view('livewire.installation.administrator');

    }

    /**
     * Go to next step

     *

     * @return void
     */
    public function next()
    {

        // Remember here, that we didn't use advanced validation because your are trying to install your application

        // So no more additional code :)

        // Check if all field exists

        if (! $this->email || ! $this->username || ! $this->password) {

            // Error

            $this->notification([

                'title' => __('messages.t_error'),

                'description' => 'Please insert all fields, before you continue',

                'icon' => 'error',

            ]);

            return;

        }

        // create new account

        Admin::create([

            'uid' => uid(),

            'email' => $this->email,

            'username' => $this->username,

            'password' => Hash::make($this->password),

        ]);

        // Redirect to next step

        return redirect('install/crontab');

    }

}
