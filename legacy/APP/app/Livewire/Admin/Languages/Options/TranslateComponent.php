<?php

namespace App\Livewire\Admin\Languages\Options;

use App\Models\Language;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

class TranslateComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    public Language $language;

    #[Url()]

    public $page;

    #[Url()]

    public $q;

    public $data;

    /**
     * Init component

     *

     * @param  int  $id
     * @return void
     */
    public function mount($id)
    {

        // Clear search query

        $this->q = clean($this->q);

        // Set language

        $this->language = Language::where('uid', $id)->firstOrFail();

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_translation'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.languages.options.translate', [

            'translation' => $this->translation,

        ]);

    }

    /**
     * Get translation

     *

     * @return object
     */
    public function getTranslationProperty()
    {

        // Set lang code

        $code = strtolower($this->language->language_code);

        // Check if directory exists

        if (! File::exists(lang_path($code))) {

            // Create new folder

            File::makeDirectory(lang_path($code));

        }

        // Check if translation file exists

        if (! File::exists(lang_path($code.'/messages.php'))) {

            // Copy translation file to new folder

            File::copy(lang_path('en/messages.php'), lang_path($code.'/messages.php'));

            File::copy(lang_path('en/dashboard.php'), lang_path($code.'/dashboard.php'));

        }

        // Get translation

        $items = include lang_path($this->language->language_code.'/messages.php');

        // Check if has a query

        if ($this->q) {

            // Get keyword

            $q = preg_quote(clean($this->q), '~');

            // Fetch results

            $items = preg_grep('~'.$q.'~', $items);

        }

        $this->data = $items;

        $page = $this->page;

        $items = $items instanceof Collection ? $items : Collection::make($items);

        return new LengthAwarePaginator($items->forPage($page, 40), $items->count(), 40, $page, ['path' => admin_url('languages/translate/'.$this->language->uid)]);

    }

    /**
     * Check when value updated

     *

     * @param  string  $value
     * @param  string  $key
     * @return void
     */
    public function update($key)
    {

        try {

            // Set new value

            $value = $this->data[$key];

            // Get language path

            $path = lang_path($this->language->language_code.'/messages.php');

            // Get strings

            $strings = require_once $path;

            // First let's check if admin made any changes

            if ($value != $strings[$key]) {

                // Set new writer

                $writer = new \October\Rain\Config\DataWriter\Rewrite;

                // Clear value from any bad characters

                $clean = str_replace(['"', ';', '\\'], ' ', $value);

                // Remove new lines

                $remove_new_lines = trim(preg_replace('/\s+/', ' ', str_replace("'", '’', $clean)));

                // Update data

                $writer->toFile($path, [

                    $key => $remove_new_lines,

                ]);

            }

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_language_value_updated_successfully'))

            );

        } catch (\Throwable $th) {

            // Error

            throw $th;
        }

    }

    /**
     * Search inside translations strings
     */
    public function search(): void
    {

        try {

            // Get file

            $file = require lang_path($this->language->language_code.'/messages.php');

            // Get keyword

            $q = preg_quote(clean($this->q), '~');

            // Fetch results

            $result = preg_grep('~'.$q.'~', $file);

            // Get current page

            $page = $this->page;

            // Make a collection from the results

            $items = $result instanceof Collection ? $result : Collection::make($result);

            // Set results

            $this->data = new LengthAwarePaginator($items->forPage($page, 40), $items->count(), 40, $page, ['path' => admin_url('languages/translate/'.$this->language->uid)]);

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            throw $th;
        }

    }

}
