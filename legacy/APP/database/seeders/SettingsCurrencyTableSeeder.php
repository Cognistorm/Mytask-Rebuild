<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SettingsCurrencyTableSeeder extends Seeder
{
    /**
     * Auto generated seed file

     *

     * @return void
     */
    public function run()
    {

        \DB::table('settings_currency')->insert([

            0 => [

                'id' => 1,

                'name' => 'US Dollar',

                'code' => 'USD',

                'exchange_rate' => '1',

            ],

        ]);

    }

}
