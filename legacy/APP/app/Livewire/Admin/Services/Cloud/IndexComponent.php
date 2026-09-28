<?php

namespace App\Livewire\Admin\Services\Cloud;

use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Livewire\Attributes\Layout;
use Livewire\Component;

class IndexComponent extends Component
{
    use SEOToolsTrait;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_cloud_storage'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.services.cloud.index');

    }

}
