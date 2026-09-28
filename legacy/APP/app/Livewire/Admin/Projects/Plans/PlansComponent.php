<?php

namespace App\Livewire\Admin\Projects\Plans;

use App\Models\ProjectBiddingPlan;
use App\Models\ProjectPlan;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\File;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class PlansComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $alert = false;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Check if alert must be hidden

        if (File::exists(base_path('regular'))) {

            $this->alert = true;

        }

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_projects_plans'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.projects.plans.plans', [

            'plans' => $this->plans,

            'bidding_plans' => $this->bidding_plans,

        ]);

    }

    /**
     * Get projects plans plans

     *

     * @return object
     */
    public function getPlansProperty()
    {

        return ProjectPlan::all();

    }

    /**
     * Get bidding pormotion plans

     *

     * @return object
     */
    public function getBiddingPlansProperty()
    {

        return ProjectBiddingPlan::all();

    }

    /**
     * Activate plan plan

     *

     * @param  string  $id
     * @return void
     */
    public function activate($id)
    {

        // Disable plan

        ProjectPlan::where('id', $id)->update([

            'is_active' => true,

        ]);

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

    /**
     * Disable selected plan

     *

     * @param  string  $id
     * @return void
     */
    public function disable($id)
    {

        // Disable plan

        ProjectPlan::where('id', $id)->update([

            'is_active' => false,

        ]);

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

    /**
     * Hide alert message

     *

     * @return void
     */
    public function hideAlert()
    {

        // Delete file

        File::delete(base_path('regular'));

        // Hide alert

        $this->alert = false;

    }

}
