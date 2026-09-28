<?php

namespace App\Livewire\Admin\Users\Options;

use App\Http\Validators\Admin\Users\CreateValidator;
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

class CreateComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

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

    public $status = 'active';

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_user'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.users.options.create', [

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
     * Create new user

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

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
                    ->resize(100)
                    ->folder('avatars')
                    ->handle();

            } else {

                $avatar_id = null;

            }

            // create new user

            $user = new User;

            $user->uid = uid();

            $user->username = $this->username;

            $user->email = $this->email;

            $user->password = Hash::make($this->password);

            $user->account_type = $this->account_type;

            $user->level_id = $this->level;

            $user->country_id = $this->country;

            $user->fullname = $this->fullname;

            $user->headline = $this->headline;

            $user->description = $this->description;

            $user->status = $this->status;

            $user->balance_available = $this->balance;

            $user->avatar_id = $avatar_id;

            $user->save();

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

}
