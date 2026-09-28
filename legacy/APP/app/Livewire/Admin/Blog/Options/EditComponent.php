<?php

namespace App\Livewire\Admin\Blog\Options;

use App\Http\Validators\Admin\Blog\EditValidator;
use App\Models\Article;
use App\Models\ArticleSeo;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class EditComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $title = [];

    public $content = [];

    public $slug;

    public $image;

    public $seo_description;

    public Article $article;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Get article

        $article = Article::where('uid', $id)->with('seo')->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $article->translate($language->language_code);

            // Fill translations

            $this->title[$language->language_code] = ! empty($translation) ? $translation->title : null;

            $this->content[$language->language_code] = ! empty($translation) ? $translation->content : null;

        }

        // Fill form

        $this->fill([

            'slug' => $article->slug,

            'seo_description' => $article->seo ? $article->seo->description : null,

        ]);

        // Set article

        $this->article = $article;

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_article'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.blog.options.edit');

    }

    /**
     * Update article

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Check if want to change old image

            if ($this->image) {

                $image_id = ImageUploader::make($this->image)
                    ->deleteById($this->article->image_id)
                    ->folder('blog')
                    ->handle();

            } else {

                $image_id = $this->article->image_id;

            }

            // Update article

            $this->article->slug = Str::slug($this->slug);

            $this->article->image_id = $image_id;

            $this->article->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $this->article->translateOrNew($language->language_code)->title = isset($this->title[$language->language_code]) && ! empty($this->title[$language->language_code]) ? $this->title[$language->language_code] : null;

                $this->article->translateOrNew($language->language_code)->content = isset($this->content[$language->language_code]) && ! empty($this->content[$language->language_code]) ? $this->content[$language->language_code] : null;

            }

            // Save again

            $this->article->save();

            // Check if seo description exists in request

            if ($this->seo_description) {

                // Check if article already has seo

                if ($this->article->seo) {

                    // Update seo

                    $this->article->seo()->update([

                        'description' => $this->seo_description,

                    ]);

                } else {

                    // Create new seo

                    $seo = new ArticleSeo;

                    $seo->article_id = $this->article->id;

                    $seo->description = $this->seo_description;

                    $seo->save();

                }

            }

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
