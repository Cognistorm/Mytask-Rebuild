<?php

namespace App\Livewire\Admin\Blog\Comments\Options;

use App\Http\Validators\Admin\Blog\CommentValidator;
use App\Models\ArticleComment;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class EditComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    // Form

    public $content;

    public $status;

    // Comment

    public ArticleComment $comment;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get comment

        $comment = ArticleComment::where('uid', $id)->firstOrFail();

        // Fill form

        $this->fill([

            'content' => $comment->comment,

            'status' => $comment->status,

        ]);

        // Set comment

        $this->comment = $comment;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_comment'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.blog.comments.options.edit');

    }

    /**
     * Update comment

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            CommentValidator::validate($this);

            // Update comment

            $this->comment->comment = $this->content;

            $this->comment->status = $this->status;

            $this->comment->save();

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
