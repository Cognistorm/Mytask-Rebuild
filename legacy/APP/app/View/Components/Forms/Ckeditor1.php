<?php

namespace App\View\Components\Forms;

use Illuminate\View\Component;
use Livewire\Attributes\Layout;

class Ckeditor1 extends Component
{
    public $quillId;

    public $value;

    public function mount($value = '')
    {
        $this->value = $value;
        $this->quillId = 'quill-'.uniqid();
    }

    /**
     * Get the view / contents that represent the component.
     *
     * @return \Illuminate\Contracts\View\View|\Closure|string
     */
    #[Layout('components.layouts.admin-app')]
    public function render()
    {
        return view('components.forms.ckeditor1');
    }
}
