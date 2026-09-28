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
        Schema::table('levels', function (Blueprint $table) {
            $table->unsignedBigInteger('badge_id')->nullable()->after('uid');
            $table->integer('order_number')->nullable()->after('badge_id');
            $table->string('level_bg_color', 20)->nullable()->after('level_color');
            $table->foreign('badge_id')->references('id')->on('file_manager')->onUpdate('no action')->onDelete('no action');
            $table->string('title', 60)->nullable()->change();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn('badge_id');
            $table->dropColumn('order_number');
            $table->dropColumn('level_bg_color');
            $table->string('title', 60)->nullable(false)->change();
        });
    }
};
