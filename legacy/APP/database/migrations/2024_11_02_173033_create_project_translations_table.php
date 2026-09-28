<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnUpdate()->cascadeOnDelete();
            $table->string('locale')->index();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
        });

        Schema::table('projects', function (Blueprint $table) {
//            $table->dropColumn('title');
//            $table->dropColumn('description');
//            $table->dropColumn('subcategory_id');
//            $table->dropColumn('childcategory_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_translations');
    }
};
