<?php

namespace App\Livewire\Admin\Countries\Options;

use App\Http\Validators\Admin\Countries\CreateValidator;
use App\Models\Country;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CreateComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $name;

    public $code;

    public $is_active = 1;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_country'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.countries.options.create');

    }

    /**
     * Create new country

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Create new country

            $country = new Country;

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
