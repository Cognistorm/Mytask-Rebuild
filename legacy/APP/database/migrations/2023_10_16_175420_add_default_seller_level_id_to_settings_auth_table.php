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
        Schema::table('settings_auth', function (Blueprint $table) {
            $table->unsignedBigInteger('default_seller_level_id')->nullable()->after('auth_img_id');

            $table->foreign('default_seller_level_id')->references('id')->on('levels')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_auth', function (Blueprint $table) {
            $table->dropColumn('default_seller_level_id');
        });
    }
};
