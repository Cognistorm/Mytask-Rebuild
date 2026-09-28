<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SettingsHeroTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        try {

            \DB::table('settings_hero')->insert([

                0 => [

                    'id' => 1,

                    'enable_bg_img' => 0,

                    'bg_large_id' => null,

                    'bg_medium_id' => null,

                    'bg_small_id' => null,

                    'bg_color' => '#a1a1aa',

                    'bg_large_height' => 570,

                    'bg_small_height' => 250,

                ],

            ]);

        } catch (\Throwable $th) {

            //throw $th;

        }

    }

}
