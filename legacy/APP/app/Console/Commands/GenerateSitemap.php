<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Models\Category;
use App\Models\Gig;
use App\Models\Project;
use App\Models\ProjectCategory;
use Illuminate\Console\Command;
use Spatie\Sitemap\Sitemap;

class GenerateSitemap extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitemap:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate a sitemap';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        if (settings('seo')->is_sitemap) {

            // Get gigs
            $gigs = Gig::active()->get();

            // Get projects
            $projects = Project::whereIn('status', ['active', 'completed', 'closed', 'incomplete', 'under_development'])->get();

            // Get gigs categories
            $gigs_categories = Category::latest()->select('slug')->get();

            // Get projects categories
            $projects_categories = ProjectCategory::latest()->select('slug')->get();

            // Get blog articles
            $articles = Article::latest()->select('slug')->get();

            // Create sitemap
            Sitemap::create()
                ->add($gigs)
                ->add($projects)
                ->add($gigs_categories)
                ->add($projects_categories)
                ->add($articles)
                ->writeToFile(base_path('sitemap.xml'));
        }
    }
}
