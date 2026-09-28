<?php

namespace App\Livewire\Admin\Packages\Options;

use App\Http\Validators\Admin\Packages\EditValidator;
use App\Models\Package;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class EditComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public Package $package;

    public $name = [];

    public $description = [];

    public $is_enabled;

    public $is_primary;

    public $order_number;

    /**
     * Initialize component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set package

        $this->package = Package::where('uuid', $id)->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $this->package->translate($language->language_code);

            // Fill translations

            $this->fill([

                "name.{$language->language_code}" => ! empty($translation) ? $translation->name : null,

                "description.{$language->language_code}" => ! empty($translation) ? $translation->description : null,

            ]);

        }

        // Fill form

        $this->fill([

            'is_enabled' => $this->package->is_enabled ? 1 : 0,

            'is_primary' => $this->package->is_primary ? 1 : 0,

            'order_number' => $this->package->order_number,

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

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_edit_package'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.packages.options.edit');

    }

    /**
     * Update package

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Before we create this packge

            // In case this package is primary,

            // we have to change the status of existing primary package

            if ($this->is_primary) {

                // Change status

                Package::where('id', '!=', $this->package->id)->where('is_primary', true)->update([

                    'is_primary' => false,

                ]);

            }

            // Update package

            $this->package->is_enabled = $this->is_enabled ? true : false;

            $this->package->is_primary = $this->is_primary ? true : false;

            $this->package->order_number = $this->order_number;

            $this->package->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $this->package->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : null;

                $this->package->translateOrNew($language->language_code)->description = isset($this->description[$language->language_code]) && ! empty($this->description[$language->language_code]) ? $this->description[$language->language_code] : null;

            }

            // Save again

            $this->package->save();

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
