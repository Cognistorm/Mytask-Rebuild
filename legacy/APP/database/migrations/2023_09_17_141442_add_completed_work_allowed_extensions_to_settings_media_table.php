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
            $table->text('completed_work_allowed_extensions')->nullable()->after('delivered_work_max_size');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_media', function (Blueprint $table) {
            $table->dropColumn('completed_work_allowed_extensions');
        });
    }
};
