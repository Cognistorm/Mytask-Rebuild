<?php

namespace App\Livewire\Admin\Levels\Options;

use App\Http\Validators\Admin\Levels\DeleteValidator;
use App\Models\Level;
use App\Models\SettingsAuth;
use App\Models\User;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Locked;
use Livewire\Component;

class DeleteComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public Level $level;

    #[Locked]

    public $levels;

    public $default_buyer_level;

    public $default_seller_level;

    public $new_level;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set level

        $this->level = Level::where('uid', $id)->withCount('users')->firstOrFail();

        // Get other levels

        $this->levels = Level::where('id', '!=', $this->level->id)
            ->where('account_type', $this->level->account_type)
            ->withTranslation()
            ->get();

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

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_delete_level'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.levels.options.delete');

    }

    /**
     * Delete level

     *

     * @return void
     */
    public function delete()
    {

        try {

            // Validate form

            DeleteValidator::validate($this);

            // Get authentication settings

            $settings = settings('auth');

            // Check if we have to update the current default buyer/seller level

            if ($settings->default_buyer_level_id == $this->level->id || $settings->default_seller_level_id == $this->level->id) {

                // You must set a default level first

                if (! $this->default_buyer_level && ! $this->default_seller_level) {

                    // Error

                    $this->alert(

                        'error',

                        __('messages.t_error'),

                        livewire_alert_params(__('dashboard.t_pls_choose_a_default_buyers_sellers_level'), 'error')

                    );

                    return;

                }

                // Check current level type

                if ($this->level->account_type == 'seller') {

                    // Update default seller

                    SettingsAuth::first()->update([

                        'default_seller_level_id' => $this->default_seller_level,

                    ]);

                } else {

                    // Update default buyer

                    SettingsAuth::first()->update([

                        'default_buyer_level_id' => $this->default_buyer_level,

                    ]);

                }

                // Update cache

                settings('auth', true);

            }

            // Update users with current level

            User::where('level_id', $this->level->id)->update([

                'level_id' => $this->new_level,

            ]);

            // Delete this level's translations

            $this->level->deleteTranslations();

            // Delete level

            $this->level->delete();

            // Go back to levels page

            return redirect(admin_url('levels'))->with('success', __('messages.t_toast_operation_success'));

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
