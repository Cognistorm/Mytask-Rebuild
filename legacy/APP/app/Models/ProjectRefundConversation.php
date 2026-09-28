<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectRefundConversation extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'project_refund_conversations';

    /**
     * The name of the "updated at" column.
     *
     * @var string
     */
    const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uid',
        'project_refund_id',
        'author_type',
        'author_id',
        'message',
    ];

    /**
     * Get freelancer
     *
     * @return object
     */
    public function freelancer()
    {
        return $this->belongsTo(User::class, 'author_id')->withTrashed();
    }

    /**
     * Get client
     *
     * @return object
     */
    public function client()
    {
        return $this->belongsTo(User::class, 'author_id')->withTrashed();
    }

    /**
     * Get project refund
     *
     * @return object
     */
    public function projectRefund()
    {
        return $this->belongsTo(ProjectRefund::class, 'project_refund_id');
    }
}
