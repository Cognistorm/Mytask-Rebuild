<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE `users`
            MODIFY `account_type`
              ENUM('seller','buyer')
              NOT NULL
              DEFAULT 'seller'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE `users`
            MODIFY `account_type`
              ENUM('seller','buyer')
              NOT NULL
              DEFAULT 'buyer'
        ");
    }
};
