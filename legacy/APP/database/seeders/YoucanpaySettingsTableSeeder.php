<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class YoucanpaySettingsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        try {

            \DB::table('youcanpay_settings')->insert([

                0 => [

                    'id' => 1,

                    'name' => 'YouCanPay',

                    'is_enabled' => 0,

                    'logo_id' => null,

                    'currency' => 'MAD',

                    'exchange_rate' => '10.20',

                    'deposit_fee' => '2.00',

                ],

            ]);

        } catch (\Throwable $th) {

            //throw $th;

        }

    }

}
