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
        Schema::create('tracker_referers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('domain_id');
            $table->text('url')->nullable();
            $table->string('medium')->nullable()->index();
            $table->string('source')->nullable()->index();
            $table->string('search_terms_hash')->nullable()->index();

            $table->timestamps();
            $table->index('created_at');
            $table->index('updated_at');

            $table->foreign('domain_id')->references('id')->on('tracker_domains')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracker_referers');
    }
};
