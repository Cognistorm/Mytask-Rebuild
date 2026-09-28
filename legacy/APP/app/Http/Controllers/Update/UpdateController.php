<?php

namespace App\Http\Controllers\Update;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class UpdateController extends Controller
{
    /**
     * Start upgrading to latest version

     *

     * @return void
     */
    public function update()
    {

        try {

            Config::write('app.asset_url', url('public'));

            Artisan::call('queue:clear', ['--force' => true]);

            // Delete files

            if (File::exists(database_path('migrations/2014_10_12_000000_create_users_table.php'))) {

                File::delete(database_path('migrations/2014_10_12_000000_create_users_table.php'));

            }

            if (File::exists(database_path('migrations/2023_08_14_999999_create_chatify_favorites_table.php'))) {

                File::delete(database_path('migrations/2023_08_14_999999_create_chatify_favorites_table.php'));

            }

            if (File::exists(database_path('migrations/2023_08_14_999999_create_chatify_messages_table.php'))) {

                File::delete(database_path('migrations/2023_08_14_999999_create_chatify_messages_table.php'));

            }

            // Check if update file exists, or application is up to date

            if (! File::exists(base_path('updating'))) {

                return redirect('/');

            }

            Schema::disableForeignKeyConstraints();

            DB::statement('SET FOREIGN_KEY_CHECKS = 0');

            // Run migration

            Artisan::call('migrate', ['--force' => true]);

            // Clear cache

            Artisan::call('view:clear');

            Artisan::call('config:clear');

            // Delete update file

            File::delete(base_path('updating'));

            // Delete folder

            if (File::exists(app_path('Http/Controllers/Update'))) {

                File::deleteDirectory(app_path('Http/Controllers/Update'));

            }

            // Redirect

            return redirect('/');

        } catch (\Throwable $th) {

            throw $th;
        }

    }

}
