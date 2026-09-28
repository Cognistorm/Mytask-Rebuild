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
        Schema::table('blog_settings', function (Blueprint $table) {
            $table->boolean('display_recent_posts')->default(false)->after('enable_blog');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blog_settings', function (Blueprint $table) {
            $table->dropColumn('display_recent_posts');
        });
    }
};
