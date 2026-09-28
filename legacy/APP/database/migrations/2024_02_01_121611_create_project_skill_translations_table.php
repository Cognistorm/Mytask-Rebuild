<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_skill_translations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_skill_id');
            $table->string('locale')->index();
            $table->string('name')->nullable();
            $table->foreign('project_skill_id')->references('id')->on('projects_skills')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_skill_translations');
    }
};
