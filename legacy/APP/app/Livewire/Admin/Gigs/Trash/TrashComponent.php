<?php

namespace App\Livewire\Admin\Gigs\Trash;

use App\Models\Favorite;
use App\Models\Gig;
use App\Models\OrderItem;
use App\Models\ReportedGig;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\File;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class TrashComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_trashed_gigs'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.gigs.trash.trash', [

            'gigs' => $this->gigs,

        ]);

    }

    /**
     * Get gigs

     *

     * @return object
     */
    public function getGigsProperty()
    {

        return Gig::onlyTrashed()->whereHas('category')->whereHas('subcategory')->paginate(40);

    }

    /**
     * Confirm restoration

     *

     * @param  int  $id
     * @return void
     */
    public function confirmRestore($id)
    {

        // Get gig

        $gig = Gig::onlyTrashed()->where('id', $id)->firstOrFail();

        // Confirm restore

        $this->dialog()->confirm([

            'title' => __('messages.t_confirm_restore'),

            'description' => "<div class='leading-relaxed'>".__('messages.t_are_u_sure_u_want_to_restore_this_gig').'<br>'.$gig->title.'</div>',

            'icon' => 'error',

            'accept' => [

                'label' => __('messages.t_restore'),

                'method' => 'restore',

                'params' => $gig->id,

            ],

            'reject' => [

                'label' => __('messages.t_cancel'),

            ],

        ]);

    }

    /**
     * Restore gig

     *

     * @param  int  $id
     * @return void
     */
    public function restore($id)
    {

        // Get gig

        $gig = Gig::onlyTrashed()->where('id', $id)->firstOrFail();

        // Restore gig

        $gig->restore();

        // Update it's status

        $gig->status = 'active';

        $gig->save();

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

    /**
     * Confirm delete

     *

     * @param  int  $id
     * @return void
     */
    public function confirmDelete($id)
    {

        // Get gig

        $gig = Gig::onlyTrashed()->where('id', $id)->firstOrFail();

        // Confirm delete

        $this->dialog()->confirm([

            'title' => __('messages.t_confirm_delete'),

            'description' => "<div class='leading-relaxed'>".__('messages.t_are_u_sure_u_want_to_prmtly_delete_gig').'<br>'.$gig->title.'<br>'.__('messages.t_all_records_related_to_gig_will_erased').'</div>',

            'icon' => 'error',

            'accept' => [

                'label' => __('messages.t_delete'),

                'method' => 'delete',

                'params' => $gig->id,

            ],

            'reject' => [

                'label' => __('messages.t_cancel'),

            ],

        ]);

    }

    /**
     * Permanently delete this gig

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        try {

            // Get gig

            $gig = Gig::onlyTrashed()->where('id', $id)->firstOrFail();

            // Delete favorite gigs

            Favorite::whereGigId($gig->id)->delete();

            // Get orders that have this gig

            $orders_items = OrderItem::whereGigId($gig->id)->get();

            // Loop through items inside this order

            foreach ($orders_items as $item) {

                // Delete requirements

                $item->requirements()->delete();

                // Delete upgrades

                $item->upgrades()->delete();

                // Delete delivered work

                $item->delivered_work()->delete();

                // Delete conversation in this delivered work

                $item->conversation()->delete();

                // Get refund for this item is exists

                $refund = $item->refund;

                // Check if refund exists

                if ($refund) {

                    // Delete refund conversation

                    $refund->conversation()->delete();

                    // Delete refund

                    $refund->delete();

                }

            }

            // Delete gig faqs

            $gig->faqs()->delete();

            // Get gig pdf documents

            $documents = $gig->documents;

            // Loop through documents

            foreach ($documents as $doc) {

                // Delete this file from local storage first

                if (File::exists(public_path('storage/gigs/documents/'.$doc->name))) {

                    // File exists, delete it

                    File::delete(public_path('storage/gigs/documents/'.$doc->name));

                }

                // Now delete it from database

                $doc->delete();

            }

            // Get gig images

            $images = $gig->images;

            // loop through images

            foreach ($images as $img) {

                // Delete large image

                deleteModelFile($img->large);

                // Delete medium image

                deleteModelFile($img->medium);

                // Delete small image

                deleteModelFile($img->small);

                // Delete this record from database

                $img->delete();

            }

            // Delete thumbnail

            deleteModelFile($gig->thumbnail);

            // Delete gig medium thumbnail

            deleteModelFile($gig->imageMedium);

            // Delete gig large thumbnail

            deleteModelFile($gig->imageLarge);

            // Delete gig seo

            $gig->seo()->delete();

            // Delete upgrades

            $gig->upgrades()->delete();

            // Delete visits for this gig

            $gig->visits()->delete();

            // Get gig requirements

            $requirements = $gig->requirements;

            // loop through requirements

            foreach ($requirements as $req) {

                // Delete options

                $req->options()->delete();

                // Delete requirement

                $req->delete();

            }

            // Delete reviews

            $gig->reviews()->delete();

            // If this gig is reported delete this report

            ReportedGig::whereGigId($gig->id)->delete();

            // Now force deleting this gig

            $gig->forceDelete();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            throw $th;
            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

}
