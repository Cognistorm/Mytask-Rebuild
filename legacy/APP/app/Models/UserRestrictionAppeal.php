<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserRestrictionAppeal extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_restriction_appeals';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uid',
        'restriction_id',
        'message',
    ];

    /**
     * Get appeal attachments
     */
    public function attachments(): object
    {
        return $this->hasMany(UserRestrictionAppealFile::class, 'appeal_id');
    }
}
