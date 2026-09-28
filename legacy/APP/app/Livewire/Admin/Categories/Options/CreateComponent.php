<?php

namespace App\Livewire\Admin\Categories\Options;

use App\Http\Validators\Admin\Categories\CreateValidator;
use App\Models\Category;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class CreateComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $name = [];

    public $content_top = [];

    public $content_bottom = [];

    public $slug;

    public $description;

    public $icon;

    public $image;

    public $is_visible = false;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_category'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.categories.options.create');

    }

    /**
     * Create new category

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Upload categorory icon

            if ($this->icon) {

                $icon_id = ImageUploader::make($this->icon)->resize(100, 100)->folder('categories')->handle();

            } else {

                $icon_id = null;

            }

            // Upload category image

            if ($this->image) {

                $image_id = ImageUploader::make($this->image)->folder('categories')->handle();

            } else {

                $image_id = null;

            }

            // Save category

            $category = new Category;

            $category->uid = uid();

            $category->slug = Str::slug($this->slug);

            $category->description = $this->description ? $this->description : null;

            $category->icon_id = $icon_id;

            $category->image_id = $image_id;

            $category->is_visible = $this->is_visible ? true : false;

            $category->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $category->translateOrNew($language->language_code)->name = isset($this->name[$language->language_code]) && ! empty($this->name[$language->language_code]) ? $this->name[$language->language_code] : null;

                $category->translateOrNew($language->language_code)->content_top = isset($this->content_top[$language->language_code]) && ! empty($this->content_top[$language->language_code]) ? $this->content_top[$language->language_code] : null;

                $category->translateOrNew($language->language_code)->content_bottom = isset($this->content_bottom[$language->language_code]) && ! empty($this->content_bottom[$language->language_code]) ? $this->content_bottom[$language->language_code] : null;

            }

            // Save again

            $category->save();

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
