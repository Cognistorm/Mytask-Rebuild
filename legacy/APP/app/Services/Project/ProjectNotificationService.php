<?php

namespace App\Services\Project;

use App\Models\Category;
use App\Models\Gig;
use App\Models\Project;
use App\Models\User;
use App\Notifications\User\Freelancer\NewProjectInCategory;

class ProjectNotificationService
{
    public function notifyFreelancersAboutNewProject(Project $project): void
    {
        $project->loadMissing('category');

        if (!$project->category) {
            return;
        }

        $gigCategory = Category::where('slug', $project->category->slug)->first();

        if (!$gigCategory) {
            return;
        }

        $userIds = Gig::where('category_id', $gigCategory->id)
            ->active()
            ->where('user_id', '!=', $project->user_id)
            ->distinct()
            ->pluck('user_id');

        if ($userIds->isEmpty()) {
            return;
        }

        User::whereIn('id', $userIds)
            ->where('status', 'active')
            ->chunk(100, function ($users) use ($project) {
                foreach ($users as $user) {
                    $user->notify(new NewProjectInCategory($project, app()->getLocale()));
                }
            });
    }
}
