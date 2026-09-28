<?php

namespace App\Livewire\Admin\Users\Options;

use App\Http\Validators\Admin\Users\EditValidator;
use App\Models\Country;
use App\Models\Level;
use App\Models\User;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Hash;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class EditComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public User $user;

    public $username;

    public $email;

    public $password;

    public $account_type;

    public $level;

    public $country;

    public $fullname;

    public $headline;

    public $description;

    public $balance;

    public $avatar;

    public $status;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get user

        $user = User::where('uid', $id)->with(['level', 'avatar', 'level.badge'])->firstOrFail();

        // Fill form

        $this->fill([

            'username' => $user->username,

            'email' => $user->email,

            'account_type' => $user->account_type,

            'level' => $user->level_id,

            'country' => $user->country_id,

            'fullname' => $user->fullname,

            'headline' => $user->headline,

            'description' => $user->description,

            'status' => $user->status,

            'balance' => $user->balance_available,

        ]);

        // Set user

        $this->user = $user;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_user'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.users.options.edit', [

            'countries' => $this->countries,

            'levels' => $this->levels,

        ]);

    }

    /**
     * Get countries

     *

     * @return object
     */
    public function getCountriesProperty()
    {

        return Country::where('is_active', true)->orderBy('name', 'asc')->get();

    }

    /**
     * Get levels

     *

     * @return object
     */
    public function getLevelsProperty()
    {

        return Level::withTranslation()->get();

    }

    /**
     * Edit user

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Get level

            $level = Level::where('id', $this->level)->firstOrFail();

            // This level must be same as account type

            if ($level->account_type !== $this->account_type) {

                // Error

                $this->alert(

                    'error',

                    __('messages.t_error'),

                    livewire_alert_params(__('messages.t_selected_level_not_valid_for_account_type'), 'error')

                );

                return;

            }

            // Check if request has avatar image

            if ($this->avatar) {

                $avatar_id = ImageUploader::make($this->avatar)
                    ->deleteById($this->user->avatar_id)
                    ->resize(100)
                    ->folder('avatars')
                    ->handle();

            } else {

                $avatar_id = $this->user->avatar_id;

            }

            // Update user

            $this->user->username = $this->username;

            $this->user->email = $this->email;

            $this->user->password = $this->password ? Hash::make($this->password) : $this->user->password;

            $this->user->account_type = $this->account_type;

            $this->user->level_id = $this->level;

            $this->user->country_id = $this->country;

            $this->user->fullname = $this->fullname;

            $this->user->headline = $this->headline;

            $this->user->description = $this->description;

            $this->user->status = $this->status;

            $this->user->balance_available = $this->balance;

            $this->user->avatar_id = $avatar_id;

            $this->user->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

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
