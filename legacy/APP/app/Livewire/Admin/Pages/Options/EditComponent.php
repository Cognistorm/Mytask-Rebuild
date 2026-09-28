<?php

namespace App\Livewire\Admin\Pages\Options;

use App\Http\Validators\Admin\Pages\EditValidator;
use App\Models\Page;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class EditComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $title = [];

    public $content = [];

    public $slug;

    public $is_link = false;

    public $link;

    public $column;

    public Page $page;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set page

        $this->page = Page::where('uid', $id)->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $this->page->translate($language->language_code);

            // Fill translations

            $this->title[$language->language_code] = ! empty($translation) ? $translation->title : null;

            $this->content[$language->language_code] = ! empty($translation) ? $translation->content : null;

        }

        // Fill form

        $this->fill([

            'slug' => $this->page->slug,

            'is_link' => $this->page->is_link ? 1 : 0,

            'link' => $this->page->link,

            'column' => $this->page->column,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_page'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.pages.options.edit');

    }

    /**
     * Update page

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Update page

            $this->page->slug = Str::slug($this->slug);

            $this->page->is_link = $this->is_link ? 1 : 0;

            $this->page->link = $this->is_link ? $this->link : null;

            $this->page->column = $this->column;

            $this->page->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $this->page->translateOrNew($language->language_code)->title = isset($this->title[$language->language_code]) && ! empty($this->title[$language->language_code]) ? $this->title[$language->language_code] : null;

                $this->page->translateOrNew($language->language_code)->content = isset($this->content[$language->language_code]) && ! empty($this->content[$language->language_code]) ? $this->content[$language->language_code] : null;

            }

            // Save again

            $this->page->save();

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
