<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SettingsGeneralTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('settings_general')->insert([

            0 => [

                'id' => 1,

                'title' => 'Riverr',

                'subtitle' => 'Freelance Services Marketplace',

                'separator' => '|',

                'logo_id' => null,

                'logo_dark_id' => null,

                'favicon_id' => null,

                'header_announce_text' => null,

                'header_announce_link' => null,

                'is_language_switcher' => 1,

                'default_language' => 'en',

            ],

        ]);

    }

}
