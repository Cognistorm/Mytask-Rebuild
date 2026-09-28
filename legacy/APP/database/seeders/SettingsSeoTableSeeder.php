<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SettingsSeoTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('settings_seo')->insert([

            0 => [

                'id' => 1,

                'description' => null,

                'facebook_page_id' => null,

                'facebook_app_id' => null,

                'twitter_username' => null,

                'ogimage_id' => null,

                'is_sitemap' => 1,

            ],

        ]);

    }

}
