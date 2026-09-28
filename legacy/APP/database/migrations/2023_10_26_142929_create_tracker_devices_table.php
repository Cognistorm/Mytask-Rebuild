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
        Schema::create('tracker_devices', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 16)->nullable()->index();
            $table->string('model', 64)->nullable()->index();
            $table->string('platform', 64)->nullable()->index();
            $table->string('platform_version', 32)->nullable()->index();
            $table->boolean('is_mobile')->default(false);

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
        Schema::dropIfExists('tracker_devices');
    }
};
