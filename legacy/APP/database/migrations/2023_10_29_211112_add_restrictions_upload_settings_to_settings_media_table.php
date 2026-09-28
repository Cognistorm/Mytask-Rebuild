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
            $table->integer('restrictions_max_files')->default(2)->after('enable_audio_upload');
            $table->integer('restrictions_max_size')->default(5);
            $table->text('restrictions_allowed_extensions')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_media', function (Blueprint $table) {
            $table->dropColumn('restrictions_max_files');
            $table->dropColumn('restrictions_max_size');
            $table->dropColumn('restrictions_allowed_extensions');
        });
    }
};
