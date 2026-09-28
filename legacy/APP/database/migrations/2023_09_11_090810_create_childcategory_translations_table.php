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
        Schema::create('childcategory_translations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('childcategory_id');
            $table->string('locale')->index();
            $table->string('name')->nullable();
            $table->text('content_top')->nullable();
            $table->text('content_bottom')->nullable();

            $table->foreign('childcategory_id')->references('id')->on('childcategories')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('childcategory_translations');
    }
};
