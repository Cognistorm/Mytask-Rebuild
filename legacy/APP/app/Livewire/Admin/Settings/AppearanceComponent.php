<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\AppearanceValidator;
use App\Models\SettingsAppearance;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class AppearanceComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $primary_color;

    public $font_link;

    public $font_family;

    public $logo_desktop_height;

    public $is_featured_categories;

    public $is_best_sellers;

    public $placeholder_img;

    public $default_theme;

    public $is_theme_switcher;

    public $custom_code_head_main_layout;

    public $custom_code_footer_main_layout;

    public $custom_code_head_admin_layout;

    public $custom_code_footer_admin_layout;

    public $custom_code_head_freelancer_layout;

    public $custom_code_footer_freelancer_layout;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('appearance');

        // Fill default settings

        $this->fill([

            'primary_color' => $settings->colors['primary'],

            'logo_desktop_height' => $settings->sizes['header_desktop_logo_height'],

            'is_theme_switcher' => $settings->is_theme_switcher ? 1 : 0,

            'is_featured_categories' => $settings->is_featured_categories ? 1 : 0,

            'is_best_sellers' => $settings->is_best_sellers ? 1 : 0,

            'font_link' => $settings->font_link,

            'font_family' => $settings->font_family,

            'default_theme' => $settings->default_theme,

            'custom_code_head_main_layout' => $settings->custom_code_head_main_layout,

            'custom_code_footer_main_layout' => $settings->custom_code_footer_main_layout,

            'custom_code_head_admin_layout' => $settings->custom_code_head_admin_layout,

            'custom_code_footer_admin_layout' => $settings->custom_code_footer_admin_layout,

            'custom_code_head_freelancer_layout' => $settings->custom_code_head_freelancer_layout,

            'custom_code_footer_freelancer_layout' => $settings->custom_code_footer_freelancer_layout,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_appearance_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.appearance');

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

            AppearanceValidator::validate($this);

            // Get settings

            $settings = settings('appearance');

            // Check if request has placeholder image

            if ($this->placeholder_img) {

                $placeholder_img_id = ImageUploader::make($this->placeholder_img)
                    ->folder('site/placeholder')
                    ->deleteById($settings->placeholder_img_id)
                    ->handle();

            } else {

                $placeholder_img_id = $settings->placeholder_img_id;

            }

            // Set colors

            $colors = [

                'primary' => $this->primary_color,

            ];

            // Set sizes

            $sizes = [

                'header_desktop_logo_height' => $this->logo_desktop_height,

            ];

            // Update settings

            SettingsAppearance::first()->update([

                'colors' => $colors,

                'sizes' => $sizes,

                'is_theme_switcher' => $this->is_theme_switcher ? 1 : 0,

                'is_featured_categories' => $this->is_featured_categories ? 1 : 0,

                'is_best_sellers' => $this->is_best_sellers ? 1 : 0,

                'font_link' => $this->font_link,

                'font_family' => $this->font_family,

                'placeholder_img_id' => $placeholder_img_id,

                'default_theme' => $this->default_theme,

                'custom_code_head_main_layout' => $this->custom_code_head_main_layout,

                'custom_code_footer_main_layout' => $this->custom_code_footer_main_layout,

                'custom_code_head_admin_layout' => $this->custom_code_head_admin_layout,

                'custom_code_footer_admin_layout' => $this->custom_code_footer_admin_layout,

                'custom_code_head_freelancer_layout' => $this->custom_code_head_freelancer_layout,

                'custom_code_footer_freelancer_layout' => $this->custom_code_footer_freelancer_layout,

            ]);

            // Update cache

            settings('appearance', true);

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
