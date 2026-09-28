<?php

namespace App\Livewire\Admin\Pages;

use App\Models\Page;
use App\Models\SettingsFooter;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class PagesComponent extends Component
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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_pages'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.pages.pages', [

            'pages' => $this->pages,

        ]);

    }

    /**
     * Get list of pages

     *

     * @return object
     */
    public function getPagesProperty()
    {

        return Page::withTranslation()
            ->latest()
            ->paginate(42);

    }

    /**
     * Delete page

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        // Get page

        $page = Page::where('id', $id)->firstOrFail();

        // Check if this is a terms or privacy page

        SettingsFooter::where('page_terms_id', $page->id)->update([

            'page_terms_id' => null,

        ]);

        SettingsFooter::where('page_policy_id', $page->id)->update([

            'page_policy_id' => null,

        ]);

        // delete all translations

        $page->deleteTranslations();

        // Delete page

        $page->delete();

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

}
