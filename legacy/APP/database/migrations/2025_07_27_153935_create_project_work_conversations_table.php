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
        Schema::create('project_work_conversations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('work_delivery_id')->nullable();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('freelancer_id');
            $table->unsignedBigInteger('employer_id');
            $table->unsignedBigInteger('msg_from');
            $table->longText('msg_content');
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('work_delivery_id')->references('id')->on('project_work_deliveries')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('freelancer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('employer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('msg_from')->references('id')->on('users')->onDelete('cascade');

            // Indexes
            $table->index(['project_id', 'created_at']);
            $table->index(['work_delivery_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_work_conversations');
    }
};
