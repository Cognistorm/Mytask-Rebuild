<?php

namespace App\Livewire\Main\Account;

use App\Http\Validators\Main\Account\Profile\AvatarValidator;
use App\Utils\Uploader\ImageUploader;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class SidebarComponent extends Component
{
    use Actions, LivewireAlert, WithFileUploads;

    public $avatar;
    public $class;

    /**
     * Get the view / contents that represent the component.
     *
     * @return \Illuminate\Contracts\View\View|\Closure|string
     */
    public function render()
    {
        return view('components.main.account.sidebar');
    }

    /**
     * Remove current avatar
     *
     * @return void
     */
    public function removeAvatar()
    {
        try {
            if (auth()->user()->avatar_id) {
                $uploader = new ImageUploader();
                $uploader->deleteById(auth()->user()->avatar_id);
            }

            auth()->user()->update([
                'avatar_id' => null,
            ]);

            $this->notification([
                'title' => __('messages.t_success'),
                'description' => __('messages.t_avatar_updated_successfully'),
                'icon' => 'success',
            ]);

            $this->dispatch('avatarUpdated');

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
     * Handle avatar upload automatically when file is selected
     *
     * @return void
     */
    public function updatedAvatar()
    {
        try {

            AvatarValidator::validate($this);

            $avatar_id = ImageUploader::make($this->avatar)
                ->deleteById(auth()->user()->avatar_id)
                ->resize(100)
                ->folder('avatars')
                ->handle();

            // Update user avatar

            auth()->user()->update([

                'avatar_id' => $avatar_id,

            ]);

            // Success

            $this->notification([

                'title' => __('messages.t_success'),

                'description' => __('messages.t_avatar_updated_successfully'),

                'icon' => 'success',

            ]);

            // Refresh the page to show updated avatar
            $this->dispatch('avatarUpdated');


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
