<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class CashfreeSettingsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('cashfree_settings')->insert([

            0 => [

                'id' => 1,

                'name' => 'Cashfree',

                'is_enabled' => 0,

                'logo_id' => null,

                'currency' => 'INR',

                'exchange_rate' => '82.00',

                'deposit_fee' => 2,

            ],

        ]);

    }

}
