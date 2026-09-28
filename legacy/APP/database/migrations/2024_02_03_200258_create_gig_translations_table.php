<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gig_translations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gig_id');
            $table->string('locale')->index();
            $table->text('description')->nullable();
            $table->foreign('gig_id')->references('id')->on('gigs')->onDelete('cascade');

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gig_translations');
    }
};
