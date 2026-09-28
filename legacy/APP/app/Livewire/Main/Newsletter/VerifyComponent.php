<?php

namespace App\Livewire\Main\Newsletter;

use App\Mail\User\Everyone\NewsletterApproved;
use App\Models\NewsletterVerification;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Mail;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Component;
use WireUi\Traits\Actions;

class VerifyComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $token;

    protected $queryString = [

        'token' => ['as' => 'id'],

    ];

    /**
     * Init component

     *

     * @param  string  $slug
     * @return void
     */
    public function mount()
    {

        // Get email

        $verification = NewsletterVerification::where('token', $this->token)->first();

        // Check if it exists

        if (! $verification) {

            return redirect('/');

        }

        // Verify email

        $verification->list->update([

            'status' => 'verified',

        ]);

        // Send welcome message

        Mail::to($verification->list->email)->send(new NewsletterApproved);

        // Delete verification

        $verification->delete();

        // Success

        return redirect('/');

    }

}
