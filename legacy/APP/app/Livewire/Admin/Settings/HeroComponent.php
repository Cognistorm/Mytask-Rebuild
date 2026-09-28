<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\HeroValidator;
use App\Models\SettingsHero;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use Schema;

class HeroComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $enable_bg_img;

    public $bg_large;

    public $bg_medium;

    public $bg_small;

    public $bg_color;

    public $bg_large_height;

    public $bg_small_height;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('hero');

        // Fill form

        $this->fill([

            'enable_bg_img' => $settings->enable_bg_img ? 1 : 0,

            'bg_color' => $settings->bg_color,

            'bg_large_height' => $settings->bg_large_height,

            'bg_small_height' => $settings->bg_small_height,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_hero_section_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.hero');

    }

    /**
     * Update settings

     *

     * @return mixed
     */
    public function update()
    {

        try {

            // Validate form

            HeroValidator::validate($this);

            // Disable foreign key check

            Schema::disableForeignKeyConstraints();

            // Get her section settings

            $settings = settings('hero');

            // Check if request has large background image

            if ($this->bg_large) {

                // Upload the image

                $bg_large_id = ImageUploader::make($this->bg_large)
                    ->folder('site/hero')
                    ->deleteById($settings->bg_large_id)
                    ->handle();

            } else {

                // Use default

                $bg_large_id = $settings->bg_large_id;

            }

            // Check if request has medium background image

            if ($this->bg_medium) {

                // Upload the image

                $bg_medium_id = ImageUploader::make($this->bg_medium)
                    ->folder('site/hero')
                    ->deleteById($settings->bg_medium_id)
                    ->handle();

            } else {

                // Use default

                $bg_medium_id = $settings->bg_medium_id;

            }

            // Check if request has small background image

            if ($this->bg_small) {

                // Upload the image

                $bg_small_id = ImageUploader::make($this->bg_small)
                    ->folder('site/hero')
                    ->deleteById($settings->bg_small_id)
                    ->handle();

            } else {

                // Use default

                $bg_small_id = $settings->bg_small_id;

            }

            // Update settings

            SettingsHero::first()->update([

                'enable_bg_img' => $this->enable_bg_img ? 1 : 0,

                'bg_large_id' => $bg_large_id,

                'bg_medium_id' => $bg_medium_id,

                'bg_small_id' => $bg_small_id,

                'bg_color' => $this->bg_color,

                'bg_large_height' => $this->bg_large_height,

                'bg_small_height' => $this->bg_small_height,

            ]);

            // Clear cache

            settings('hero', true);

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
