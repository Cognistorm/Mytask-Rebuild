<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {

        Schema::dropIfExists('projects_categories_translation');

        Schema::create('projects_categories_translation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_category_id')->constrained('projects_categories')->cascadeOnUpdate()->cascadeOnDelete();
            $table->string('locale');
            $table->string('name')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects_categories_translation');
    }
};
