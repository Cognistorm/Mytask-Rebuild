<?php

namespace App\Livewire\Admin\Attributes;

use App\Models\Attribute;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class AttributesComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_attributes'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.attributes.attributes', [

            'attributes' => $this->attributes_list,

        ]);

    }

    /**
     * Get list of attributes

     *

     * @return object
     */
    public function getAttributesListProperty()
    {

        return Attribute::withTranslation()
            ->with('options', 'category', 'subcategory', 'childcategory')
            ->latest('id')
            ->paginate(42);

    }

}
