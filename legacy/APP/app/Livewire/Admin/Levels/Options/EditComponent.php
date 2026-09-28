<?php

namespace App\Livewire\Admin\Levels\Options;

use App\Http\Validators\Admin\Levels\EditValidator;
use App\Models\Level;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class EditComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithFileUploads;

    public $title = [];

    public $order_number;

    public $account_type;

    public $seller_max_sales;

    public $seller_min_sales;

    public $buyer_max_purchases;

    public $buyer_min_purchases;

    public $text_color;

    public $bg_color;

    public $badge;

    public Level $level;

    /**
     * Init component

     *

     * @param  string  $id
     * @return void
     */
    public function mount($id)
    {

        // Set level

        $this->level = Level::where('uid', $id)->with('badge')->firstOrFail();

        // Loop through supported languages

        foreach (supported_languages() as $language) {

            // Get translation

            $translation = $this->level->translate($language->language_code);

            // Fill translations

            $this->fill([

                "title.{$language->language_code}" => ! empty($translation) ? $translation->title : null,

            ]);

        }

        // Fill form

        $this->fill([

            'order_number' => $this->level->order_number,

            'account_type' => $this->level->account_type,

            'seller_max_sales' => $this->level->seller_sales_max,

            'seller_min_sales' => $this->level->seller_sales_min,

            'buyer_max_purchases' => $this->level->buyer_purchases_max,

            'buyer_min_purchases' => $this->level->buyer_purchases_min,

            'text_color' => $this->level->level_color,

            'bg_color' => $this->level->level_bg_color,

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_edit_level'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.levels.options.edit');

    }

    /**
     * Update level

     *

     * @return void
     */
    public function update()
    {

        try {

            // Validate form

            EditValidator::validate($this);

            // Check if request has a badge file

            if ($this->badge) {

                $badge_id = ImageUploader::make($this->badge)
                    ->folder('badges')
                    ->deleteById($this->level->badge_id)
                    ->handle();

            } else {

                $badge_id = $this->level->badge_id;

            }

            // Update level

            $this->level->account_type = $this->account_type;

            $this->level->order_number = $this->order_number;

            $this->level->seller_sales_min = $this->account_type === 'seller' ? $this->seller_min_sales : 0;

            $this->level->seller_sales_max = $this->account_type === 'seller' ? $this->seller_max_sales : 0;

            $this->level->buyer_purchases_min = $this->account_type === 'buyer' ? $this->buyer_min_purchases : 0;

            $this->level->buyer_purchases_max = $this->account_type === 'buyer' ? $this->buyer_max_purchases : 0;

            $this->level->level_color = $this->text_color;

            $this->level->level_bg_color = $this->bg_color ?? null;

            $this->level->badge_id = $badge_id;

            $this->level->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $this->level->translateOrNew($language->language_code)->title = isset($this->title[$language->language_code]) && ! empty($this->title[$language->language_code]) ? $this->title[$language->language_code] : null;

            }

            // Save again

            $this->level->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_level_updated_successfully'))

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
