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
        Schema::table('settings_media', function (Blueprint $table) {
            $table->string('default_storage_driver', 40)->default('local');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_media', function (Blueprint $table) {
            $table->dropColumn('default_storage_driver');
        });
    }
};
