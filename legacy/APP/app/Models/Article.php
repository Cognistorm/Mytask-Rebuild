<?php

namespace App\Models;

use Astrotomic\Translatable\Contracts\Translatable as TranslatableContract;
use Astrotomic\Translatable\Translatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Sitemap\Contracts\Sitemapable;
use Spatie\Sitemap\Tags\Url;

class Article extends Model implements Sitemapable, TranslatableContract
{
    use HasFactory, Translatable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'blog_articles';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uid',
        'title',
        'slug',
        'content',
        'image_id',
        'reading_time',
    ];

    /**
     * Set transable fields
     *
     * @var array
     */
    public $translatedAttributes = ['title', 'content'];

    /**
     * Get sitemap
     *
     * @return mixed
     */
    public function toSitemapTag(): Url|string|array
    {
        return url('blog', $this->slug);
    }

    /**
     * Get article image
     *
     * @return object
     */
    public function image()
    {
        return $this->belongsTo(FileManager::class, 'image_id');
    }

    /**
     * Get article comments
     *
     * @return object
     */
    public function comments()
    {
        return $this->hasMany(ArticleComment::class, 'article_id');
    }

    /**
     * Get article seo
     *
     * @return object
     */
    public function seo()
    {
        return $this->hasOne(ArticleSeo::class, 'article_id');
    }
}
