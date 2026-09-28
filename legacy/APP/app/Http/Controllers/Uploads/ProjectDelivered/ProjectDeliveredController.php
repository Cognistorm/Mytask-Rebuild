<?php

namespace App\Http\Controllers\Uploads\ProjectDelivered;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectWorkDelivery;
use Illuminate\Support\Facades\File;

class ProjectDeliveredController extends Controller
{
    /**
     * Download project delivered work file
     *
     * @param  string  $projectId
     * @param  string  $workId
     * @param  string  $fileId
     * @return mixed
     */
    public function download($projectId, $workId, $fileId)
    {
        try {
            // Get user id
            $user_id = auth()->id();

            // Get project
            $project = Project::where('uid', $projectId)->firstOrFail();
            if ($project->user_id == $user_id || $project->awarded_freelancer_id == $user_id) {
                $work = ProjectWorkDelivery::where('uid', $workId)
                                         ->where('project_id', $project->id)
                                         ->firstOrFail();

                if (!$work->attached_work) {
                    abort(404);
                }

                if ($fileId !== $work->attached_work['id']) {
                    abort(404);
                }

                $path = public_path('storage/projects/delivered_work/' . $fileId . '.' . $work->attached_work['extension']);

                if (File::exists($path)) {
                    return response()->download($path, 'delivered_work_' . $work->uid . '.' . $work->attached_work['extension'], []);
                }

                // File not found
                abort(404);

            } else {
                // Unauthorized access
                abort(404);
            }

        } catch (\Throwable $th) {
            abort(404);
        }
    }
}
