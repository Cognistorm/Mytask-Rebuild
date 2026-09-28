<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserRestriction extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_restrictions';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uid',
        'user_id',
        'message',
        'status',
        'files_required',
    ];

    /**
     * Get user
     */
    public function user(): object
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get appeal
     */
    public function appeal(): object
    {
        return $this->hasOne(UserRestrictionAppeal::class, 'restriction_id');
    }
}
