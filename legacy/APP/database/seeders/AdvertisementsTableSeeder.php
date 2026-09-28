<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class AdvertisementsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('advertisements')->insert([

            0 => [

                'id' => 1,

                'header_code' => null,

                'ad_service_360' => null,

                'ad_service_720' => null,

            ],

        ]);

    }

}
