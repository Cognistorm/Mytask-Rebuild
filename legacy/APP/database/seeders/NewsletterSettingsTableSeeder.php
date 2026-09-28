<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class NewsletterSettingsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('newsletter_settings')->insert([

            0 => [

                'id' => 1,

                'is_enabled' => 1,

            ],

        ]);

    }

}
