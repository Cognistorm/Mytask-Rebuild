<?php

namespace App\Models;

use App\Enums\ProjectRefundStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectRefund extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'project_refunds';

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
        'project_id',
        'freelancer_id',
        'client_id',
        'reason',
        'status',
        'is_seen_by_freelancer',
        'is_seen_by_admin',
        'request_admin_intervention',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'status' => ProjectRefundStatus::class,
    ];

    /**
     * Get project
     *
     * @return object
     */
    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * Get freelancer
     *
     * @return object
     */
    public function freelancer()
    {
        return $this->belongsTo(User::class, 'freelancer_id')->withTrashed();
    }

    /**
     * Get client
     *
     * @return object
     */
    public function client()
    {
        return $this->belongsTo(User::class, 'client_id')->withTrashed();
    }

    /**
     * Get refund conversation
     *
     * @return object
     */
    public function conversation()
    {
        return $this->hasMany(ProjectRefundConversation::class, 'project_refund_id');
    }
}
