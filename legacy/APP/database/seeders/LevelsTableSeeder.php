<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class LevelsTableSeeder extends Seeder
{
    /**
     * Auto generated seed file
     *
     * @return void
     */
    public function run()
    {

        \DB::table('levels')->insert([
            0 => [
                'id' => 1,
                'uid' => '78F4C8FC6A53DBC09A12',
                'title' => 'New buyer',
                'account_type' => 'buyer',
                'seller_sales_min' => 0,
                'seller_sales_max' => 0,
                'buyer_purchases_min' => 0,
                'buyer_purchases_max' => 1,
                'level_color' => '#4f46e5',
            ],
            1 => [
                'id' => 2,
                'uid' => '0ED0FF687634FB5810FB',
                'title' => 'New seller',
                'account_type' => 'seller',
                'seller_sales_min' => 0,
                'seller_sales_max' => 1,
                'buyer_purchases_min' => 0,
                'buyer_purchases_max' => 0,
                'level_color' => '#dc2626',
            ],
        ]);

    }
}
