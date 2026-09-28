<?php

namespace App\Livewire\Admin\Pages\Options;

use App\Http\Validators\Admin\Pages\CreateValidator;
use App\Models\Page;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CreateComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $title = [];

    public $content = [];

    public $slug;

    public $is_link = false;

    public $link;

    public $column;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_page'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.pages.options.create');

    }

    /**
     * Create new page

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Create new page

            $page = new Page;

            $page->uid = uid();

            $page->slug = Str::slug($this->slug);

            $page->is_link = $this->is_link ? 1 : 0;

            $page->link = $this->is_link ? $this->link : null;

            $page->column = $this->column;

            $page->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $page->translateOrNew($language->language_code)->title = isset($this->title[$language->language_code]) && ! empty($this->title[$language->language_code]) ? $this->title[$language->language_code] : null;

                $page->translateOrNew($language->language_code)->content = isset($this->content[$language->language_code]) && ! empty($this->content[$language->language_code]) ? $this->content[$language->language_code] : null;

            }

            // Save again

            $page->save();

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
