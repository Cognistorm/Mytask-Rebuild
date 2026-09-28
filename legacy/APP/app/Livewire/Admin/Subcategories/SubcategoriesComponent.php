<?php

namespace App\Livewire\Admin\Subcategories;

use App\Models\Gig;
use App\Models\Subcategory;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Schema;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class SubcategoriesComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithPagination;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_subcategories'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.subcategories.subcategories', [

            'subcategories' => $this->subcategories,

        ]);

    }

    /**
     * Get list of subcategories

     *

     * @return object
     */
    public function getSubcategoriesProperty()
    {

        return Subcategory::orderByDesc('id')
            ->with(['icon', 'parent' => function ($query) {

                return $query->with('icon')->withTranslation();

            }])
            ->withCount(['gigs'])
            ->withTranslation()
            ->paginate(42);

    }

    /**
     * Delete subcategory

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        // Get subcategory

        $subcategory = Subcategory::where('id', $id)->firstOrFail();

        Schema::disableForeignKeyConstraints();

        // Count gigs in this category

        $gigs = Gig::where('subcategory_id', $subcategory->id)->count();

        // Check if category has any gig

        if ($gigs) {

            // Error

            $this->notification([

                'title' => __('messages.t_error'),

                'description' => __('messages.t_this_subcategory_has_some_gigs_please_edit_it'),

                'icon' => 'error',

            ]);

            return;

        }

        // Check if subcategory has icon

        if ($subcategory->icon) {

            deleteModelFile($subcategory->icon);

        }

        // Check if subcategory has image

        if ($subcategory->image) {

            deleteModelFile($subcategory->image);

        }

        // Delete subcategory

        $subcategory->delete();

        Schema::enableForeignKeyConstraints();

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

}
