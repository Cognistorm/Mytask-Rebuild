<?php

namespace App\Livewire\Installation;

use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Artisan;
use Config;
use DB;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class DatabaseComponent extends Component
{
    use Actions, LivewireAlert, SEOToolsTrait;

    public $host;

    public $port;

    public $database;

    public $username;

    public $password;

    /**
     * Init component

     *

     * @return void
     */
    public function mount()
    {

        // Fill default data

        $this->fill([

            'host' => 'localhost',

            'port' => 3306,

        ]);

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.install')]

    public function render()
    {

        // SEO

        $this->seo()->setTitle('Installation | Database');

        return view('livewire.installation.database');

    }

    /**
     * Go to next step

     *

     * @return void
     */
    public function next()
    {

        try {

            // Clear database cache

            DB::purge();

            // Set database details

            Config::write('database.connections.mysql.host', $this->host);

            Config::write('database.connections.mysql.database', $this->database);

            Config::write('database.connections.mysql.port', $this->port);

            Config::write('database.connections.mysql.username', $this->username);

            // Set password if exists

            if ($this->password) {

                Config::write('database.connections.mysql.password', $this->password);

            }

            // Clear config

            Artisan::call('config:clear');

            // Connect to database

            DB::connection()->getPDO();

            // Check connection

            if (DB::connection()->getDatabaseName()) {

                // Run migration

                Artisan::call('migrate', ['--force' => true]);

                // After that we need to run seeder

                Artisan::call('db:seed', ['--force' => true]);

                // Edit session.php

                Config::write('session.driver', 'database');

                // Clear config

                Artisan::call('config:clear');

                // Connected, create new admin account

                return redirect('install/administrator');

            } else {

                // Not connected

                $this->alert(

                    'error',

                    'We are unable to connect to this database. Please try again'

                );

            }

        } catch (\Throwable $th) {

            throw $th;
            // Not connected

            $this->alert(

                'error',

                $th->getMessage()

            );

        }

    }

}
