<?php

namespace App\Livewire\Admin\Blog;

use App\Models\Article;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class ArticlesComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_articles'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.blog.articles', [

            'articles' => $this->articles,

        ]);

    }

    /**
     * Get latest articles

     *

     * @return object
     */
    public function getArticlesProperty()
    {

        return Article::latest()
            ->withTranslation()
            ->withCount('comments')
            ->with('image')
            ->paginate(40);

    }

    /**
     * Delete article

     *

     * @param  int  $id
     * @return void
     */
    public function delete($id)
    {

        // Get article

        $article = Article::where('id', $id)->firstOrFail();

        // Delete article image

        deleteModelFile($article->image);

        // Delete seo

        $article->seo()?->delete();

        // Delete comments

        $article->comments()?->delete();

        // delete all translations

        $article->deleteTranslations();

        // Delete article

        $article->delete();

        // Success

        $this->alert(

            'success',

            __('messages.t_success'),

            livewire_alert_params(__('messages.t_toast_operation_success'))

        );

    }

}
