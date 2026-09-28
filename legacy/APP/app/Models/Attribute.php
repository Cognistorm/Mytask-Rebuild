<?php

namespace App\Models;

use Astrotomic\Translatable\Contracts\Translatable as TranslatableContract;
use Astrotomic\Translatable\Translatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attribute extends Model implements TranslatableContract
{
    use HasFactory, Translatable;

    /**
     * Set translatable fields
     *
     * @var array
     */
    public $translatedAttributes = ['name', 'description', 'hint'];

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'attributes';

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
        'uid',
        'category_id',
        'subcategory_id',
        'childcategory_id',
        'type',
        'is_required',
        'is_disabled',
        'is_checked',
    ];

    /**
     * Get options
     */
    public function options(): object
    {
        return $this->hasMany(AttributeOption::class, 'attribute_id');
    }

    /**
     * Get attribute category
     */
    public function category(): object
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * Get attribute subcategory
     */
    public function subcategory(): object
    {
        return $this->belongsTo(Subcategory::class, 'subcategory_id');
    }

    /**
     * Get attribute childcategory
     */
    public function childcategory(): object
    {
        return $this->belongsTo(Childcategory::class, 'childcategory_id');
    }
}
