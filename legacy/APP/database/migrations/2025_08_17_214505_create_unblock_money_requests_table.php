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
        Schema::create('unblock_money_requests', function (Blueprint $table) {
            $table->id();
            $table->string('uid', 20)->unique();
            $table->unsignedBigInteger('freelancer_id');
            $table->unsignedBigInteger('requestable_id');
            $table->string('requestable_type');
            $table->decimal('amount', 10, 2);
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->boolean('is_seen_by_freelancer')->default(false);
            $table->boolean('is_seen_by_admin')->default(false);
            $table->boolean('request_admin_intervention')->default(false);
            $table->timestamp('created_at');
            $table->foreign('freelancer_id')->references('id')->on('users')->onUpdate('no action')->onDelete('cascade');
            $table->unique(['freelancer_id', 'requestable_id', 'requestable_type', 'status'], 'unique_pending_request_per_user_per_resource');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unblock_money_requests');
    }
};
