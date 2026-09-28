<?php

namespace App\Livewire\Admin\Settings;

use App\Http\Validators\Admin\Settings\ChatValidator;
use App\Models\SettingsLiveChat;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Artisan;
use Config;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;

class ChatComponent extends Component
{
    use LivewireAlert, SEOToolsTrait;

    public $default_provider;

    public $allowed_images;

    public $allowed_files;

    public $max_file_size;

    public $enable_attachments;

    public $enable_emojis;

    public $play_notification_sound;

    public $pusher_key;

    public $pusher_secret;

    public $pusher_app_id;

    public $pusher_cluster;

    public $pusher_encrypted;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Get settings

        $settings = settings('live_chat');

        // Fill default settings

        $this->fill([

            'default_provider' => 'pusher',

            'allowed_images' => $settings->allowed_images,

            'allowed_files' => $settings->allowed_files,

            'max_file_size' => $settings->max_file_size,

            'enable_attachments' => $settings->enable_attachments ? 1 : 0,

            'enable_emojis' => $settings->enable_emojis ? 1 : 0,

            'play_notification_sound' => $settings->play_notification_sound ? 1 : 0,

            'pusher_key' => config('chatify.pusher.key'),

            'pusher_secret' => config('chatify.pusher.secret'),

            'pusher_app_id' => config('chatify.pusher.app_id'),

            'pusher_cluster' => config('chatify.pusher.options.cluster'),

            'pusher_encrypted' => config('chatify.pusher.options.encrypted') ? 1 : 0,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_live_chat_settings'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.settings.chat');

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

            ChatValidator::validate($this);

            // Update settings

            SettingsLiveChat::first()->update([

                'default_provider' => $this->default_provider,

                'allowed_images' => str_replace(' ', '', $this->allowed_images),

                'allowed_files' => str_replace(' ', '', $this->allowed_files),

                'max_file_size' => $this->max_file_size,

                'enable_attachments' => $this->enable_attachments ? 1 : 0,

                'enable_emojis' => $this->enable_emojis ? 1 : 0,

                'play_notification_sound' => $this->play_notification_sound ? 1 : 0,

            ]);

            // Write pusher settings

            Config::write('chatify.pusher.key', $this->pusher_key);

            Config::write('chatify.pusher.secret', $this->pusher_secret);

            Config::write('chatify.pusher.app_id', $this->pusher_app_id);

            Config::write('chatify.pusher.options.cluster', $this->pusher_cluster);

            Config::write('chatify.pusher.options.encrypted', $this->pusher_encrypted ? 1 : 0);

            // Clear config cache

            Artisan::call('config:clear');

            // Update cache

            settings('live_chat', true);

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
