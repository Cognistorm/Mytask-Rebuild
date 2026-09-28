<?php

namespace App\Livewire\Admin\Attributes\Options;

use App\Http\Validators\Admin\Attributes\EditValidator;
use App\Models\Attribute;
use App\Models\AttributeOption;
use App\Models\Category;
use App\Models\Childcategory;
use App\Models\Subcategory;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class EditComponent extends Component
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

    public Attribute $attribute;

    /**
     * Initialize component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set attribute

        $this->attribute = Attribute::where('uid', $id)->with(['category', 'subcategory', 'childcategory', 'options'])->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $this->attribute->translate($language->language_code);

            // Fill translations

            $this->name[$language->language_code] = ! empty($translation) ? $translation->name : null;

            $this->description[$language->language_code] = ! empty($translation) ? $translation->description : null;

            $this->hint[$language->language_code] = ! empty($translation) ? $translation->hint : null;

        }

        // Check if type is select element

        if ($this->attribute->type === 'select') {

            // Loop through options

            foreach ($this->attribute?->options as $option) {

                // Insert option

                array_push($this->options, [

                    'id' => $option->id,

                    'text' => $option->attr_text,

                    'value' => $option->attr_value,

                ]);

            }

        }

        // Set subcategories

        $this->subcategories = Subcategory::where('parent_id', $this->attribute->category_id)
            ->withTranslation()
            ->latest()
            ->get();

        // Set childcategories

        $this->childcategories = Childcategory::where('subcategory_id', $this->attribute->subcategory_id)
            ->withTranslation()
            ->latest()
            ->get();

        // Fill form

        $this->fill([

            'is_required' => $this->attribute->is_required ? 1 : 0,

            'is_checked' => $this->attribute->is_checked ? 1 : 0,

            'is_disabled' => $this->attribute->is_disabled ? 1 : 0,

            'type' => $this->attribute->type,

            'category_id' => $this->attribute->category_id,

            'subcategory_id' => $this->attribute->subcategory_id,

            'childcategory_id' => $this->attribute->childcategory_id,

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

        $this->seo()->setTitle(setSeoTitle(__('dashboard.t_edit_attribute'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.attributes.options.edit', [

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
     * Update attribite

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Edit attribute

            $this->attribute->category_id = $this->category_id;

            $this->attribute->subcategory_id = $this->subcategory_id;

            $this->attribute->childcategory_id = $this->childcategory_id;

            $this->attribute->type = $this->type;

            $this->attribute->is_required = $this->is_required ? true : false;

            $this->attribute->is_disabled = $this->is_disabled ? true : false;

            $this->attribute->is_checked = $this->is_checked ? true : false;

            // Save translations

            foreach (supported_languages() as $language) {

                $this->attribute->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : null;

                $this->attribute->translateOrNew($language->language_code)->description = isset($this->description[$language->language_code]) && ! empty($this->description[$language->language_code]) ? $this->description[$language->language_code] : null;

                $this->attribute->translateOrNew($language->language_code)->hint = isset($this->hint[$language->language_code]) && ! empty($this->hint[$language->language_code]) ? $this->hint[$language->language_code] : null;

            }

            // Save again

            $this->attribute->save();

            // Check if select attribute

            if ($this->type === 'select') {

                // Loop through options

                foreach ($this->options as $key => $item) {

                    if (isset($item['text']) && isset($item['value'])) {

                        // First check if we have to just update the current option

                        // Or we need to create a new one

                        if (isset($item['id'])) {

                            // Update option

                            AttributeOption::where('id', $item['id'])
                                ->where('attribute_id', $this->attribute->id)
                                ->update([

                                    'attr_text' => $item['text'],

                                    'attr_value' => $item['value'],

                                ]);

                        } else {

                            // Create new option

                            $option = new AttributeOption;

                            $option->attribute_id = $this->attribute->id;

                            $option->attr_text = $item['text'];

                            $option->attr_value = $item['value'];

                            $option->save();

                        }

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
