<?php

namespace App\Livewire\Admin\Refunds;

use App\Models\Refund;
use App\Models\ProjectRefund;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class RefundsComponent extends Component
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_refunds'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.refunds.refunds', [

            'refunds' => $this->refunds,

        ]);

    }

    /**
     * Get list of refunds

     *

     * @return object
     */
    public function getRefundsProperty()
    {
        // Get gig refunds
        $gigRefunds = Refund::with(['item.gig', 'seller', 'buyer'])
            ->latest()
            ->get()
            ->map(function ($refund) {
                $refund->type = 'gig';
                return $refund;
            });

        // Get project refunds
        $projectRefunds = ProjectRefund::with(['project', 'freelancer', 'client'])
            ->latest()
            ->get()
            ->map(function ($refund) {
                $refund->type = 'project';
                return $refund;
            });

        // Combine and sort by created_at
        $allRefunds = $gigRefunds->concat($projectRefunds)
            ->sortByDesc('created_at')
            ->values();

        // Manual pagination
        $perPage = 42;
        $currentPage = request()->get('page', 1);
        $offset = ($currentPage - 1) * $perPage;

        $items = $allRefunds->slice($offset, $perPage);
        $total = $allRefunds->count();

        return new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $currentPage,
            [
                'path' => request()->url(),
                'pageName' => 'page',
            ]
        );

    }

}
