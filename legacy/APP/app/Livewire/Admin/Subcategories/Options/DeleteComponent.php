<?php

namespace App\Livewire\Admin\Subcategories\Options;

use App\Models\Category;
use App\Models\Childcategory;
use App\Models\Gig;
use App\Models\Project;
use App\Models\Subcategory;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class DeleteComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithFileUploads;

    public Subcategory $subcategory;

    public $subcategories = [];

    public $childcategories = [];

    public $category_id;

    public $subcategory_id;

    public $childcategory_id;

    /**
     * Initialize component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set subcategory

        $this->subcategory = Subcategory::where('uid', $id)->firstOrFail();

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

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_delete_subcategory'), true));

        $this->seo()->setDescription(settings('seo')->description);

        // Show view

        return view('livewire.admin.subcategories.options.delete', [

            'categories' => $this->categories,

        ]);

    }

    /**
     * Get all parent categories

     *

     * @return object
     */
    public function getCategoriesProperty()
    {

        return Category::orderBy('id')
            ->withTranslation()
            ->get();

    }

    /**
     * Get all subcategories

     *

     * @return object
     */
    public function updatedCategoryId($id)
    {

        $this->subcategories = Subcategory::orderBy('id')
            ->where('parent_id', $id)
            ->where('id', '!=', $this->subcategory->id)
            ->withTranslation()
            ->get();

    }

    /**
     * Get all childcategories

     *

     * @return object
     */
    public function updatedSubcategoryId($id)
    {

        $this->childcategories = Childcategory::orderBy('id')
            ->where('parent_id', $this->category_id)
            ->where('subcategory_id', '!=', $this->subcategory->id)
            ->withTranslation()
            ->get();

    }

    /**
     * Delete record

     *

     * @return mixed
     */
    public function delete()
    {

        try {

            // Update gigs

            Gig::where('subcategory_id', $this->subcategory->id)

                ->update([

                    'category_id' => $this->category_id,

                    'subcategory_id' => $this->subcategory_id,

                    'childcategory_id' => $this->childcategory_id,

                ]);

            // Update projects

            Project::where('subcategory_id', $this->subcategory->id)
                ->update([

                    'category_id' => $this->category_id,

                    'subcategory_id' => $this->subcategory_id,

                    'childcategory_id' => $this->childcategory_id,

                ]);

            // Update childcategories

            Childcategory::where('subcategory_id', $this->subcategory->id)
                ->update([

                    'parent_id' => $this->category_id,

                    'subcategory_id' => $this->subcategory_id,

                ]);

            // delete all translations

            $this->subcategory->deleteTranslations();

            // Delete this subcategory now

            $this->subcategory->delete();

            // Set success message

            session()->flash('success', __('messages.t_toast_operation_success'));

            // Go back

            return $this->redirect(admin_url('subcategories'));

        } catch (\Throwable $th) {

            // Somthing went wrong

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

}
