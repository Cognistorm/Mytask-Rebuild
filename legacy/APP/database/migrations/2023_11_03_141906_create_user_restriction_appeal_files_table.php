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
        Schema::create('user_restriction_appeal_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('appeal_id');
            $table->unsignedBigInteger('file_id');

            $table->foreign('appeal_id')->references('id')->on('user_restriction_appeals')->onUpdate('no action')->onDelete('no action');
            $table->foreign('file_id')->references('id')->on('file_manager')->onUpdate('no action')->onDelete('no action');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_restriction_appeal_files');
    }
};
