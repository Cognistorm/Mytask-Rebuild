<?php

namespace App\Models;

use Astrotomic\Translatable\Contracts\Translatable as TranslatableContract;
use Astrotomic\Translatable\Translatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Childcategory extends Model implements TranslatableContract
{
    use HasFactory, Translatable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'childcategories';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uid',
        'parent_id',
        'subcategory_id',
        'slug',
        'description',
        'icon_id',
        'image_id',
    ];

    public $translatedAttributes = ['name', 'content_top', 'content_bottom'];

    /**
     * Get childcategory parent
     *
     * @return object
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Get childcategory subcategory
     *
     * @return object
     */
    public function subcategory()
    {
        return $this->belongsTo(Subcategory::class, 'subcategory_id');
    }

    /**
     * Get category icon
     *
     * @return object
     */
    public function icon()
    {
        return $this->belongsTo(FileManager::class, 'icon_id');
    }

    /**
     * Get category image
     *
     * @return object
     */
    public function image()
    {
        return $this->belongsTo(FileManager::class, 'image_id');
    }

    /**
     * Get gigs in this subcategory
     *
     * @return object
     */
    public function gigs()
    {
        return $this->hasMany(Gig::class, 'childcategory_id');
    }

    /**
     * Get projects
     *
     * @return object
     */
    public function projects()
    {
        return $this->hasMany(Project::class, 'childcategory_id');
    }
}
