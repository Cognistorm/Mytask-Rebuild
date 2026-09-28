<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Plan;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        Plan::updateOrCreate(
            ['slug' => 'standard'],
            [
                'name' => [
                    'en' => 'Standard',
                    'ka' => 'სტანდარტული'
                ],
                'description' => [
                    'en' => 'Basic access with standard features',
                    'ka' => 'საბაზისო წვდომა სტანდარტული ფუნქციებით'
                ],
                'features_included' => [
                    'en' => [
                        '1 listing post',
                        'Direct chat with users',
                    ],
                    'ka' => [
                        "1 განცხადების გამოქვეყნება",
                        "მომხმარებელთან პირდაპირი ჩათის ფუნქცია",
                    ],
                ],
                'features_excluded' => [
                    'en' => [
                        "Featured listing design",
                        "Appearance in top offers",
                        "Ability to send offers on projects",
                        "Ability to view others’ offers on projects",
                        "Ability to contact project authors",
                    ],
                    'ka' => [
                        "გამორჩეული განცხადების ჩარჩო",
                        "განცხადების ტოპ შეთავაზებებში გამოჩენა",
                        "პროექტებზე შეთავაზების გაგზავნის უფლება",
                        "პროექტებზე სხვების შეთავაზების ნახვა",
                        "პროექტის ავტორთან დაკავშირება",
                    ]
                ],
                'price' => 0.00,
                'signup_fee' => 0.00,
                'sort_order' => 1,
                'currency' => 'GEL',
            ]
        );

        // Update or create the Premium plan
        Plan::updateOrCreate(
            ['slug' => 'premium'],
            [
                'name' => [
                    'en' => 'Premium',
                    'ka' => 'პრემიუმი'
                ],
                'description' => [
                    'en' => 'Full access to all Premium features',
                    'ka' => 'სრული წვდომა ყველა პრემიუმ ფუნქციაზე'
                ],
                'features_included' => [
                    'en' => [
                        "Unlimited listing posts",
                        "Direct chat with users",
                        "Visual highlight for featured listings",
                        "Appearance in top offers",
                        "Ability to send offers on projects",
                        "Ability to view others’ offers on projects",
                        "Ability to contact project authors",
                    ],
                    'ka' => [
                        "ულიმიტო განცხადებების გამოქვეყნება",
                        "მომხმარებელთან პირდაპირი ჩათის ფუნქცია",
                        "გამორჩეული განცხადების ვიზუალი",
                        "განცხადების ტოპ შეთავაზებებში გამოჩენა",
                        "პროექტზე შეთავაზების გაგზავნის უფლება",
                        "პროექტებზე სხვების შეთავაზების ნახვა",
                        "პროექტის ავტორთან დაკავშირება",
                    ]
                ],
                'invoice_period' => 1,
                'features_excluded' => [
                    'en' => [],
                    'ka' => []
                ],
                'price' => 9.99,
                'yearly_price' => 99.99,
                'signup_fee' => 0.00,
                'sort_order' => 2,
                'currency' => 'GEL',
            ]
        );
        // Delete premium-plus plan if it exists
        Plan::where('slug', 'premium-plus')->delete();
    }
}
