<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Restricted
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {

            // Check if user connected
            if (auth()->check()) {

                // Get user
                $user = auth()->user();

                // Check if user is restricted
                if ($user->is_restricted) {

                    // Redirect user to restrictions removal center
                    return redirect('restricted');

                }

                // User not restricted, continue
                return $next($request);

            } else {

                // Only guest, continue
                return $next($request);

            }

        } catch (\Throwable $th) {

            // Something went wrong, continue
            return $next($request);

        }
    }
}
