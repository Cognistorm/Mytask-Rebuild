<?php

namespace App\Livewire\Main\Blog;

use App\Http\Validators\Main\Blog\CommentValidator;
use App\Models\Admin;
use App\Models\Article;
use App\Models\ArticleComment;
use App\Notifications\Admin\PendingArticleComment;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class ArticleComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    public Article $article;

    public $comment;

    /**
     * Init component

     *

     * @return void
     */
    public function mount($slug)
    {

        // Check if blog system enabled

        if (! settings('blog')->enable_blog) {

            return redirect('/');

        }


        // Get article

        $article = Article::where('slug', $slug)
            ->with('image')
            ->withCount(['comments' => function ($query) {

                $query->where('status', 'active');

            }])
            ->firstOrFail();

        // Set article

        $this->article = $article;

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.main-app')]

    public function render()
    {

        // SEO

        $separator = settings('general')->separator;

        $title = $this->article->title." $separator ".settings('general')->title;

        $description = $this->article->seo ? $this->article->seo->description : settings('seo')->description;

        $ogimage = src($this->article->image);

        $this->seo()->setTitle($title);

        $this->seo()->setDescription($description);

        $this->seo()->setCanonical(url()->current());

        $this->seo()->opengraph()->setTitle($title);

        $this->seo()->opengraph()->setDescription($description);

        $this->seo()->opengraph()->setUrl(url()->current());

        $this->seo()->opengraph()->setType('website');

        $this->seo()->opengraph()->addImage($ogimage);

        $this->seo()->twitter()->setImage($ogimage);

        $this->seo()->twitter()->setUrl(url()->current());

        $this->seo()->twitter()->setSite('@'.settings('seo')->twitter_username);

        $this->seo()->twitter()->addValue('card', 'summary_large_image');

        $this->seo()->metatags()->addMeta('fb:page_id', settings('seo')->facebook_page_id, 'property');

        $this->seo()->metatags()->addMeta('fb:app_id', settings('seo')->facebook_app_id, 'property');

        $this->seo()->metatags()->addMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', 'name');

        $this->seo()->jsonLd()->setTitle($title);

        $this->seo()->jsonLd()->setDescription($description);

        $this->seo()->jsonLd()->setUrl(url()->current());

        $this->seo()->jsonLd()->setType('WebSite');

        return view('livewire.main.blog.article', [

            'comments' => $this->comments,

        ]);

    }

    /**
     * Get comments

     *

     * @return object
     */
    public function getCommentsProperty()
    {

        return ArticleComment::where('article_id', $this->article->id)
            ->where('status', 'active')
            ->latest()
            ->paginate(40);

    }

    /**
     * Add new comment

     *

     * @return void
     */
    public function addComment()
    {

        try {

            if (!auth()->check()) {
                $this->alert(
                    'error',
                    __('messages.t_error'),
                    livewire_alert_params(__('messages.t_login_required_to_comment'), 'error')
                );
                return;
            }

            // Validate form

            CommentValidator::validate($this);

            // Get comment status

            $status = settings('blog')->auto_approve_comments ? 'active' : 'pending';

            // Add new comment

            $comment = new ArticleComment;

            $comment->uid = uid();

            $comment->article_id = $this->article->id;

            $comment->name = clean(auth()->user()->fullname);

            $comment->email = clean(auth()->user()->email);

            $comment->comment = clean($this->comment);

            $comment->ip_address = request()->ip();

            $comment->user_agent = request()->userAgent();

            $comment->status = $status;

            $comment->save();

            // Reset form

            $this->reset(['comment']);

            // Check if pending comment

            if ($status === 'pending') {

                // Comment pending approval

                // Send notification to admin

                Admin::first()->notify(new PendingArticleComment($this->article, $comment));

                // Success

                $this->alert(

                    'success',

                    __('messages.t_success'),

                    livewire_alert_params(__('messages.t_ur_comment_will_be_published_soon'))

                );

            } else {

                // Comment active

                $this->alert(

                    'success',

                    __('messages.t_success'),

                    livewire_alert_params(__('messages.t_ur_comment_has_been_successfully_added'))

                );

            }

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

        }

    }

}
