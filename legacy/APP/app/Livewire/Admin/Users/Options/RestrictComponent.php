<?php

namespace App\Livewire\Admin\Users\Options;

use App\Http\Validators\Admin\Users\RestrictValidator;
use App\Mail\Admin\Users\RestrictEmail;
use App\Models\User;
use App\Models\UserRestriction;
use App\Models\UserRestrictionAppealFile;
use App\Notifications\User\Everyone\AppealAccepted;
use App\Notifications\User\Everyone\AppealRejected;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class RestrictComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public User $user;

    public $message;

    public $files_required = false;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set user

        $this->user = User::where('uid', $id)->with('avatar')->firstOrFail();

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

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_user_restrictions'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.users.options.restrict', [

            'restrictions' => $this->restrictions,

        ]);

    }

    /**
     * Get latest restrictions
     */
    public function getRestrictionsProperty(): LengthAwarePaginator
    {

        return UserRestriction::where('user_id', $this->user->id)
            ->with(['user', 'appeal', 'appeal.attachments', 'appeal.attachments.file'])
            ->latest()
            ->paginate(20);

    }

    /**
     * Restrict user
     */
    public function create(): void
    {

        try {

            // Validate form

            RestrictValidator::validate($this);

            // Create new restriction

            $restriction = new UserRestriction;

            $restriction->uid = Str::uuid()->toString();

            $restriction->user_id = $this->user->id;

            $restriction->message = $this->message;

            $restriction->files_required = $this->files_required ? 1 : 0;

            $restriction->save();

            // Update user's status

            $this->user->update([

                'is_restricted' => true,

                'restriction_id' => $restriction->id,

            ]);

            // Send this user an email

            Mail::to($this->user->email)->send(new RestrictEmail($this->message));

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

            // Refresh the page

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

    /**
     * Delete restriction

     *

     * @param  int  $id
     */
    public function delete($id): void
    {

        try {

            // Get restriction

            $restriction = UserRestriction::where('user_id', $this->user->id)
                ->where('id', $id)
                ->whereIn('status', ['pending', 'rejected', 'approved'])
                ->firstOrFail();

            // Update user's status

            User::where('id', $this->user->id)

                ->where('restriction_id', $restriction->id)

                ->update([

                    'restriction_id' => null,

                ]);

            // Delete restriction response from user, if exists

            $appeal = $restriction->appeal;

            // Delete appeal files

            UserRestrictionAppealFile::where('appeal_id', $appeal?->id)->delete();

            // Delete appeal

            $appeal?->delete();

            // Delete restriction

            $restriction->delete();

            // In case user does not have any restrictions anymore, we have to restore his current status

            User::where('id', $this->user->id)

                ->whereDoesntHave('restrictions')

                ->update([

                    'is_restricted' => false,

                    'restriction_id' => null,

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
     * Approve selected appeal

     *

     * @param  int  $id
     */
    public function approve($id): void
    {

        try {

            // Get restriction

            $restriction = UserRestriction::where('id', $id)
                ->where('user_id', $this->user->id)
                ->where('status', 'submitted')
                ->firstOrFail();

            // Update restriction's status

            $restriction->status = 'approved';

            $restriction->save();

            // Update user's status

            User::where('id', $this->user->id)

                ->where('restriction_id', $restriction->id)

                ->update([

                    'is_restricted' => false,

                    'restriction_id' => null,

                ]);

            // Send user an email

            $this->user->notify(new AppealAccepted);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            // Something went wrong

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

    /**
     * Reject selected appeal

     *

     * @param  int  $id
     */
    public function reject($id): void
    {

        try {

            // Get restriction

            $restriction = UserRestriction::where('id', $id)
                ->where('user_id', $this->user->id)
                ->where('status', 'submitted')
                ->firstOrFail();

            // Update restriction's status

            $restriction->status = 'rejected';

            $restriction->save();

            // Send user an email

            $this->user->notify(new AppealRejected);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            // Something went wrong

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params($th->getMessage(), 'error')

            );

        }

    }

}
