<?php

namespace App\Livewire\Main\Seller\Gigs\Options;

use App\Http\Validators\Main\Seller\Gigs\Edit\GalleryValidator;
use App\Http\Validators\Main\Seller\Gigs\Edit\OverviewValidator;
use App\Http\Validators\Main\Seller\Gigs\Edit\PricingValidator;
use App\Http\Validators\Main\Seller\Gigs\Edit\RequirementsValidator;
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
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;
use WireUi\Traits\Actions;

class EditComponent extends Component
{
    use SEOToolsTrait, LivewireAlert, Actions, WithFileUploads;

    public Gig $gig;
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
    public $step        = "gallery";

    protected $queryString = ['step'];

    /**
     * Init component
     *
     * @param integer $id
     * @return void
     */
    public function mount($id)
    {
        // Get gig
        $this->gig = Gig::where('uid', $id)->where('user_id', auth()->id())->firstOrFail();

        // Fill form
        $this->fill([
            'category'        => $this->gig->category_id,
            'subcategory'     => $this->gig->subcategory_id,
            'childcategory'   => $this->gig->childcategory_id,
            'seo_title'       => $this->gig->seo ? $this->gig->seo->title : null,
            'seo_description' => $this->gig->seo ? $this->gig->seo->description : null,
            'price'           => $this->gig->price,
            'delivery_time'   => $this->gig->delivery_time
        ]);

        foreach (supported_languages() as $language) {
            // Get translation
            $translation = $this->gig->translate($language->language_code);
            // Fill translations
            $this->description[$language->language_code] = !empty($translation) ? $translation->description : null;
            $this->title[$language->language_code] = !empty($translation) ? $translation->title : null;
        }

        // Set subcategories
        $this->subcategories = Subcategory::where('parent_id', $this->gig->category_id)
                                          ->select('id', 'uid', 'created_at')
                                          ->withTranslation()
                                          ->latest()
                                          ->get();

        // Set childcategories
        $this->childcategories = Childcategory::where('subcategory_id', $this->gig->subcategory_id)
                                              ->where('parent_id', $this->gig->category_id)
                                              ->select('id', 'uid', 'created_at')
                                              ->withTranslation()
                                              ->latest()
                                              ->get();

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
        $currency = settings('currency');
        // Set currency symbol
        $this->currency_symbol = isset(config('money')[$currency->code]['symbol']) ? config('money')[$currency->code]['symbol'] : $currency->code;
    }

    /**
     * Render component
     *
     * @return \Illuminate\Contracts\Foundation\Application|\Illuminate\Contracts\View\Factory|\Illuminate\Contracts\View\View|\Illuminate\Foundation\Application|\Illuminate\View\View
     */
    #[Layout('components.layouts.seller-app')]
    public function render()
    {
        // SEO
        $separator   = settings('general')->separator;
        $title       = __('messages.t_edit_gig') . " $separator " . settings('general')->title;
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

        return view('livewire.main.seller.gigs.options.edit', [
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
        // Set childcategories
        $this->childcategories = Childcategory::where('subcategory_id', $id)
                                              ->where('parent_id', $this->category)
                                              ->select('id', 'uid', 'created_at')
                                              ->withTranslation()
                                              ->latest()
                                              ->get();
    }

    /**
     * Remove image from gig gallery
     *
     * @param string $imageId
     * @return void
     */
    public function removeImage($imageId)
    {
        try {
            // Find the image
            $image = GigImage::where('id', $imageId)->where('gig_id', $this->gig->id)->first();

            if ($image) {
                // Delete files
                deleteModelFile($image->small);
                deleteModelFile($image->medium);
                deleteModelFile($image->large);

                // Delete image record
                $image->delete();

                // Success message
                $this->alert(
                    'success',
                    __('messages.t_success'),
                    livewire_alert_params(__('messages.t_image_has_been_successfully_deleted'))
                );
            }
        } catch (\Throwable $th) {
            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')
            );
        }
    }

    /**
     * Remove document from gig
     *
     * @param string $documentId
     * @return void
     */
    public function removeDocument($documentId)
    {
        try {
            // Find the document
            $document = GigDocument::where('id', $documentId)->where('gig_id', $this->gig->id)->first();

            if ($document) {
                // Get document path
                $path = public_path('storage/gigs/documents/' . $document->uid . '.pdf');

                // Check if file exists and delete it
                if (File::exists($path)) {
                    File::delete($path);
                }

                // Delete document record
                $document->delete();

                // Success message
                $this->alert(
                    'success',
                    __('messages.t_success'),
                    livewire_alert_params(__('messages.t_file_has_been_successfully_deleted'))
                );
            }
        } catch (\Throwable $th) {
            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_something_went_wrong'), 'error')
            );
        }
    }

    public function update() : void
    {
        try {
            OverviewValidator::all($this);
            PricingValidator::all($this);
            GalleryValidator::all($this);

            // Check if request has seo details
            if ($this->seo_title && $this->seo_description) {
                // Delete old seo
                GigSeo::where('gig_id', $this->gig->id)->delete();
                // Add new seo
                GigSeo::create([
                    'gig_id'      => $this->gig->id,
                    'title'       => clean($this->seo_title),
                    'description' => clean($this->seo_description),
                ]);
            }

            // Generate unique slug for this gig
            $slug = substr( Str::slug($this->title[app()->getLocale()]), 0, 138 ) . '-' . $this->gig->uid;

            // Get gig status
            $status = settings('publish')->auto_approve_gigs ? 'active' : 'pending';

            // Update gig data
            $this->gig->slug           = $slug;
            $this->gig->status         = $status;
            $this->gig->category_id    = $this->category;
            $this->gig->subcategory_id = $this->subcategory;
            $this->gig->price         = $this->price;
            $this->gig->delivery_time = $this->delivery_time;

            foreach (supported_languages() as $language) {
                $this->gig->translateOrNew($language->language_code)->description = $this->description[$language->language_code];
                $this->gig->translateOrNew($language->language_code)->title = $this->title[$language->language_code];
            }
            $this->gig->save();

            // Check if request has thumbnail image
            if ($this->thumbnail) {
                // Upload new files
                $image_thumb_id  = ImageUploader::make($this->thumbnail)
                                                ->deleteById($this->gig->image_thumb_id)
                                                ->resize(400)
                                                ->folder('gigs/previews/small')
                                                ->handle();
                $image_medium_id = ImageUploader::make($this->thumbnail)
                                                ->deleteById($this->gig->image_medium_id)
                                                ->resize(800)
                                                ->folder('gigs/previews/medium')
                                                ->handle();
                $image_large_id  = ImageUploader::make($this->thumbnail)
                                                ->deleteById($this->gig->image_large_id)
                                                ->resize(1200)
                                                ->folder('gigs/previews/large')
                                                ->handle();
            } else {
                // Set default values
                $image_thumb_id  = $this->gig->image_thumb_id;
                $image_medium_id = $this->gig->image_medium_id;
                $image_large_id  = $this->gig->image_large_id;
            }

            // Update gig
            $this->gig->image_thumb_id  = $image_thumb_id;
            $this->gig->image_medium_id = $image_medium_id;
            $this->gig->image_large_id  = $image_large_id;
            $this->gig->save();

            // Check if request has new gallery images
            if (is_array($this->images) && count($this->images)) {
                // Loop through old images
                foreach ($this->gig->images as $image) {
                    // Delete files
                    deleteModelFile($image->small);
                    deleteModelFile($image->medium);
                    deleteModelFile($image->large);
                }
                // Delete old gallery
                GigImage::where('gig_id', $this->gig->id)->delete();

                // Upload new images
                foreach ($this->images as $image) {
                    // Upload small image
                    $thumb_id  = ImageUploader::make($image)->resize(400)->folder('gigs/gallery/small')->handle();
                    // Upload medium image
                    $medium_id = ImageUploader::make($image)->resize(800)->folder('gigs/gallery/medium')->handle();
                    // Upload large image
                    $large_id  = ImageUploader::make($image)->resize(1200)->folder('gigs/gallery/large')->handle();

                    // Save images
                    GigImage::create([
                        'gig_id'        => $this->gig->id,
                        'img_thumb_id'  => $thumb_id,
                        'img_medium_id' => $medium_id,
                        'img_large_id'  => $large_id
                    ]);
                }
            }

            // Check if request has new documents
            if (settings('publish')->is_documents_enabled && is_array($this->documents) && count($this->documents)) {
                // Delete old documents
                foreach ($this->gig->documents as $doc) {
                    // Get document path
                    $path = public_path('storage/gigs/documents/' . $doc->uid . '.pdf');
                    // Check if file exists
                    if (File::exists($path)) {
                        // Delete file from local storage
                        File::delete($path);
                    }
                    // Delete document
                    $doc->delete();
                }

                // Upload new documents
                foreach ($this->documents as $d) {
                    // Generate document unique id
                    $doc_uid = uid();
                    // Get original name
                    $name = $d->getClientOriginalName();
                    // Get file size
                    $size = $d->getSize();
                    // Move document to local storage
                    $d->storeAs('gigs/documents', $doc_uid . '.pdf', 'custom');

                    // Save document in database
                    GigDocument::create([
                        'uid'    => $doc_uid,
                        'gig_id' => $this->gig->id,
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
                Admin::first()->notify( (new PendingGig($this->gig))->locale(config('app.locale')) );
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
                livewire_alert_params( __('messages.t_toast_something_went_wrong'), 'error' )
            );
        }
    }
}
