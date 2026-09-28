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
        Schema::create('tracker_geoip', function (Blueprint $table) {
            $table->id();

            $table->double('latitude')->nullable()->index();
            $table->double('longitude')->nullable()->index();

            $table->string('country_name')->nullable()->index();
            $table->string('country_code', 2)->nullable()->index();
            $table->string('city', 50)->nullable()->index();
            $table->string('continent_name')->nullable();
            $table->string('continent_code', 2)->nullable();
            $table->string('timezone', 20)->nullable();

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
        Schema::dropIfExists('tracker_geoip');
    }
};
