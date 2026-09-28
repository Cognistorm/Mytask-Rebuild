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

        // Categories
        if (Schema::hasColumn('categories', 'name')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->string('name')->nullable(true)->change();
            });
        }

        // Subcategories
        if (Schema::hasColumn('subcategories', 'name')) {
            Schema::table('subcategories', function (Blueprint $table) {
                $table->string('name')->nullable(true)->change();
            });
        }

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {

        // Categories
        if (Schema::hasColumn('categories', 'name')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->string('name')->nullable(false)->change();
            });
        }

        // Subcategories
        if (Schema::hasColumn('subcategories', 'name')) {
            Schema::table('subcategories', function (Blueprint $table) {
                $table->string('name')->nullable(false)->change();
            });
        }

    }
};
