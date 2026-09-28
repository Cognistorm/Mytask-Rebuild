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
        Schema::create('tracker_referer_search_terms', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('referer_id');
            $table->string('search_term', 100)->index();

            $table->timestamps();
            $table->index('created_at');
            $table->index('updated_at');

            $table->foreign('referer_id')->references('id')->on('tracker_referers')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracker_referer_search_terms');
    }
};
