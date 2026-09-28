<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectWorkConversation extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'project_work_conversations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'work_delivery_id',
        'project_id',
        'freelancer_id',
        'employer_id',
        'msg_from',
        'msg_content'
    ];

    /**
     * Get work delivery
     *
     * @return object
     */
    public function workDelivery()
    {
        return $this->belongsTo(ProjectWorkDelivery::class, 'work_delivery_id');
    }

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
        return $this->belongsTo(User::class, 'freelancer_id');
    }

    /**
     * Get employer
     *
     * @return object
     */
    public function employer()
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    /**
     * Get message sender
     *
     * @return object
     */
    public function sender()
    {
        return $this->belongsTo(User::class, 'msg_from');
    }
}
