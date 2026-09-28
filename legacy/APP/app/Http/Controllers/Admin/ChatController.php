<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChMessage;
use App\Utils\Chat\ChatApi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class ChatController extends Controller
{
    protected $chat;

    public function __construct()
    {
        $this->chat = new ChatApi();
    }

    /**
     * Download chat attachment for admin users
     * This method allows admin users to download chat attachments without authentication restrictions
     *
     * @param string $fileName
     * @return \Symfony\Component\HttpFoundation\StreamedResponse|void
     */
    public function download($fileName)
    {
        // Get file path
        $path = config('chatify.attachments.folder').'/'.$fileName;

        // Check if file exists
        if ($this->chat->storage()->exists($path)) {
            // Find the message that contains this attachment to get the original filename
            $message = ChMessage::whereNotNull('attachment')
                ->where('attachment', 'LIKE', '%"new_name":"'.$fileName.'"%')
                ->first();

            $originalName = $fileName; // Default fallback
            if ($message && $message->attachment) {
                $attachmentData = json_decode($message->attachment);
                $originalName = $attachmentData->old_name ?? $fileName;
            }

            // Handle different storage drivers
            $storageDriver = config('filesystems.disks.'.config('chatify.storage_disk_name').'.driver');

            if ($storageDriver === 's3') {
                // For S3, we need to create a response with file contents
                try {
                    $fileContents = $this->chat->storage()->get($path);
                    $mimeType = $this->chat->storage()->mimeType($path);

                    return response($fileContents)
                        ->header('Content-Type', $mimeType)
                        ->header('Content-Disposition', 'attachment; filename="' . $originalName . '"')
                        ->header('Content-Length', strlen($fileContents));
                } catch (\Exception $e) {
                    \Log::error('Error downloading file from S3: ' . $e->getMessage());
                    return abort(500, 'Error downloading file');
                }
            } else {
                // For local storage, use the standard download method
                return $this->chat->storage()->download($path, $originalName);
            }
        }

        // File not found
        return abort(404, __('messages.t_sorry_file_chat_does_not_exist'));
    }
}
