<?php

namespace App\Livewire\Admin\Packages\Options;

use App\Http\Validators\Admin\Packages\CreateValidator;
use App\Models\Package;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CreateComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $name = [];

    public $description = [];

    public $is_enabled = true;

    public $is_primary = false;

    public $order_number;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_create_package'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.packages.options.create');

    }

    /**
     * Create new package

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Before we create this packge

            // In case this package is primary,

            // we have to change the status of existing primary package

            if ($this->is_primary) {

                // Change status

                Package::where('is_primary', true)->update([

                    'is_primary' => false,

                ]);

            }

            // Save package

            $package = new Package;

            $package->uuid = Str::uuid()->toString();

            $package->is_enabled = $this->is_enabled ? true : false;

            $package->is_primary = $this->is_primary ? true : false;

            $package->order_number = $this->order_number;

            $package->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $package->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : null;

                $package->translateOrNew($language->language_code)->description = isset($this->description[$language->language_code]) && ! empty($this->description[$language->language_code]) ? $this->description[$language->language_code] : null;

            }

            // Save again

            $package->save();

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

            // Throw errors

            throw $e;
        } catch (\Throwable $th) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')

            );

            // Throw error

            throw $th;
        }

    }

}
