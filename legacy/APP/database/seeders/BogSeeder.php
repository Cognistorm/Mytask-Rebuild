<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BogSeeder extends Seeder
{
    public function run(): void
    {
        $item = DB::table('automatic_payment_gateways')->where('slug', 'bog')->first();
        if ($item) {
            return;
        }

        DB::table('automatic_payment_gateways')->insert([
            [
                'id' => 29,
                'uid' => '95A9BK86004AECF9K451',
                'name' => 'საქართველოს ბანკი / Bank of Georgia',
                'slug' => 'bog',
                'logo_id' => null,
                'currency' => 'GEL',
                'exchange_rate' => 1,
                'fixed_fee' => '{"deposit":"0","gigs":"0","projects":"0","bids":"0"}',
                'percentage_fee' => '{"deposit":"0","gigs":"2.5","projects":"0","bids":"0"}',
                'deposit_min_amount' => 1,
                'deposit_max_amount' => 900000.0,
                'settings' => '{"mrh_login":null,"mrh_pass1":null,"mrh_pass2":null,"inv_id":null,"env":"sandbox","request_link":"https:\\/\\/auth.robokassa.ru\\/Merchant\\/Index.aspx"}',
                'is_active' => 1,
                'country' => 'ge',
            ],
        ]);
    }
}
