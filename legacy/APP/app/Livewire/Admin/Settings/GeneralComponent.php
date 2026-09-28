<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\GeneralValidator;
use App\Models\Language;
use App\Models\SettingsGeneral;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class GeneralComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $title;

    public $subtitle;

    public $separator;

    public $logo;

    public $logo_dark;

    public $logo_transparent;

    public $favicon;

    public $announce_link;

    public $announce_text;

    public $is_language_switcher;

    public $default_language;

    public $enable_multivendor;

    public $freelancer_requires_approval;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('general');

        // Fill default settings

        $this->fill([

            'title' => $settings->title,

            'subtitle' => $settings->subtitle,

            'separator' => $settings->separator,

            'announce_link' => $settings->header_announce_link,

            'announce_text' => $settings->header_announce_text,

            'is_language_switcher' => $settings->is_language_switcher,

            'default_language' => $settings->default_language,

            'enable_multivendor' => $settings->enable_multivendor ? 1 : 0,

            'freelancer_requires_approval' => $settings->freelancer_requires_approval ? 1 : 0,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_general_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.general', [

            'languages' => $this->languages,

        ]);

    }

    /**
     * Get available languages

     *

     * @return object
     */
    public function getLanguagesProperty()
    {

        return Language::where('is_active', true)->orderBy('name', 'desc')->get();

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

            GeneralValidator::validate($this);

            // Get settings

            $settings = SettingsGeneral::first();

            // Check if request has logo

            if ($this->logo) {

                $logo_id = ImageUploader::make($this->logo)
                    ->folder('site/logo')
                    ->deleteById($settings->logo_id)
                    ->handle();

            } else {

                $logo_id = $settings->logo_id;

            }

            // Check if request has logo dark

            if ($this->logo_dark) {

                $logo_dark_id = ImageUploader::make($this->logo_dark)
                    ->folder('site/logo')
                    ->deleteById($settings->logo_dark_id)
                    ->handle();

            } else {

                $logo_dark_id = $settings->logo_dark_id;

            }

            // Check if request has transparent logo

            if ($this->logo_transparent) {

                $logo_transparent_id = ImageUploader::make($this->logo_transparent)
                    ->folder('site/logo')
                    ->deleteById($settings->logo_transparent_id)
                    ->handle();

            } else {

                $logo_transparent_id = $settings->logo_transparent_id;

            }

            // Check if request has favicon

            if ($this->favicon) {

                $favicon_id = ImageUploader::make($this->favicon)
                    ->folder('site/favicon')
                    ->deleteById($settings->favicon_id)
                    ->handle();

            } else {

                $favicon_id = $settings->favicon_id;

            }

            // Save settings

            $settings->title = $this->title;

            $settings->subtitle = $this->subtitle;

            $settings->separator = $this->separator;

            $settings->header_announce_text = $this->announce_text ? $this->announce_text : null;

            $settings->header_announce_link = $this->announce_link ? $this->announce_link : null;

            $settings->is_language_switcher = $this->is_language_switcher;

            $settings->default_language = $this->default_language;

            $settings->enable_multivendor = $this->enable_multivendor ? 1 : 0;

            $settings->freelancer_requires_approval = $this->freelancer_requires_approval ? 1 : 0;

            // Save logo

            if ($logo_id) {

                $settings->logo_id = $logo_id;

            }

            // Save dark logo

            if ($logo_dark_id) {

                $settings->logo_dark_id = $logo_dark_id;

            }

            // Save transparent logo

            if ($logo_transparent_id) {

                $settings->logo_transparent_id = $logo_transparent_id;

            }

            // Save favicon

            if ($favicon_id) {

                $settings->favicon_id = $favicon_id;

            }

            // Save settings

            $settings->save();

            // Set app name

            Config::write('app.name', $this->title);

            Config::write('app.locale', $this->default_language);

            // Refresh data from cache

            settings('general', true);

            // Clear cache

            Artisan::call('cache:clear');

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
