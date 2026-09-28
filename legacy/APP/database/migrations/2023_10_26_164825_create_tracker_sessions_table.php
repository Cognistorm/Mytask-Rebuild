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
        Schema::create('tracker_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('device_id')->nullable()->index();
            $table->unsignedBigInteger('agent_id')->nullable()->index();
            $table->unsignedBigInteger('referer_id')->nullable()->index();
            $table->unsignedBigInteger('language_id')->nullable()->index();
            $table->unsignedBigInteger('geoip_id')->nullable()->index();
            $table->ipAddress('client_ip')->nullable()->index();
            $table->boolean('is_robot')->default(false);

            $table->timestamps();
            $table->index('created_at');
            $table->index('updated_at');

            $table->foreign('user_id')->references('id')->on('users')->onUpdate('no action')->onDelete('no action');
            $table->foreign('device_id')->references('id')->on('tracker_devices')->onUpdate('no action')->onDelete('no action');
            $table->foreign('agent_id')->references('id')->on('tracker_agents')->onUpdate('no action')->onDelete('no action');
            $table->foreign('referer_id')->references('id')->on('tracker_referers')->onUpdate('no action')->onDelete('no action');
            $table->foreign('language_id')->references('id')->on('tracker_languages')->onUpdate('no action')->onDelete('no action');
            $table->foreign('geoip_id')->references('id')->on('tracker_geoip')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracker_sessions');
    }
};
