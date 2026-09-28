<?php

namespace App\Livewire\Main\Create;

use App\Enums\SubscriptionEnum;
use App\Http\Validators\Main\Create\GalleryValidator;
use App\Http\Validators\Main\Create\OverviewValidator;
use App\Http\Validators\Main\Create\PricingValidator;
use App\Http\Validators\Main\Create\RequirementsValidator;
use App\Models\Admin;
use App\Models\Category;
use App\Models\Childcategory;
use App\Models\Gig;
use App\Models\GigDocument;
use App\Models\GigImage;
use App\Models\GigSeo;
use App\Models\Subcategory;
use App\Notifications\Admin\PendingGig;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class CreateComponent extends Component
{
    use WithFileUploads, SEOToolsTrait, Actions, LivewireAlert;

    public $subcategories        = [];
    public $childcategories      = [];
    public $tags                 = [];
    public $add_upgrade          = [];
    public $available_deliveries = [];
    public $faqs                 = [];
    public $upgrades             = [];
    public $requirements         = [];
    public $add_requirement      = [
        'options' => [0 => '', 1 => '']
    ];

    // Requirements
    public $question;
    public $answer;
    public $selected;

    // Overview section
    public $title = [];
    public $category;
    public $subcategory;
    public $childcategory;
    public $description = [];
    public $con;

    public $seo_title;
    public $seo_description;

    // Pricing
    public $price;
    public $delivery_time;
    public $currency_symbol;

    // Gallery
    public $images    = [];
    public $documents = [];
    public $thumbnail;

    public $isFinished  = false;
    public $is_approved = false;
    public $is_edit     = false;

    /**
     * Initialize component
     *
     * @return void
     */
    public function mount() : void
    {
        // Set available deliveries dates
        $this->available_deliveries = [
            ['value' => 0, 'text' => __('messages.t_none')],
            ['value' => 1, 'text' => __('messages.t_1_day')],
            ['value' => 2, 'text' => __('messages.t_2_days')],
            ['value' => 3, 'text' => __('messages.t_3_days')],
            ['value' => 4, 'text' => __('messages.t_4_days')],
            ['value' => 5, 'text' => __('messages.t_5_days')],
            ['value' => 6, 'text' => __('messages.t_6_days')],
            ['value' => 7, 'text' => __('messages.t_1_week')],
            ['value' => 14, 'text' => __('messages.t_2_weeks')],
            ['value' => 21, 'text' => __('messages.t_3_weeks')],
            ['value' => 30, 'text' => __('messages.t_1_month')]
        ];

        // Get default currency
        $currency              = settings('currency');

        // Set currency symbol
        $this->currency_symbol = isset(config('money')[$currency->code]['symbol']) ? config('money')[$currency->code]['symbol'] : $currency->code;

    }

    /**
     * Render component
     *
     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.main-app')]
    public function render()
    {
        // SEO
        $separator   = settings('general')->separator;
        $title       = __('messages.t_publish_new_gig') . " $separator " . settings('general')->title;
        $description = settings('seo')->description;
        $ogimage     = src( settings('seo')->ogimage );

        $this->seo()->setTitle( $title );
        $this->seo()->setDescription( $description );
        $this->seo()->setCanonical( url()->current() );
        $this->seo()->opengraph()->setTitle( $title );
        $this->seo()->opengraph()->setDescription( $description );
        $this->seo()->opengraph()->setUrl( url()->current() );
        $this->seo()->opengraph()->setType('website');
        $this->seo()->opengraph()->addImage( $ogimage );
        $this->seo()->twitter()->setImage( $ogimage );
        $this->seo()->twitter()->setUrl( url()->current() );
        $this->seo()->twitter()->setSite( "@" . settings('seo')->twitter_username );
        $this->seo()->twitter()->addValue('card', 'summary_large_image');
        $this->seo()->metatags()->addMeta('fb:page_id', settings('seo')->facebook_page_id, 'property');
        $this->seo()->metatags()->addMeta('fb:app_id', settings('seo')->facebook_app_id, 'property');
        $this->seo()->metatags()->addMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', 'name');
        $this->seo()->jsonLd()->setTitle( $title );
        $this->seo()->jsonLd()->setDescription( $description );
        $this->seo()->jsonLd()->setUrl( url()->current() );
        $this->seo()->jsonLd()->setType('WebSite');

        return view('livewire.main.create.create', [
            'categories' => $this->categories
        ]);
    }

    /**
     * Get parent categories
     *
     * @return Collection
     */
    public function getCategoriesProperty() : Collection
    {
        return Category::select('id', 'uid', 'created_at')->withTranslation()->latest()->get();
    }

    /**
     * Set subcategories
     *
     * @param int $id
     * @return void
     */
    public function updatedCategory($id) : void
    {
        // Reset subcategory and childcategory when category changes
        $this->subcategory = null;
        $this->childcategory = null;
        $this->childcategories = [];

        // Set subcategories
        $this->subcategories = Subcategory::where('parent_id', $id)
                                            ->select('id', 'uid', 'created_at')
                                            ->withTranslation()
                                            ->latest()
                                            ->get();
    }

    /**
     * Set childcategories
     *
     * @param int $id
     * @return void
     */
    public function updatedSubcategory($id) : void
    {
        $this->childcategory = null;

        // Set childcategories
        $this->childcategories = Childcategory::where('subcategory_id', $id)
                                                ->where('parent_id', $this->category)
                                                ->select('id', 'uid', 'created_at')
                                                ->withTranslation()
                                                ->latest()
                                                ->get();
    }

    /**
     * Add tag to list
     *
     * @param string $tag
     * @return void
     */
    public function addTag(string $tag)
    {
        // Validate form
        try {

            // Validate form
            OverviewValidator::tag($tag);

            // Clear tag
            $clean = str_replace(['"', "'", ";", ":", "/", ",", ".", "-", "_", "&", "!"], "", $tag);

            // Add add tag to list
            array_push($this->tags, $clean);

            // Refresh tags list
            array_values($this->tags);

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {

            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;

        }
    }

    /**
     * Remove tag from list
     *
     * @param string $tag
     * @return void
     */
    public function removeTag($tag)
    {
        // Get tag key
        $key = array_search($tag, $this->tags);

        // Check if tag exists
        if (isset($this->tags[$key])) {

            // Delete this tag
            unset($this->tags[$key]);

            // Refresh tags list
            array_values($this->tags);

        }
    }

    /**
     * Add a FAQ to list
     *
     * @return void
     */
    public function addFaq()
    {
        // Validate form
        try {

            // Validate form
            OverviewValidator::faq($this);

            // Set faq
            $faq = [
                'question' => $this->question,
                'answer'   => $this->answer
            ];

            // Add this faq to list
            array_push($this->faqs, $faq);

            // Reset form
            $this->reset(['answer', 'question']);

            // Success
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params( __('messages.t_faq_added_successfully') )
            );

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {

            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;

        }
    }

    /**
     * Remove item from list
     *
     * @param integer $key
     * @return void
     */
    public function removeFaq($key)
    {
        // Check if item set in array
        if (isset($this->faqs[$key])) {

            // Remove it
            unset($this->faqs[$key]);

        }
    }

    /**
     * Add a service upgrade
     *
     * @return void
     */
    public function addUpgrade()
    {
        // Validate form
        try {

            // Validate form
            PricingValidator::upgrade($this);

            // Set upgrade
            $upgrade = [
                'title'      => $this->add_upgrade['title'],
                'price'      => $this->add_upgrade['price'],
                'extra_days' => isset($this->add_upgrade['extra_days']) ? $this->add_upgrade['extra_days'] : 0,
            ];

            // Add this upgrade to list
            $this->upgrades[] = $upgrade;

            // Reset form
            $this->reset('add_upgrade');

            // Close modal
            $this->dispatch('close-modal', 'modal-add-upgrade-container');

            // Scroll to see this upgrade
            $this->dispatch('scrollTo', 'scroll-to-upgrade-id-' . array_key_last($this->upgrades));

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {

            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;

        }
    }

    /**
     * Remove select upgrade from list
     *
     * @param integer $key
     * @return void
     */
    public function removeUpgrade($key)
    {
        // Check if upgrade exists in list
        if (isset($this->upgrades[$key])) {

            // Delete upgrade from list
            unset($this->upgrades[$key]);

        }
    }

    /**
     * Add new option to list
     *
     * @return void
     */
    public function addOption()
    {
        // Set new option
        $option = [''];

        // Add new option
        array_push($this->add_requirement['options'], $option);

        // Refresh value
        array_values($this->add_requirement['options']);

        // Success
        $this->alert(
            'success',
            __('messages.t_success'),
            livewire_alert_params( __('messages.t_toast_operation_success') )
        );
    }

    /**
     * Delete selected option
     *
     * @param integer $index
     * @return void
     */
    public function deleteOption($index)
    {
        // Check if option exists
        if (isset($this->add_requirement['options'][$index])) {

            // Remove it
            unset($this->add_requirement['options'][$index]);

            // Refresh options
            array_values($this->add_requirement['options']);

            // Success
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params( __('messages.t_toast_operation_success') )
            );

        }
    }

    /**
     * Add requirement
     *
     * @return void
     */
    public function addRequirement()
    {
        try {

            // Validate form
            RequirementsValidator::add($this);

            // Set requirement
            $requirement = [
                'question'    => $this->add_requirement['question'],
                'type'        => $this->add_requirement['type'],
                'is_required' => isset($this->add_requirement['is_required']) && $this->add_requirement['is_required'] ? true : false,
                'is_multiple' => isset($this->add_requirement['is_multiple']) && $this->add_requirement['is_multiple'] ? true : false,
                'options'     => isset($this->add_requirement['options']) ? $this->add_requirement['options'] : [],
            ];

            // Add this requirement to list
            array_push($this->requirements, $requirement);

            // Reset form
            $this->reset('add_requirement');

            // Success
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params( __('messages.t_toast_operation_success') )
            );

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {

            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;

        }
    }

    /**
     * Delete selected requirement
     *
     * @param integer $index
     * @return void
     */
    public function deleteRequirement($index)
    {
        // Check if requirement exists
        if (isset($this->requirements[$index])) {

            // Delete it
            unset($this->requirements[$index]);

            // Refresh array
            array_values($this->requirements);

            // Success
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params( __('messages.t_toast_operation_success') )
            );

        }
    }

    /**
     * Edit requirement by id
     *
     * @param integer $index
     * @return void
     */
    public function editRequirement($index)
    {
        // Check if requirement exists
        if (isset($this->requirements[$index])) {

            // Get requirement
            $req = $this->requirements[$index];

            // Set requirement
            $this->add_requirement['question']    = isset($req['question']) ? $req['question'] : null;
            $this->add_requirement['type']        = isset($req['type']) ? $req['type'] : null;
            $this->add_requirement['is_required'] = isset($req['is_required']) ? $req['is_required'] : null;
            $this->add_requirement['is_multiple'] = isset($req['is_multiple']) ? $req['is_multiple'] : null;
            $this->add_requirement['options']     = isset($req['options']) ? $req['options'] : [];

            // Set default action as edit
            $this->is_edit  = true;

            // Set selected requirement
            $this->selected = $index;

            // Open modal
            $this->dispatch('open-modal', 'modal-add-requirement-container');
        }
    }

    /**
     * Update requirement
     *
     * @return void
     */
    public function updateRequirement()
    {
        try {

            // Get requirement
            $requirement = $this->requirements[$this->selected];

            // Check if exists
            if (isset($requirement)) {

                // Validate form
                RequirementsValidator::add($this);

                // Update requirement
                $this->requirements[$this->selected]['question']    = $this->add_requirement['question'];
                $this->requirements[$this->selected]['type']        = $this->add_requirement['type'];
                $this->requirements[$this->selected]['is_required'] = isset($this->add_requirement['is_required']) ? true : false;
                $this->requirements[$this->selected]['is_multiple'] = isset($this->add_requirement['is_multiple']) ? true : false;
                $this->requirements[$this->selected]['options']     = isset($this->add_requirement['options']) ? $this->add_requirement['options'] : [];

                // Close modal
                $this->dispatch('close-modal', 'modal-add-service-requirement-container');

                // Reset form
                $this->reset('add_requirement');

                // Success
                $this->alert(
                    'success',
                    __('messages.t_success'),
                    livewire_alert_params( __('messages.t_toast_operation_success') )
                );

            }

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {

            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );

            throw $th;

        }
    }

    /**
     * Now let's post this gig
     *
     * @return \Illuminate\Http\RedirectResponse|void
     */
    public function create()
    {
        try {

            OverviewValidator::all($this);
            PricingValidator::all($this);
            GalleryValidator::all($this);

            $user         = auth()->user();
            $userGigsCount = Gig::where('user_id', $user->id)
                ->where('status', '!=', 'deleted')
                ->count();
            if (!$user->hasSubscription()) {
                if ($userGigsCount >= 1){
                    return redirect()->route('main.subscription', ['gigs' => 'true']);
                }
            }



            // Generate unique id for this gig
            $uid                  = uid();

            // Generate unique slug for this gig
            $slug                 = substr( Str::slug($this->title['ka']), 0, 138 ) . '-' . $uid;
            // Get price
            $price                = clean($this->price);

            // Get delivery time
            $delivery_time        = $this->delivery_time;

            // Get parent category
            $category_id          = $this->category;

            // Get subcategory
            $subcategory_id       = $this->subcategory;

            // Get childcategory
            $childcategory_id     = $this->childcategory;

            // Get gig status
            $status               = settings('publish')->auto_approve_gigs ? 'active' : 'pending';

            // Check if gig has upgrades
            $has_upgrades         = is_array($this->upgrades) && count($this->upgrades) ? true : false;

            // Check if gig has faqs
            $has_faqs             = is_array($this->faqs) && count($this->faqs) ? true : false;

            // Get video link
            $video_link           = null;

            // Get video id
            $video_id             = null;

            // Get gig preview image
            $preview              = $this->thumbnail;

            // Upload thumbnail image
            $image_thumb_id       = ImageUploader::make($preview)->resize(400)->folder('gigs/previews/small')->handle();

            // Upload medium image
            $image_medium_id      = ImageUploader::make($preview)->resize(800)->folder('gigs/previews/medium')->handle();

            // Upload large image
            $image_large_id       = ImageUploader::make($preview)->resize(1200)->folder('gigs/previews/large')->handle();

            // Save gig
            $gig                   = new Gig();
            $gig->uid              = $uid;
            $gig->user_id          = auth()->id();
            $gig->slug             = $slug;
            $gig->price            = $price;
            $gig->delivery_time    = $delivery_time;
            $gig->category_id      = $category_id;
            $gig->subcategory_id   = $subcategory_id;
            $gig->childcategory_id = $childcategory_id;
            $gig->image_thumb_id   = $image_thumb_id;
            $gig->image_medium_id  = $image_medium_id;
            $gig->image_large_id   = $image_large_id;
            $gig->status           = $status;
            $gig->has_upgrades     = $has_upgrades;
            $gig->has_faqs         = $has_faqs;
            $gig->video_link       = $video_link;
            $gig->video_id         = $video_id;
            $gig->save();

            foreach (supported_languages() as $language) {
                $langCode = $language->language_code;
                if (!empty($this->title[$langCode])) {
                    $gig->translateOrNew($langCode)->title = $this->title[$langCode];
                }
                if (!empty($this->description[$langCode])) {
                    $gig->translateOrNew($langCode)->description = $this->description[$langCode];
                }
            }


            $gig->save();

            // Check if gig has custom seo
            if ($this->seo_title && $this->seo_description) {

                // Save seo
                GigSeo::create([
                    'gig_id'      => $gig->id,
                    'title'       => clean($this->seo_title),
                    'description' => clean($this->seo_description),
                ]);

            }

            // Save gig images
            foreach ($this->images as $image) {

                // Upload small image
                $img_thumb_id  = ImageUploader::make($image)->resize(400)->folder('gigs/gallery/small')->handle();

                // Upload medium image
                $img_medium_id = ImageUploader::make($image)->resize(800)->folder('gigs/gallery/medium')->handle();

                // Upload large image
                $img_large_id  = ImageUploader::make($image)->resize(1200)->folder('gigs/gallery/large')->handle();

                // Save images
                GigImage::create([
                    'gig_id'        => $gig->id,
                    'img_thumb_id'  => $img_thumb_id,
                    'img_medium_id' => $img_medium_id,
                    'img_large_id'  => $img_large_id
                ]);

            }

            // Check if documents exists in request
            if (settings('publish')->is_documents_enabled && is_array($this->documents) && count($this->documents)) {

                // Loop through documents
                foreach ($this->documents as $doc) {

                    // Generate document unique id
                    $doc_uid = uid();

                    // Get original name
                    $name    = $doc->getClientOriginalName();

                    // Get file size
                    $size    = $doc->getSize();

                    // Move document to local storage
                    $doc->storeAs('gigs/documents', $doc_uid . '.pdf', 'custom');

                    // Save document in database
                    GigDocument::create([
                        'uid'    => $doc_uid,
                        'gig_id' => $gig->id,
                        'name'   => $name,
                        'size'   => $size
                    ]);

                }

            }

            // Gig has been posted successfully
            $this->isFinished = url('service', $slug);

            // Send notification to admin
            if ($status === 'pending') {

                $this->is_approved = false;

                Admin::first()->notify( (new PendingGig($gig))->locale(config('app.locale')) );

            } else {

                $this->is_approved = true;

            }

            // Success message
            $this->alert(
                'success',
                __('messages.t_success'),
                livewire_alert_params( __('messages.t_gig_created_successfully') )
            );

            // Scroll up
            $this->dispatch('scrollUp');

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( __('messages.t_toast_form_validation_error'), 'error' )
            );

            throw $e;

        } catch (\Throwable $th) {

            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params( $th->getMessage(), 'error' )
            );

        }
    }

}
