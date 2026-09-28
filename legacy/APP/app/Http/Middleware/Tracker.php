<?php

namespace App\Http\Middleware;

use App\Jobs\TrackingService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class Tracker
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {

            // Set the cookie name
            $cookie_name = 'tracking_service';

            // Check if request has this cookie
            if (! $request->hasCookie($cookie_name)) {

                // Get client ip address
                $ip_address = clean($request->ip());

                // Get user agent
                $user_agent = clean($request->userAgent());

                // Get referer
                $referer = clean(request()->headers->get('referer'));

                // Set accept languages header
                $accept_languages = clean($request->server('HTTP_ACCEPT_LANGUAGE'));

                // Get user id
                $user_id = $request->user()?->id;

                // Run the tracker in the background
                dispatch(new TrackingService($ip_address, $user_agent, $referer, $user_id, $accept_languages));

                // Set a cookie that expires after 15 minutes
                Cookie::queue(Cookie::make($cookie_name, Str::uuid()->toString(), 15));

                // Done
                return $next($request);

            } else {

                // Already tracked
                return $next($request);

            }

        } catch (\Throwable $th) {

            // Something is wrong, just continue
            return $next($request);

        }

    }
}
