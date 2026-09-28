<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

class SwitchTheme
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {

            // Get current theme
            $theme = $request->get('theme');

            // Check theme
            if (in_array($theme, ['dark', 'light'])) {

                // Get appearance settings
                $settings = settings('appearance');

                // Check if theme switcher enabled
                if ($settings->is_theme_switcher) {

                    // Switch to dark mode
                    Cookie::queue('default_theme', $theme, 10080); // 7 days = 10080 min

                }

            }

            // Continue
            return $next($request);

        } catch (\Throwable $th) {

            // Continue
            return $next($request);

        }
    }
}
