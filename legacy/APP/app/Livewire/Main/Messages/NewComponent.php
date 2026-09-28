<?php

namespace App\Livewire\Main\Messages;

use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Livewire\Component;

class NewComponent extends Component
{
    use SEOToolsTrait;

    /**
     * Init component

     *

     * @param  string  $username
     * @return void
     */
    public function mount($username)
    {

        // Get user

        $user = User::where('username', $username)
            ->whereIn('status', ['active', 'verified'])
            ->where('id', '!=', auth()->id())
            ->first();

        // Check if user exists

        if (! $user) {

            return redirect('/');

        }

        // Set redirect url

        $url = "inbox/$user->uid";

        // Redirect to conversation

        return redirect($url);

    }

}
