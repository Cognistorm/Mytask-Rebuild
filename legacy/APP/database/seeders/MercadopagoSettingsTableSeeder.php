<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class MercadopagoSettingsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('mercadopago_settings')->insert([

            0 => [

                'id' => 1,

                'name' => 'Mercadopago',

                'is_enabled' => 0,

                'logo_id' => null,

                'currency' => 'ARS',

                'exchange_rate' => '170.00',

                'deposit_fee' => 2,

            ],

        ]);

    }

}
