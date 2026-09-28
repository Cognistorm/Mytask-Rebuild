<?php

namespace App\Livewire\Main\Auth;

use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Illuminate\Support\Facades\Auth;
use Livewire\Component;

class LogoutComponent extends Component
{
    use SEOToolsTrait;

    public function mount()
    {
        // Preserve the current language selection before logout
        $currentLocale = session()->get('locale');

        Auth::logout();

        request()->session()->invalidate();

        request()->session()->regenerateToken();

        // Restore the language selection after session regeneration
        if ($currentLocale) {
            session()->put('locale', $currentLocale);
        }

        return redirect('/');

    }

}
