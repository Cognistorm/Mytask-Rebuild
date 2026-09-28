<?php

namespace App\Livewire\Admin\Projects\Categories;

use App\Models\Project;
use App\Models\ProjectCategory;
use App\Models\ProjectSkill;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class CategoriesComponent extends Component
{
    use Actions, SEOToolsTrait, LivewireAlert;

    public $alternative_category;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {
        
        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_projects_categories'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.categories.categories', [

            'categories' => $this->categories,

        ]);

    }

    /**
     * Get projects categories

     *

     * @return object
     */
    public function getCategoriesProperty()
    {

        return ProjectCategory::latest()->with('translations')->paginate(40);

    }

    /**
     * Delete category

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        try {

            // Get category

            $category = ProjectCategory::where('id', $id)->firstOrFail();

            // Check if this category has projects

            if ($category->projects()->count()) {

                // Check if an alternative category selected

                if (! $this->alternative_category) {

                    // Error

                    $this->notification([

                        'title' => __('messages.t_error'),

                        'description' => __('messages.t_pls_select_altr_project_category'),

                        'icon' => 'error',

                    ]);

                    return;

                }

                // Check if this category exists

                if (! ProjectCategory::where('id', $this->alternative_category)->where('id', '!=', $category->id)->first()) {

                    // Error

                    $this->notification([

                        'title' => __('messages.t_error'),

                        'description' => __('messages.t_selected_altern_project_cat_not_found'),

                        'icon' => 'error',

                    ]);

                    return;

                }

                // Move projects

                Project::where('category_id', $category->id)->update([

                    'category_id' => $this->alternative_category,

                ]);

                // Update skills

                ProjectSkill::where('category_id', $id)->update([

                    'category_id' => $this->alternative_category,

                ]);

            }

            // Delete translations

            if ($category->translation()->count()) {

                foreach ($category->translation as $trans) {

                    $trans->delete();

                }

            }

            // Now delete this category

            $category->delete();

            // Reset alternative category

            $this->reset('alternative_category');

            // Close modal

            $this->dispatch('close-modal', 'modal-delete-category-container');

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

}
