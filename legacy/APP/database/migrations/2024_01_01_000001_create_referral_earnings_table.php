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
        Schema::create('referral_earnings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('referrer_id');
            $table->unsignedBigInteger('referred_user_id');
            $table->string('event_type')->default('signup');
            $table->integer('points')->default(0);
            $table->string('status')->default('pending');
            $table->text('description')->nullable();
            $table->timestamp('earned_at');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->foreign('referrer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('referred_user_id')->references('id')->on('users')->onDelete('cascade');

            $table->index(['referrer_id', 'status']);
            $table->index(['referred_user_id']);
            $table->index(['event_type']);
            $table->unique(['referrer_id', 'referred_user_id', 'event_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referral_earnings');
    }
};
