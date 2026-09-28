<?php

namespace App\Livewire\Admin\Countries\Options;

use App\Http\Validators\Admin\Countries\EditValidator;
use App\Models\Country;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Locked;
use Livewire\Component;

class EditComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $name;

    public $code;

    public $is_active;

    #[Locked]

    public $country;

    /**
     * Init component

     *

     * @param  int  $id
     * @return void
     */
    public function mount($id)
    {

        // Get country

        $country = Country::where('id', $id)->firstOrFail();

        // Fill form

        $this->fill([

            'name' => $country->name,

            'code' => $country->code,

            'is_active' => $country->is_active ? 1 : 0,

        ]);

        // Set country

        $this->country = $country;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_country'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.countries.options.edit');

    }

    /**
     * Update country

     *

     * @return void
     */
    public function update()
    {

        try {

            // Get country

            $country = Country::where('id', $this->country->id)->firstOrFail();

            // Validate form

            EditValidator::validate($this);

            // Update

            $country->name = $this->name;

            $country->code = $this->code;

            $country->is_active = $this->is_active ? 1 : 0;

            $country->save();

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
