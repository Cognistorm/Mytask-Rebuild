<?php

namespace App\Utils\Uploader;

use App\Models\FileManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Image;

class ImageUploader
{
    private static $image;

    private $folder;

    private static $extension = 'webp';

    private static $is_intervention = false;

    private $height = null;

    private $width = null;

    /**
     * Initialize image maker

     *

     * @param  object  $image
     * @return object
     */
    public static function make($image)
    {

        // Get the extension of this file

        $extension = $image?->extension() ?? self::$extension;

        // Check GD driver supports this extension

        if (in_array($extension, ['png', 'jpg', 'webp'])) {

            // We are going to handle this image using the Intervention/Image package

            self::$is_intervention = true;

        }

        // Set image

        self::$image = $image;

        // Now set the default extension

        self::$extension = $extension;

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
     * Set image width

     *

     * @param  int  $width
     * @return object
     */
    public function resize($width = null, $height = null)
    {

        // Set width

        $this->width = $width;

        // Set height

        $this->height = $height;

        // Return this

        return $this;

    }

    /**
     * Set default extension

     *

     * @param  string  $extension
     * @return void
     */
    public function extension($extension)
    {

        self::$extension = $extension;

        return $this;

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

    /**
     * Upload selected file

     *

     * @return int
     */
    public function handle()
    {

        // Get image

        $image = self::$image;

        // Generate a unique id for this file

        $uid = Str::uuid()->toString();

        // Get mime type

        $mime = clean($image->getMimeType());

        // Get image extension

        $extension = clean(self::$extension);

        // Set new file name

        $new_file_name = $uid.'.'.$extension;

        // Get file original name

        $original_file_name = clean(substr($image->getClientOriginalName(), -120));

        // Get the default storage driver

        $default_driver = settings('media')->default_storage_driver;

        // Check default driver

        switch ($default_driver) {

            // Local

            case 'local':

                // Check if we have to handle the picture using Intervention/Image package

                if (self::$is_intervention) {

                    // Process the image

                    $intervention = Image::make($image);

                    // Resize image

                    if ($this->width || $this->height) {

                        $intervention->resize($this->width, $this->height, function ($constraint) {

                            $constraint->aspectRatio();

                        });

                    }

                    // Save image in local storage

                    $intervention->save(public_path("storage/$this->folder/$new_file_name"), 100, $extension);

                    // Get file size

                    $file_size = $intervention->filesize();

                } else {

                    // Upload file directly

                    Storage::disk('custom')->putFileAs($this->folder, $image, $new_file_name);

                    // Get file size

                    $file_size = Storage::disk('custom')->size($this->folder.'/'.$new_file_name);

                }

                // Generate file url

                $file_url = $this->folder.'/'.$new_file_name;

                break;

            default:

                // code...

                break;

        }

        // Save file to database

        $file = new FileManager;

        $file->uid = $uid;

        $file->file_name = $original_file_name;

        $file->file_url = $file_url;

        $file->file_folder = $this->folder;

        $file->file_size = $file_size;

        $file->file_mimetype = $mime;

        $file->file_extension = $extension;

        $file->uploader_type = 'user';

        $file->uploader_id = auth()->check() ? auth()->id() : 1;

        $file->save();

        // Return file id

        return $file->id;

    }

    /**
     * Save image from url

     *

     * @param  string  $url
     * @return int
     */
    public static function fromUrl($url, $folder)
    {

        try {

            // Get image contents

            $contents = file_get_contents($url);

            // Generate unique file id

            $uid = uid();

            // Generate file name

            $name = "$uid.jpg";

            // Get mime type

            $mime = 'image/jpeg';

            // Set path

            $path = public_path("storage/$folder/$name");

            // Save image in local storage

            Storage::disk('custom')->put("$folder/$name", $contents);

            // Get uploaded file size

            $size = File::size($path);

            // Save file

            $file = new FileManager;

            $file->uid = $uid;

            $file->file_folder = $folder;

            $file->file_size = $size;

            $file->file_mimetype = $mime;

            $file->file_extension = 'jpg';

            $file->save();

            // Return file id

            return $file->id;

        } catch (\Throwable $th) {

            return null;

        }

    }

}
