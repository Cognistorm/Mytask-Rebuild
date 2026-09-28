<?php

namespace App\Livewire\Admin\Subcategories\Options;

use App\Http\Validators\Admin\Subcategories\CreateValidator;
use App\Models\Category;
use App\Models\Subcategory;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class CreateComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $name = [];

    public $content_top = [];

    public $content_bottom = [];

    public $slug;

    public $description;

    public $icon;

    public $image;

    public $parent_id;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_subcategory'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.subcategories.options.create', [

            'categories' => $this->categories,

        ]);

    }

    /**
     * Get all parent categories

     *

     * @return object
     */
    public function getCategoriesProperty()
    {

        return Category::orderBy('id')
            ->withTranslation()
            ->get();

    }

    /**
     * Create new subcategory

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Upload subcategorory icon

            if ($this->icon) {

                $icon_id = ImageUploader::make($this->icon)->resize(100, 100)->folder('subcategories')->handle();

            } else {

                $icon_id = null;

            }

            // Upload subcategory image

            if ($this->image) {

                $image_id = ImageUploader::make($this->image)->folder('subcategories')->handle();

            } else {

                $image_id = null;

            }

            // Save subcategory

            $subcategory = new Subcategory;

            $subcategory->uid = uid();

            $subcategory->slug = Str::slug($this->slug);

            $subcategory->description = $this->description ? $this->description : null;

            $subcategory->icon_id = $icon_id;

            $subcategory->image_id = $image_id;

            $subcategory->parent_id = $this->parent_id;

            $subcategory->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $subcategory->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : null;

                $subcategory->translateOrNew($language->language_code)->content_top = isset($this->content_top[$language->language_code]) && ! empty($this->content_top[$language->language_code]) ? $this->content_top[$language->language_code] : null;

                $subcategory->translateOrNew($language->language_code)->content_bottom = isset($this->content_bottom[$language->language_code]) && ! empty($this->content_bottom[$language->language_code]) ? $this->content_bottom[$language->language_code] : null;

            }

            // Save again

            $subcategory->save();

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
