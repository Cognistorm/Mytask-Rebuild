<?php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //        if($this->app->environment('production')) {
        //
        //            // Force https, but not in localhost
        //            try {
        //                if (!is_localhost()) {
        //                    \URL::forceScheme('https');
        //                }
        //            } catch (\Throwable $th) {
        //            }
        //
        //        }

        if ($this->app->isLocal()) {
            $this->app->register(\Barryvdh\LaravelIdeHelper\IdeHelperServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        try {
            Schema::disableForeignKeyConstraints();
        } catch (\Throwable $th) {
        }

        Blade::withoutDoubleEncoding();

    }
}
