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
            $table->unsignedBigInteger('logo_transparent_id')->after('logo_dark_id')->nullable();
            $table->foreign('logo_transparent_id')->references('id')->on('file_manager')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_general', function (Blueprint $table) {
            $table->dropColumn('logo_transparent_id');
        });
    }
};
