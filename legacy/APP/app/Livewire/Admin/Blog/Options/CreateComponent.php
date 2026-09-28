<?php

namespace App\Livewire\Admin\Blog\Options;

use App\Http\Validators\Admin\Blog\CreateValidator;
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

class CreateComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $title = [];

    public $content = [];

    public $slug;

    public $image;

    public $seo_description;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_article'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.blog.options.create');

    }

    /**
     * Create new article

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Upload image

            if ($this->image) {

                // Generate image id

                $image_id = ImageUploader::make($this->image)
                    ->folder('blog')
                    ->handle();

            } else {

                // Not found

                $image_id = null;

            }

            // Create new article

            $article = new Article;

            $article->uid = uid();

            $article->slug = Str::slug($this->slug);

            $article->image_id = $image_id;

            $article->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $article->translateOrNew($language->language_code)->title = isset($this->title[$language->language_code]) && ! empty($this->title[$language->language_code]) ? $this->title[$language->language_code] : null;

                $article->translateOrNew($language->language_code)->content = isset($this->content[$language->language_code]) && ! empty($this->content[$language->language_code]) ? $this->content[$language->language_code] : null;

            }

            // Save again

            $article->save();

            // Add seo

            if ($this->seo_description) {

                // Set seo

                $seo = new ArticleSeo;

                $seo->article_id = $article->id;

                $seo->description = $this->seo_description;

                $seo->save();

            }

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
