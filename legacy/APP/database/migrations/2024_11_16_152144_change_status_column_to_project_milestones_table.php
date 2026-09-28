<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_milestones', function (Blueprint $table) {
            DB::statement("ALTER TABLE `project_milestones` MODIFY `status` ENUM('request', 'funded', 'paid', 'reject')");
        });
    }

    public function down(): void
    {
        Schema::table('project_milestones', function (Blueprint $table) {
            DB::statement("ALTER TABLE `project_milestones` MODIFY `status` ENUM('request', 'funded', 'paid')");
        });
    }
};
