<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SettingsFooterTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('settings_footer')->insert([

            0 => [

                'id' => 1,

                'is_language_switcher' => 1,

                'page_terms_id' => null,

                'page_policy_id' => null,

                'logo_id' => null,

                'copyrights' => null,

                'social_facebook' => null,

                'social_twitter' => null,

                'social_instagram' => null,

                'social_linkedin' => null,

                'social_pinterest' => null,

                'social_youtube' => null,

                'social_github' => null,

            ],

        ]);

    }

}
