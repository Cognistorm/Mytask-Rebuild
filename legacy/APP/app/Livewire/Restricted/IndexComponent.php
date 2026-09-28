<?php

namespace App\Livewire\Restricted;

use App\Http\Validators\Restricted\AppealValidator;
use App\Models\Admin;
use App\Models\UserRestriction;
use App\Models\UserRestrictionAppeal;
use App\Models\UserRestrictionAppealFile;
use App\Notifications\Admin\NewRestrictionAppeal;
use App\Utils\Uploader\FileUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class IndexComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $message;

    public $files = [];

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.restricted-app')]

    public function render()
    {

        // SEO

        $separator = settings('general')->separator;

        $title = __('messages.t_restrictions_removal_center')." $separator ".settings('general')->title;

        $description = settings('seo')->description;

        $ogimage = src(settings('seo')->ogimage);

        $this->seo()->setTitle($title);

        $this->seo()->setDescription($description);

        $this->seo()->setCanonical(url()->current());

        $this->seo()->opengraph()->setTitle($title);

        $this->seo()->opengraph()->setDescription($description);

        $this->seo()->opengraph()->setUrl(url()->current());

        $this->seo()->opengraph()->setType('website');

        $this->seo()->opengraph()->addImage($ogimage);

        $this->seo()->twitter()->setImage($ogimage);

        $this->seo()->twitter()->setUrl(url()->current());

        $this->seo()->twitter()->setSite('@'.settings('seo')->twitter_username);

        $this->seo()->twitter()->addValue('card', 'summary_large_image');

        $this->seo()->metatags()->addMeta('fb:page_id', settings('seo')->facebook_page_id, 'property');

        $this->seo()->metatags()->addMeta('fb:app_id', settings('seo')->facebook_app_id, 'property');

        $this->seo()->metatags()->addMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', 'name');

        $this->seo()->jsonLd()->setTitle($title);

        $this->seo()->jsonLd()->setDescription($description);

        $this->seo()->jsonLd()->setUrl(url()->current());

        $this->seo()->jsonLd()->setType('WebSite');

        return view('livewire.restricted.index', [

            'restrictions' => $this->restrictions,

        ]);

    }

    /**
     * Get latest restrictions
     */
    public function getRestrictionsProperty(): LengthAwarePaginator
    {

        return auth()->user()->restrictions()->latest()->paginate(42);

    }

    /**
     * Submit an appeal

     *

     * @param  string  $uid
     */
    public function appeal($uid): void
    {

        try {

            // Get restriction

            $restriction = UserRestriction::where('user_id', auth()->id())
                ->where('uid', $uid)
                ->where('status', 'pending')
                ->with('user')
                ->firstOrFail();

            // Validate form

            AppealValidator::validate($this, $restriction->files_required);

            // Save appeal

            $appeal = new UserRestrictionAppeal;

            $appeal->uid = Str::uuid()->toString();

            $appeal->restriction_id = $restriction->id;

            $appeal->message = clean($this->message);

            $appeal->save();

            // Save files

            foreach ($this->files as $key => $file) {

                // Upload this file

                $file = FileUploader::make($file)->folder('restrictions_appeals')->upload();

                // Save appeal

                $appeal_file = new UserRestrictionAppealFile;

                $appeal_file->appeal_id = $appeal->id;

                $appeal_file->file_id = $file;

                $appeal_file->save();

            }

            // Now let's update this restriction's status

            $restriction->status = 'submitted';

            $restriction->save();

            // Send notification to admin

            Admin::first()->notify(new NewRestrictionAppeal($restriction->user->uid, $appeal->message));

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

            // Close modal

            $this->dispatch('close-modal', 'modal-restrictions-appeal-container-'.$restriction->uid);

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
