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
        Schema::create('project_refunds', function (Blueprint $table) {
            $table->id();
            $table->string('uid', 20)->unique();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('freelancer_id');
            $table->unsignedBigInteger('client_id');
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->boolean('is_seen_by_freelancer')->default(false);
            $table->boolean('is_seen_by_admin')->default(false);
            $table->boolean('request_admin_intervention')->default(false);
            $table->timestamp('created_at');

            $table->foreign('project_id')->references('id')->on('projects')->onUpdate('no action')->onDelete('no action');
            $table->foreign('freelancer_id')->references('id')->on('users')->onUpdate('no action')->onDelete('no action');
            $table->foreign('client_id')->references('id')->on('users')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_refunds');
    }
};
