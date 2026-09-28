<?php

namespace App\Http\Controllers\Uploads\Verifications;

use App\Http\Controllers\Controller;
use App\Models\VerificationCenter;
use Illuminate\Support\Facades\File;

class VerificationsController extends Controller
{
    /**
     * Download verification file

     *

     * @param  string  $id
     * @param  string  $type
     * @param  int  $fileId
     * @return mixed
     */
    public function download($id, $type, $fileId)
    {

        try {

            // Check type

            if (! in_array($type, ['front', 'back', 'selfie'])) {

                abort(404);

            }

            // Set where close

            switch ($type) {

                case 'front':

                    $where = 'file_front_side';

                    break;

                case 'back':

                    $where = 'file_back_side';

                    break;

                case 'selfie':

                    $where = 'file_selfie';

                    break;

            }

            // Get verification

            $verification = VerificationCenter::where('uid', $id)->where($where, $fileId)->firstOrFail();

            if (auth('admin')->check()) {

                // Front side

                if ($type === 'front') {

                    // Get file path

                    $path = public_path('storage/verifications/'.$verification->frontside->uid.'.'.$verification->frontside->file_extension);

                    // Check if file exists

                    if (File::exists($path)) {

                        return response(file_get_contents($path), 200)->header('Content-Type', File::mimeType($path));

                    }

                    // Not found

                    abort(404);

                } elseif ($type === 'back') {

                    // Get file path

                    $path = public_path('storage/verifications/'.$verification->backside->uid.'.'.$verification->backside->file_extension);

                    // Check if file exists

                    if (File::exists($path)) {

                        return response(file_get_contents($path), 200)->header('Content-Type', File::mimeType($path));

                    }

                    // Not found

                    abort(404);

                } elseif ($type === 'selfie') {

                    // Get file path

                    $path = public_path('storage/verifications/'.$verification->selfie->uid.'.'.$verification->selfie->file_extension);

                    // Check if file exists

                    if (File::exists($path)) {

                        return response(file_get_contents($path), 200)->header('Content-Type', File::mimeType($path));

                    }

                    // Not found

                    abort(404);

                } else {

                    abort(404);

                }

            } elseif (auth()->check()) {

                // Get user id

                $user_id = auth()->id();

                // Check if guest has permission to see this file

                if ($verification->user_id !== $user_id) {

                    abort(404);

                }

                // Front side

                if ($type === 'front') {

                    // Get file path

                    $path = public_path('storage/verifications/'.$verification->frontside->uid.'.'.$verification->frontside->file_extension);

                    // Check if file exists

                    if (File::exists($path)) {

                        return response(file_get_contents($path), 200)->header('Content-Type', File::mimeType($path));

                    }

                    // Not found

                    abort(404);

                } elseif ($type === 'back') {

                    // Get file path

                    $path = public_path('storage/verifications/'.$verification->backside->uid.'.'.$verification->backside->file_extension);

                    // Check if file exists

                    if (File::exists($path)) {

                        return response(file_get_contents($path), 200)->header('Content-Type', File::mimeType($path));

                    }

                    // Not found

                    abort(404);

                } elseif ($type === 'selfie') {

                    // Get file path

                    $path = public_path('storage/verifications/'.$verification->selfie->uid.'.'.$verification->selfie->file_extension);

                    // Check if file exists

                    if (File::exists($path)) {

                        return response(file_get_contents($path), 200)->header('Content-Type', File::mimeType($path));

                    }

                    // Not found

                    abort(404);

                } else {

                    abort(404);

                }

            } else {

                // Not login

                abort(404);

            }

        } catch (\Throwable $th) {

            abort(404);

        }

    }

}
