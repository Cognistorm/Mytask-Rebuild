<?php

namespace App\Livewire\Admin\System;

use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Livewire\Attributes\Layout;
use Livewire\Component;

class CrontabComponent extends Component
{
    use SEOToolsTrait;

    public $command_queue;

    public $command_schedule;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Set commands

        $this->command_queue = url('tasks/queue');

        $this->command_schedule = url('tasks/schedule');

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

        $this->seo()->setTitle(setSeoTitle(__('messages.t_task_scheduling'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.system.crontab');

    }

}
