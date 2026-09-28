<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class XenditSettingsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('xendit_settings')->insert([

            0 => [

                'id' => 1,

                'name' => 'Xendit',

                'is_enabled' => 0,

                'logo_id' => null,

                'currency' => 'IDR',

                'exchange_rate' => '16000.00',

                'deposit_fee' => 2,

            ],

        ]);

    }

}
