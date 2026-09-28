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
        Schema::table('settings_general', function (Blueprint $table) {
            $table->boolean('enable_multivendor')->after('default_language')->default(true);
            $table->boolean('freelancer_requires_approval')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_general', function (Blueprint $table) {
            $table->dropColumn('enable_multivendor');
            $table->dropColumn('freelancer_requires_approval');
        });
    }
};
