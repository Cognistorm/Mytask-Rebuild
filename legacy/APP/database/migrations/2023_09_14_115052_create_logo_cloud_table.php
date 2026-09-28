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
        Schema::create('logo_cloud', function (Blueprint $table) {
            $table->id();
            $table->string('uid', 40)->unique();
            $table->string('storage_driver', 60)->default('local');
            $table->string('file_mimetype', 30)->nullable();
            $table->string('file_extension', 5)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('logo_cloud');
    }
};
