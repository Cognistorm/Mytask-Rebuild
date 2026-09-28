<?php

namespace App\Http\Controllers\Uploads\Restrictions;

use App\Http\Controllers\Controller;
use App\Models\FileManager;
use Illuminate\Support\Facades\File;

class FileController extends Controller
{
    public function download($id)
    {

        try {

            // Check if document exists

            $file = FileManager::where('uid', $id)->firstOrFail();

            // Get document path

            $path = public_path('storage/restrictions_appeals/'.$file->uid.'.'.$file->file_extension);

            // Check if file exists

            if (File::exists($path)) {

                return response()->download($path, $file->uid.'.'.$file->file_extension, []);

            }

            // Not found

            abort(404);

        } catch (\Throwable $th) {

            abort(404);

        }

    }

}
