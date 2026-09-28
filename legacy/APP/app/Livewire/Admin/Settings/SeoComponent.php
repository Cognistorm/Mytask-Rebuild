<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\SeoValidator;
use App\Models\Article;
use App\Models\Category;
use App\Models\Gig;
use App\Models\Project;
use App\Models\ProjectCategory;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use Spatie\Sitemap\Sitemap;

class SeoComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $description;

    public $keywords;

    public $facebook_page_id;

    public $facebook_app_id;

    public $twitter_username;

    public $ogimage;

    public $is_sitemap;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('seo');

        // Fill default settings

        $this->fill([

            'description' => $settings->description,

            'keywords' => $settings->keywords,

            'facebook_page_id' => $settings->facebook_page_id,

            'facebook_app_id' => $settings->facebook_app_id,

            'twitter_username' => $settings->twitter_username,

            'is_sitemap' => $settings->is_sitemap,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_seo_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.seo');

    }

    /**
     * Update settings

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            SeoValidator::validate($this);

            // Get seo settings

            $settings = settings('seo');

            // Upload ogimage

            if ($this->ogimage) {

                $ogimage_id = ImageUploader::make($this->ogimage)
                    ->folder('site/ogimage')
                    ->deleteById($settings->ogimage_id)
                    ->handle();

            } else {

                $ogimage_id = $settings->ogimage_id;

            }

            // Update settings

            $settings->description = $this->description;

            $settings->keywords = $this->keywords;

            $settings->facebook_page_id = $this->facebook_page_id;

            $settings->facebook_app_id = $this->facebook_app_id;

            $settings->twitter_username = $this->twitter_username;

            $settings->is_sitemap = $this->is_sitemap;

            // Update og image

            if ($this->ogimage) {

                $settings->ogimage_id = $ogimage_id;

            }

            // Save settings

            $settings->save();

            // Refresh data from cache

            settings('seo', true);

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

    /**
     * Generate sitemap

     *

     * @return void
     */
    public function generateSitemap()
    {

        try {

            if (settings('seo')->is_sitemap) {

                // Get gigs

                $gigs = Gig::active()->get();

                // Get projects

                $projects = Project::whereIn('status', ['active', 'completed', 'closed', 'incomplete', 'under_development'])->get();

                // Get gigs categories

                $gigs_categories = Category::latest()->select('slug')->get();

                // Get projects categories

                $projects_categories = ProjectCategory::latest()->select('slug')->get();

                // Get blog articles

                $articles = Article::latest()->select('slug')->get();

                // Create sitemap

                Sitemap::create()
                    ->add($gigs)
                    ->add($projects)
                    ->add($gigs_categories)
                    ->add($projects_categories)
                    ->add($articles)
                    ->writeToFile(base_path('sitemap.xml'));

                // Success

                $this->alert(

                    'success',

                    __('messages.t_success'),

                    livewire_alert_params(__('messages.t_toast_operation_success'))

                );

            }

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
