<?php

namespace App\Models;

use App\Enums\ProjectWorkDeliveryStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectWorkDelivery extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'project_work_deliveries';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uid',
        'project_id',
        'milestone_id',
        'freelancer_id',
        'attached_work',
        'quick_response',
        'status',
        'delivered_at'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'attached_work' => 'array',
        'delivered_at' => 'datetime',
        'status' => ProjectWorkDeliveryStatus::class
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
     * Get milestone
     *
     * @return object
     */
    public function milestone()
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }

    /**
     * Get freelancer
     *
     * @return object
     */
    public function freelancer()
    {
        return $this->belongsTo(User::class, 'freelancer_id');
    }

    /**
     * Get conversations
     *
     * @return object
     */
    public function conversations()
    {
        return $this->hasMany(ProjectWorkConversation::class, 'work_delivery_id');
    }
}
