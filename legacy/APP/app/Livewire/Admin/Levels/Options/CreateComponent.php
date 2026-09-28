<?php

namespace App\Livewire\Admin\Levels\Options;

use App\Http\Validators\Admin\Levels\CreateValidator;
use App\Models\Level;
use App\Utils\Uploader\ImageUploader;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

class CreateComponent extends Component
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

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_create_level'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.levels.options.create');

    }

    /**
     * Create new user

     *

     * @return void
     */
    public function create()
    {

        try {

            // Validate form

            CreateValidator::validate($this);

            // Check if request has a badge file

            if ($this->badge) {

                $badge_id = ImageUploader::make($this->badge)
                    ->folder('badges')
                    ->handle();

            } else {

                $badge_id = null;

            }

            // Check seller sales

            if ($this->account_type == 'seller') {

                // Check if min and max sales set

                if (! $this->seller_min_sales || ! $this->seller_max_sales) {

                    // Error

                    $this->alert(

                        'error',

                        __('messages.t_error'),

                        livewire_alert_params(__('dashboard.t_pls_set_min_max_sales_level_err'), 'error')

                    );

                    return;

                }

                // Check if min sales larger than max

                if ((int) $this->seller_min_sales >= (int) $this->seller_max_sales) {

                    // Error

                    $this->alert(

                        'error',

                        __('messages.t_error'),

                        livewire_alert_params(__('dashboard.t_max_sales_must_be_greater_than_min_level_err'), 'error')

                    );

                    return;

                }

            }

            // Check buyer sales

            if ($this->account_type === 'buyer') {

                // Check if min and max sales set

                if (! $this->buyer_min_purchases || ! $this->buyer_max_purchases) {

                    // Error

                    $this->alert(

                        'error',

                        __('messages.t_error'),

                        livewire_alert_params(__('dashboard.t_pls_set_min_max_purchases_level_err'), 'error')

                    );

                    return;

                }

                // Check if min sales larger than max

                if ((int) $this->buyer_min_purchases >= (int) $this->buyer_max_purchases) {

                    // Error

                    $this->alert(

                        'error',

                        __('messages.t_error'),

                        livewire_alert_params(__('dashboard.t_max_purchases_must_be_greater_than_min_level_err'), 'error')

                    );

                    return;

                }

            }

            // Create new level

            $level = new Level;

            $level->uid = uid();

            $level->account_type = $this->account_type;

            $level->order_number = $this->order_number;

            $level->seller_sales_min = $this->account_type === 'seller' ? $this->seller_min_sales : 0;

            $level->seller_sales_max = $this->account_type === 'seller' ? $this->seller_max_sales : 0;

            $level->buyer_purchases_min = $this->account_type === 'buyer' ? $this->buyer_min_purchases : 0;

            $level->buyer_purchases_max = $this->account_type === 'buyer' ? $this->buyer_max_purchases : 0;

            $level->level_color = $this->text_color;

            $level->level_bg_color = $this->bg_color ?? null;

            $level->badge_id = $badge_id;

            $level->save();

            // Save translations

            foreach (supported_languages() as $language) {

                $level->translateOrNew($language->language_code)->title = isset($this->title[$language->language_code]) && ! empty($this->title[$language->language_code]) ? $this->title[$language->language_code] : null;

            }

            // Save again

            $level->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_level_created_successfully'))

            );

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
