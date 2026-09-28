<?php

namespace App\Livewire\Admin\Attributes\Options;

use App\Http\Validators\Admin\Attributes\CreateValidator;
use App\Models\Attribute;
use App\Models\AttributeOption;
use App\Models\Category;
use App\Models\Childcategory;
use App\Models\Subcategory;
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

    public $hint = [];

    public $options = [];

    public $subcategories = [];

    public $childcategories = [];

    public $is_required = false;

    public $is_checked = false;

    public $is_disabled = false;

    public $type;

    public $category_id;

    public $subcategory_id;

    public $childcategory_id;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_create_attribute'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.attributes.options.create', [

            'categories' => $this->categories,

        ]);

    }

    /**
     * Get categories
     */
    public function getCategoriesProperty(): object
    {

        return Category::latest()->withTranslation()->get();

    }

    /**
     * Fetch subcategories

     *

     * @param  int  $id
     */
    public function updatedCategoryId($id): void
    {

        // Fetch subcategories

        $this->subcategories = Subcategory::where('parent_id', $id)
            ->withTranslation()
            ->latest()
            ->get();

    }

    /**
     * Fetch childcategories

     *

     * @param  int  $id
     */
    public function updatedSubcategoryId($id): void
    {

        // Fetch childcategories

        $this->childcategories = Childcategory::where('subcategory_id', $id)
            ->withTranslation()
            ->latest()
            ->get();

    }

    /**
     * Add new option
     */
    public function addOption(): void
    {

        // Check type of this attribute

        if ($this->type === 'select') {

            // Create an option

            $option = [

                'text' => '',

                'value' => '',

            ];

            // Add new option

            array_unshift($this->options, $option);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        }

    }

    /**
     * Delete option from list

     *

     * @param  int  $key
     */
    public function deleteOption($key): void
    {

        // Check type of this attribute

        if ($this->type === 'select') {

            // Delete option from list

            if (isset($this->options[$key])) {

                // Delete it

                unset($this->options[$key]);

            }

            // Refresh value

            $this->options = array_values($this->options);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        }

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

            // Create new attribute

            $attribute = new Attribute;

            $attribute->uid = Str::uuid()->toString();

            $attribute->category_id = $this->category_id;

            $attribute->subcategory_id = $this->subcategory_id;

            $attribute->childcategory_id = $this->childcategory_id;

            $attribute->type = $this->type;

            $attribute->is_required = $this->is_required ? true : false;

            $attribute->is_disabled = $this->is_disabled ? true : false;

            $attribute->is_checked = $this->is_checked ? true : false;

            $attribute->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $attribute->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : null;

                $attribute->translateOrNew($language->language_code)->description = isset($this->description[$language->language_code]) && ! empty($this->description[$language->language_code]) ? $this->description[$language->language_code] : null;

                $attribute->translateOrNew($language->language_code)->hint = isset($this->hint[$language->language_code]) && ! empty($this->hint[$language->language_code]) ? $this->hint[$language->language_code] : null;

            }

            // Save again

            $attribute->save();

            // Check if select attribute

            if ($this->type === 'select') {

                // Loop through options

                foreach ($this->options as $key => $item) {

                    if (isset($item['text']) && isset($item['value'])) {

                        // Save new option

                        $option = new AttributeOption;

                        $option->attribute_id = $attribute->id;

                        $option->attr_text = $item['text'];

                        $option->attr_value = $item['value'];

                        $option->save();

                    }

                }

            }

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
