<?php

namespace App\Livewire\Admin\Languages;

use App\Models\Language;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\File;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class LanguagesComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_languages'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.languages.languages', [

            'languages' => $this->languages,

        ]);

    }

    /**
     * Get list of languages

     *

     * @return object
     */
    public function getLanguagesProperty()
    {

        return Language::orderBy('name', 'asc')->paginate(42);

    }

    /**
     * Delete page

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        // Get language

        $language = Language::where('id', $id)->firstOrFail();

        // Check if this language is default

        if (settings('general')->default_language == $language->language_code) {

            // Error

            $this->alert(

                'error',

                __('messages.t_error'),

                livewire_alert_params(__('messages.t_this_language_is_default_for_ur_website'), 'error')

            );

            return;

        }

        // Get language forlder

        $folder = lang_path($language->language_code);

        // Delete folder if exists

        if (File::isDirectory($folder)) {

            // Delete folder

            File::delete($folder);

        }

        // Delete language

        $language->delete();

        // Refresh supported langs

        supported_languages(true);

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

}
