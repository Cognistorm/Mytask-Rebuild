<?php

namespace App\Livewire\Admin\Reports;

use App\Models\ProjectReportedBid;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use WireUi\Traits\Actions;

class BidsComponent extends Component
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_reported_bids'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.reports.bids', [

            'reports' => $this->reports,

        ]);

    }

    /**
     * Get list of reports

     *

     * @return object
     */
    public function getReportsProperty()
    {

        return ProjectReportedBid::with(['bid', 'user'])->latest()->paginate(42);

    }

    /**
     * Mark report as seen

     *

     * @param  int  $id
     * @return void
     */
    public function mark($id)
    {

        try {

            // Update status

            ProjectReportedBid::where('id', $id)->where('is_seen', false)->update([

                'is_seen' => true,

            ]);

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

    /**
     * Get report details

     *

     * @param  int  $id
     * @return void
     */
    public function details($id)
    {

        try {

            // Get report

            $report = ProjectReportedBid::where('id', $id)->firstOrFail();

            // Set details

            $details = clean($report->description);

            // Show dialog

            $this->dialog()->confirm([

                'title' => '<h1 class="text-base font-bold tracking-wide -mt-1 mb-4">'.__('messages.t_report_bid_'.$report->reason).'</h1>',

                'description' => "<div class='leading-relaxed'>".nl2br($details).'</div>',

                'icon' => 'clipboard-list',

                'iconColor' => 'text-slate-500 dark:text-secondary-400 p-1',

                'iconBackground' => 'bg-slate-100 rounded-full p-3 dark:bg-secondary-700',

                'accept' => [

                    'label' => __('messages.t_confirm'),

                    'color' => 'secondary',

                ],

                'reject' => [

                    'label' => __('messages.t_cancel'),

                ],

            ]);

        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

        }

    }

}
