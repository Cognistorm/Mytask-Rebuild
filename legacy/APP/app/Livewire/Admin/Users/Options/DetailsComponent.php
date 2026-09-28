<?php

namespace App\Livewire\Admin\Users\Options;

use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Livewire\Attributes\Layout;
use Livewire\Component;

class DetailsComponent extends Component
{
    use SEOToolsTrait;

    public $user;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get user

        $user = User::where('uid', $id)->with('level', 'avatar', 'country')->firstOrFail();

        // Set user

        $this->user = $user;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_user_details'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.users.options.details');

    }

}
