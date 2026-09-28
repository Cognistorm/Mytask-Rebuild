<?php

namespace App\Livewire\Admin\Blog;

use App\Http\Validators\Admin\Blog\SettingsValidator;
use App\Models\BlogSettings;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class SettingsComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $enable_blog;

    public $enable_comments;

    public $display_recent_posts;

    public $auto_approve_comments;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Get blog settings

        $settings = settings('blog');

        // Fill form

        $this->fill([

            'enable_blog' => $settings->enable_blog ? 1 : 0,

            'enable_comments' => $settings->enable_comments ? 1 : 0,

            'auto_approve_comments' => $settings->auto_approve_comments ? 1 : 0,

            'display_recent_posts' => $settings->display_recent_posts ? 1 : 0,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_blog_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.blog.settings');

    }

    /**
     * Update blog settings

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            SettingsValidator::validate($this);

            // Update blog settings

            BlogSettings::first()->update([

                'enable_blog' => $this->enable_blog ? 1 : 0,

                'enable_comments' => $this->enable_comments ? 1 : 0,

                'auto_approve_comments' => $this->auto_approve_comments ? 1 : 0,

                'display_recent_posts' => $this->display_recent_posts ? 1 : 0,

            ]);

            // Refresh cache

            settings('blog', true);

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
