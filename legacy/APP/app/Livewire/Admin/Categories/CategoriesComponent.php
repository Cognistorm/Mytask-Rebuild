<?php

namespace App\Livewire\Admin\Categories;

use App\Models\Category;
use App\Models\Gig;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Schema;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class CategoriesComponent extends Component
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_categories'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.categories.categories', [

            'categories' => $this->categories,

        ]);

    }

    /**
     * Get list of categories

     *

     * @return object
     */
    public function getCategoriesProperty()
    {

        return Category::orderByDesc('id')->with('icon')->withCount(['gigs', 'projects'])->paginate(42);

    }

    /**
     * Delete category

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id, $isConfirm = false)
    {

        dd($isConfirm);

        // Get category

        $category = Category::where('id', $id)->firstOrFail();

        // Count gigs in this category

        $gigs = Gig::where('category_id', $category->id)->count();

        // Check if category has any gig

        if ($gigs) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_this_category_has_some_gigs_please_edit_it'), 'error')

            );

            return;

        }

        // Disable foreign key check

        Schema::disableForeignKeyConstraints();

        // Check if category has icon

        if ($category->icon) {

            deleteModelFile($category->icon);

        }

        // Check if category has image

        if ($category->image) {

            deleteModelFile($category->image);

        }

        // Delete category

        $category->delete();

        // Disable foreign key check

        Schema::enableForeignKeyConstraints();

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

}
