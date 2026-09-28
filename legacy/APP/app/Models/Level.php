<?php

namespace App\Models;

use Astrotomic\Translatable\Contracts\Translatable as TranslatableContract;
use Astrotomic\Translatable\Translatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Level extends Model implements TranslatableContract
{
    use HasFactory, Translatable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'levels';

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
        'account_type',
        'seller_sales_min',
        'seller_sales_max',
        'buyer_purchases_min',
        'buyer_purchases_max',
        'level_color',
        'badge_id',
        'order_number',
        'level_bg_color',
    ];

    /**
     * Set translable fields
     *
     * @var array
     */
    public $translatedAttributes = ['title'];

    /**
     * Get level badge icon
     */
    public function badge(): object
    {
        return $this->belongsTo(FileManager::class, 'badge_id');
    }

    /**
     * Get users with this level
     */
    public function users(): object
    {
        return $this->hasMany(User::class, 'level_id');
    }
}
