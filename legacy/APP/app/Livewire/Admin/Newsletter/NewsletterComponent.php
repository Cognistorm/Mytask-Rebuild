<?php

namespace App\Livewire\Admin\Newsletter;

use App\Exports\NewsletterExport;
use App\Mail\User\Everyone\NewsletterVerification as EveryoneNewsletterVerification;
use App\Models\NewsletterList;
use App\Models\NewsletterVerification;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use Maatwebsite\Excel\Facades\Excel;

class NewsletterComponent extends Component
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_newsletter'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.newsletter.newsletter', [

            'lists' => $this->lists,

        ]);

    }

    /**
     * Get list of newsletter lists

     *

     * @return object
     */
    public function getListsProperty()
    {

        return NewsletterList::latest()->paginate(42);

    }

    /**
     * Export emails

     *

     * @param  string  $type
     * @return void
     */
    public function export($type)
    {

        // Check type of export

        if (! in_array($type, ['all', 'pending', 'verified'])) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_pls_select_export_type'), 'error')

            );

            return;

        }

        // Export data

        return Excel::download(new NewsletterExport($type), Str::uuid()->toString().'.xlsx');

    }

    /**
     * Resend verification token

     *

     * @param  int  $id
     * @return void
     */
    public function resend($id)
    {

        // Get list

        $list = NewsletterList::where('id', $id)->where('status', 'pending')->firstOrFail();

        // Delete old verifications

        NewsletterVerification::where('list_id', $list->id)->delete();

        // Generate new verification token

        $verification = new NewsletterVerification;

        $verification->list_id = $list->id;

        $verification->token = uid(60);

        $verification->save();

        // Send verification message again

        Mail::to($list->email)->send(new EveryoneNewsletterVerification($verification->token));

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_a_verification_link_sent_to_this_email'))

        );

    }

    /**
     * delete email from list

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        // Get list

        $list = NewsletterList::where('id', $id)->firstOrFail();

        // Delete verification tokens

        NewsletterVerification::where('list_id', $list->id)->delete();

        // Delete email

        $list->delete();

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_email_newsletter_deleted_success'))

        );

    }

}
