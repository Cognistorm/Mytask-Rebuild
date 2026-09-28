<?php

namespace App\Livewire\Admin\Verifications;

use App\Models\User;
use App\Models\VerificationCenter;
use App\Notifications\User\Everyone\VerificationApproved;
use App\Notifications\User\Everyone\VerificationDeclined;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class VerificationsComponent extends Component
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_verification_center'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.verifications.verifications', [

            'verifications' => $this->verifications,

        ]);

    }

    /**
     * Get list of verifications

     *

     * @return object
     */
    public function getVerificationsProperty()
    {

        return VerificationCenter::with(['frontside', 'backside', 'selfie', 'user'])->latest()->paginate(42);

    }

    /**
     * Approve selected verification

     *

     * @param  int  $id
     * @return void
     */
    public function approve($id)
    {

        // Get verification

        $verification = VerificationCenter::where('id', $id)->where('status', 'pending')->firstOrFail();

        // Get user

        $user = User::where('id', $verification->user_id)->firstOrFail();

        // Update user status

        $user->status = 'verified';

        $user->save();

        // Send notification

        $user->notify((new VerificationApproved)->locale(config('app.locale')));

        // Update verification status

        $verification->status = 'verified';

        $verification->verified_at = now();

        $verification->save();

        // Send notification

        notification([

            'text' => 't_ur_account_has_verified',

            'action' => url('account/verification'),

            'user_id' => $user->id,

        ]);

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

    /**
     * Decline selected verification

     *

     * @param  int  $id
     * @return void
     */
    public function decline($id)
    {

        // Get verification

        $verification = VerificationCenter::where('id', $id)->where('status', 'pending')->firstOrFail();

        // Get user

        $user = User::where('id', $verification->user_id)->firstOrFail();

        // Send notification

        $user->notify((new VerificationDeclined)->locale(config('app.locale')));

        // Update verification status

        $verification->status = 'declined';

        $verification->declined_at = now();

        $verification->save();

        // Send notification

        notification([

            'text' => 't_verification_files_declined',

            'action' => url('account/verification'),

            'user_id' => $user->id,

        ]);

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

}
