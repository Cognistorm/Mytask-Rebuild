<?php

namespace App\Utils\Uploader;

use App\Models\FileManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileUploader
{
    private static $file;

    private static $extension;

    private $folder;

    /**
     * Set file to upload

     *

     * @param  object  $file
     * @return object
     */
    public static function make($file)
    {

        // Set file

        self::$file = $file;

        // Get file extension

        self::$extension = $file->extension();

        // Return this

        return new self;

    }

    /**
     * Set folder to upload this image

     *

     * @param  string  $folder
     * @return object
     */
    public function folder($folder)
    {

        try {

            // First let's check the default storage driver

            switch (settings('media')->default_storage_driver) {

                // Local

                case 'local':

                    // Create new directory

                    Storage::disk('custom')->makeDirectory($folder);

                    break;

                default:

                    // code...

                    break;

            }

            // Set the folder

            $this->folder = $folder;

            // Continue

            return $this;

        } catch (\Throwable $th) {

            throw $th;
            // Something went wrong

            return $this;

        }

    }

    /**
     * Upload the file

     *

     * @return mixed
     */
    public function upload()
    {

        try {

            // Generate file id

            $uid = Str::uuid()->toString();

            // Check storage disk

            switch (settings('media')->default_storage_driver) {

                // Local

                case 'local':

                    self::$file->storePubliclyAs($this->folder, $uid.'.'.self::$extension, 'custom');

                    break;

            }

            // Now save file in database

            $file = new FileManager;

            $file->uid = $uid;

            $file->file_name = substr(clean(self::$file->getClientOriginalName()), 0, 120);

            $file->file_url = null;

            $file->file_folder = $this->folder;

            $file->file_size = self::$file->getSize();

            $file->file_mimetype = self::$file->getMimeType();

            $file->file_extension = self::$extension;

            $file->uploader_type = 'user';

            $file->uploader_id = auth()->check() ? auth()->id() : 1;

            $file->save();

            // Return file id

            return $file->id;

        } catch (\Throwable $th) {

            // Something went wrong

            throw $th;
        }

    }

    /**
     * Delete old file by id

     *

     * @param  int  $id
     * @return object
     */
    public function deleteById($id)
    {

        try {

            Schema::disableForeignKeyConstraints();

            DB::statement('SET FOREIGN_KEY_CHECKS = 0');

            // Get file from file manager

            $file = FileManager::where('id', $id)->first();

            // Check if file exists

            if ($file) {

                // Get file local path

                $path = public_path("storage/$file->file_folder/$file->uid.$file->file_extension");

                // Check if file exists

                if (File::exists($path)) {

                    File::delete($path);

                }

                // Now delete from database

                $file->delete();

            }

            Schema::enableForeignKeyConstraints();

            DB::statement('SET FOREIGN_KEY_CHECKS = 1');

            return $this;

        } catch (\Throwable $th) {

            return $this;

        }

    }

}
