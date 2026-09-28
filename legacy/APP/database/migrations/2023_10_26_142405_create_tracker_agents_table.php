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
        Schema::create('tracker_agents', function (Blueprint $table) {
            $table->id();
            $table->text('name')->nullable();
            $table->string('name_hash')->nullable()->unique();
            $table->string('browser')->nullable()->index();
            $table->string('browser_version')->nullable();

            $table->timestamps();
            $table->index('created_at');
            $table->index('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracker_agents');
    }
};
