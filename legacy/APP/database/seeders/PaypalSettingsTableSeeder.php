<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class PaypalSettingsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('paypal_settings')->insert([

            0 => [

                'id' => 1,

                'name' => 'PayPal',

                'is_enabled' => 0,

                'logo_id' => null,

                'exchange_rate' => '1.00',

                'deposit_fee' => 2,

            ],

        ]);

    }

}
