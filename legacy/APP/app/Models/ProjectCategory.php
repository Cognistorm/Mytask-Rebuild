<?php

namespace App\Models;

use Astrotomic\Translatable\Contracts\Translatable as TranslatableContract;
use Astrotomic\Translatable\Translatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\Sitemap\Contracts\Sitemapable;
use Spatie\Sitemap\Tags\Url;

class ProjectCategory extends Model implements Sitemapable, TranslatableContract, HasMedia
{
    use Translatable, InteractsWithMedia;

     public $translatedAttributes = ['name'];

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'projects_categories';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uid',
        'slug',
        'seo_description',
    ];

    /**
     * Get sitemap
     *
     * @return mixed
     */
    public function toSitemapTag(): Url|string|array
    {
        return url('explore/projects', $this->slug);
    }

    /**
     * Get projects in this category
     *
     * @return object
     */
    public function projects()
    {
        return $this->hasMany(Project::class, 'category_id');
    }

    /**
     * Get thumbnail
     *
     * @return object
     */
    public function thumbnail()
    {
        return $this->belongsTo(FileManager::class, 'thumbnail_id');
    }

    /**
     * Get ogimage
     *
     * @return object
     */
    public function ogimage()
    {
        return $this->belongsTo(FileManager::class, 'ogimage_id');
    }

    /**
     * Get category skils
     *
     * @return object
     */
    public function skills()
    {
        return $this->hasMany(ProjectSkill::class, 'category_id');
    }

    protected function getAttributeAndLocale($key): array
    {
        if (is_null($key)){
            $key = '';
        }

        if (Str::contains($key, ':')) {
            return explode(':', $key);
        }

        return [$key, $this->locale()];
    }
}
