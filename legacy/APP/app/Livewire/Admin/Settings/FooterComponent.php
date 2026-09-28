<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\FooterValidator;
use App\Models\Page;
use App\Models\SettingsFooter;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class FooterComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $is_language_switcher;

    public $page_terms;

    public $page_policy;

    public $logo;

    public $logo_dark;

    public $copyrights;

    public $social_facebook;

    public $social_twitter;

    public $social_instagram;

    public $social_linkedin;

    public $social_pinterest;

    public $social_youtube;

    public $social_github;

    public $social_wechat;

    public $social_tiktok;

    public $social_snapchat;

    public $social_whatsapp;

    public $social_sinaweibo;

    public $social_telegram;

    public $social_vk;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('footer');

        // Fill default settings

        $this->fill([

            'is_language_switcher' => $settings->is_language_switcher ? 1 : 0,

            'page_terms' => $settings->page_terms_id,

            'page_policy' => $settings->page_policy_id,

            'copyrights' => $settings->copyrights,

            'social_facebook' => $settings->social_facebook,

            'social_twitter' => $settings->social_twitter,

            'social_instagram' => $settings->social_instagram,

            'social_linkedin' => $settings->social_linkedin,

            'social_pinterest' => $settings->social_pinterest,

            'social_youtube' => $settings->social_youtube,

            'social_github' => $settings->social_github,

            'social_wechat' => $settings->social_wechat,

            'social_tiktok' => $settings->social_tiktok,

            'social_snapchat' => $settings->social_snapchat,

            'social_whatsapp' => $settings->social_whatsapp,

            'social_sinaweibo' => $settings->social_sinaweibo,

            'social_telegram' => $settings->social_telegram,

            'social_vk' => $settings->social_vk,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_footer_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.footer', [

            'pages' => $this->pages,

        ]);

    }

    /**
     * Get pages

     *

     * @return object
     */
    public function getPagesProperty()
    {

        return Page::orderBy('id', 'desc')->get();

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

            FooterValidator::validate($this);

            // Get old settings

            $settings = settings('footer');

            // Check if request has logo

            if ($this->logo) {

                $logo_id = ImageUploader::make($this->logo)
                    ->folder('site/footer/logo')
                    ->deleteById($settings->logo_id)
                    ->handle();

            } else {

                $logo_id = $settings->logo_id;

            }

            // Check if request has logo

            if ($this->logo_dark) {

                $logo_dark_id = ImageUploader::make($this->logo_dark)
                    ->folder('site/footer/logo')
                    ->deleteById($settings->logo_dark_id)
                    ->handle();

            } else {

                $logo_dark_id = $settings->logo_dark_id;

            }

            // Update settings

            SettingsFooter::where('id', 1)->update([

                'is_language_switcher' => $this->is_language_switcher ? 1 : 0,

                'page_terms_id' => $this->page_terms ?? null,

                'page_policy_id' => $this->page_policy ?? null,

                'logo_id' => $logo_id,

                'logo_dark_id' => $logo_dark_id,

                'copyrights' => $this->copyrights,

                'social_facebook' => $this->social_facebook,

                'social_twitter' => $this->social_twitter,

                'social_instagram' => $this->social_instagram,

                'social_linkedin' => $this->social_linkedin,

                'social_pinterest' => $this->social_pinterest,

                'social_youtube' => $this->social_youtube,

                'social_github' => $this->social_github,

                'social_wechat' => $this->social_wechat,

                'social_tiktok' => $this->social_tiktok,

                'social_snapchat' => $this->social_snapchat,

                'social_whatsapp' => $this->social_whatsapp,

                'social_sinaweibo' => $this->social_sinaweibo,

                'social_telegram' => $this->social_telegram,

                'social_vk' => $this->social_vk,

            ]);

            // Refresh data from cache

            settings('footer', true);

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
