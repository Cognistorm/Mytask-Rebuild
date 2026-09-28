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
        Schema::table('settings_appearance', function (Blueprint $table) {
            $table->boolean('enable_logo_cloud')->after('custom_code_footer_freelancer_layout')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_appearance', function (Blueprint $table) {
            $table->dropColumn('enable_logo_cloud');
        });
    }
};
