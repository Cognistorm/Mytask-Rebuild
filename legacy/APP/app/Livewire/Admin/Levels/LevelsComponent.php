<?php

namespace App\Livewire\Admin\Levels;

use App\Models\Level;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class LevelsComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    public $orders = [];

    /**
     * Initialize component
     */
    public function mount(): void
    {

        foreach ($this->levels as $level) {

            $this->fill([

                "orders.{$level->id}" => $level->order_number,

            ]);

        }

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_levels'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.levels.levels', [

            'levels' => $this->levels,

        ]);

    }

    /**
     * Get list of levels

     *

     * @return object
     */
    public function getLevelsProperty()
    {

        return Level::with('badge')
            ->withTranslation()
            ->withCount('users')
            ->orderBy('id', 'asc')
            ->paginate(42);

    }

    /**
     * Upadate package order

     *

     * @param  int  $id
     */
    public function updateOrder($id): void
    {

        // Check if package is set

        if (isset($this->orders[$id])) {

            // Get level

            $level = Level::where('id', $id)->firstOrFail();

            // Set the value

            $value = (int) $this->orders[$id];

            // Update level

            $level->order_number = $value;

            $level->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        }

    }

}
