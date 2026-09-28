<?php

namespace App\Livewire\Main\Includes;

use App\Models\Page;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\View\Factory;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Collection;
use Livewire\Component;

class Footer extends Component
{
    /**
     * Render component
     */
    public function render(): \Illuminate\Foundation\Application|View|Factory|Application
    {
        return view('livewire.main.includes.footer', [
            'pages' => $this->pages,
        ]);
    }

    /**
     * Get pages
     */
    public function getPagesProperty(): Collection
    {

        return Page::query()
            ->with([
                'translations:id,locale,page_id,title',
            ])
            ->orderBy('id', 'asc')
            ->get();

    }
}
