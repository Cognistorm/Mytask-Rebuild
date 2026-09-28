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
        Schema::table('settings_footer', function (Blueprint $table) {
            $table->string('social_wechat')->nullable();
            $table->string('social_tiktok')->nullable();
            $table->string('social_snapchat')->nullable();
            $table->string('social_whatsapp')->nullable();
            $table->string('social_sinaweibo')->nullable();
            $table->string('social_telegram')->nullable();
            $table->string('social_vk')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings_footer', function (Blueprint $table) {
            $table->dropColumn('social_wechat');
            $table->dropColumn('social_tiktok');
            $table->dropColumn('social_snapchat');
            $table->dropColumn('social_whatsapp');
            $table->dropColumn('social_sinaweibo');
            $table->dropColumn('social_telegram');
            $table->dropColumn('social_vk');
        });
    }
};
