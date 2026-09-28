<?php

namespace App\Http\Middleware;

use App\Models\Language;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;

class SetLocale
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        try {

            // Get locale
            $locale = $request->get('locale');

            // Check if locale is set
            if ($locale) {

                // Get language
                $language = Language::where('language_code', $locale)->where('is_active', true)->first();

                // Check if language exists
                if ($language) {

                    // Set app locale
                    App::setLocale($language->language_code);

                    // Set direction
                    config()->set('direction', $language->force_rtl ? 'rtl' : 'ltr');

                    // Set backend timing locale
                    config()->set('backend_timing_locale', $language->backend_timing_locale);

                    // Set frontend timing locale
                    config()->set('frontend_timing_locale', $language->frontend_timing_locale);

                    // Set default language
                    session()->put('locale', $language->language_code);

                }

            } else {

                // Get locale
                $locale = session()->has('locale') ? session()->get('locale') : settings('general')->default_language;

                // Get language
                $language = Cache::rememberForever('middleware_locale_'.$locale, function () use ($locale) {
                    return Language::where('is_active', true)->where('language_code', $locale)->first();
                });

                // Check if language exists
                if ($language) {

                    // Set app locale
                    App::setLocale($language->language_code);

                    // Set direction
                    config()->set('direction', $language->force_rtl ? 'rtl' : 'ltr');

                    // Set backend timing locale
                    config()->set('backend_timing_locale', $language->backend_timing_locale);

                    // Set frontend timing locale
                    config()->set('frontend_timing_locale', $language->frontend_timing_locale);

                } else {

                    // Set default locale
                    App::setLocale(settings('general')->default_language);

                    // Set direction
                    config()->set('direction', 'ltr');

                    // Set backend timing locale
                    config()->set('backend_timing_locale', 'en_US');

                    // Set frontend timing locale
                    config()->set('frontend_timing_locale', 'en');

                }

            }

            // Continue
            return $next($request);

        } catch (\Throwable $th) {

            // Set default locale
            App::setLocale(settings('general')->default_language);

            // Set direction
            config()->set('direction', 'ltr');

            // Set backend timing locale
            config()->set('backend_timing_locale', 'en_US');

            // Set frontend timing locale
            config()->set('frontend_timing_locale', 'en');

            // Set default language
            session()->put('locale', 'en');

            // Something went wrong
            return $next($request);

        }
    }
}
