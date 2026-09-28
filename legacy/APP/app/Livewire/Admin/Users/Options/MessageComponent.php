<?php

namespace App\Livewire\Admin\Users\Options;

use App\Http\Validators\Admin\Users\SendValidator;
use App\Mail\Admin\Users\SendEmail;
use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Mail;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Locked;
use Livewire\Component;

class MessageComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public User $user;

    public $subject;

    public $message;

    #[Locked]

    public $email;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set user

        $this->user = User::where('uid', $id)->firstOrFail();

        // Fill form

        $this->fill([

            'email' => $this->user->email,

        ]);

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_send_an_email'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.users.options.message');

    }

    /**
     * Send the user an email

     *

     * @return void
     */
    public function send()
    {

        try {

            // Validate form

            SendValidator::validate($this);

            // Send this person an email

            Mail::to($this->user->email)->send(new SendEmail($this->subject, $this->message));

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

            // Refresh

            $this->dispatch('refresh');

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_form_validation_error'), 'error')

            );

            throw $e;
        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

            throw $th;
        }

    }

}
