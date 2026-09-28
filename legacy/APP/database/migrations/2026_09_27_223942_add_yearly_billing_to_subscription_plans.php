<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table(config('laravel-subscriptions.tables.plans'), function (Blueprint $table): void {
            $table->decimal('yearly_price')->nullable()->after('price');
        });

        Schema::table(config('laravel-subscriptions.tables.subscriptions'), function (Blueprint $table): void {
            $table->string('billing_period')->default('month')->after('payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table(config('laravel-subscriptions.tables.plans'), function (Blueprint $table): void {
            $table->dropColumn('yearly_price');
        });

        Schema::table(config('laravel-subscriptions.tables.subscriptions'), function (Blueprint $table): void {
            $table->dropColumn('billing_period');
        });
    }
};
