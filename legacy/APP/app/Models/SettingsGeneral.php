<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SettingsGeneral extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'settings_general';

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
        'title',
        'subtitle',
        'separator',
        'logo_id',
        'logo_dark_id',
        'logo_transparent_id',
        'favicon_id',
        'header_announce_text',
        'header_announce_link',
        'is_language_switcher',
        'default_language',
        'enable_multivendor',
        'freelancer_requires_approval',
    ];

    /**
     * Get logo
     *
     * @return object
     */
    public function logo()
    {
        return $this->belongsTo(FileManager::class, 'logo_id');
    }

    /**
     * Get logo dark mode
     *
     * @return object
     */
    public function logo_dark()
    {
        return $this->belongsTo(FileManager::class, 'logo_dark_id');
    }

    /**
     * Get logo transparent header
     *
     * @return object
     */
    public function logo_transparent()
    {
        return $this->belongsTo(FileManager::class, 'logo_transparent_id');
    }

    /**
     * Get favicon
     *
     * @return object
     */
    public function favicon()
    {
        return $this->belongsTo(FileManager::class, 'favicon_id');
    }
}
