<?php

namespace App\Livewire\Modals;

use LivewireUI\Modal\ModalComponent;

class LanguagesModal extends ModalComponent
{
    public function render()
    {
        return view('livewire.modals.languages-modal');
    }

    public static function modalMaxWidth(): string
    {
        return 'sm';
    }
}
