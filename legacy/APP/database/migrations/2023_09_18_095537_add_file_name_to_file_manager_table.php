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
        Schema::table('file_manager', function (Blueprint $table) {
            $table->string('uid', 36)->change();
            $table->string('file_name', 120)->nullable()->after('uid');
            $table->text('file_url')->nullable()->after('file_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('file_manager', function (Blueprint $table) {
            $table->dropColumn('file_name');
            $table->dropColumn('file_url');
        });
    }
};
