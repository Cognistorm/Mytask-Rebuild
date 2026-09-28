<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SettingsMedia extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'settings_media';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'requirements_file_max_size',
        'requirements_file_allowed_extensions',
        'delivered_work_max_size',
        'enable_audio_upload',
        'completed_work_allowed_extensions',
        'portfolio_max_images',
        'portfolio_max_size',
        'default_storage_driver',
        'restrictions_max_files',
        'restrictions_max_size',
        'restrictions_allowed_extensions',
    ];
}
