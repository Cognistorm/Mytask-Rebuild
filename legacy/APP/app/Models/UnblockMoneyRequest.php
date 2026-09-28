<?php

namespace App\Models;

use App\Enums\UnblockMoneyRequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UnblockMoneyRequest extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'unblock_money_requests';

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
        'freelancer_id',
        'requestable_id',
        'requestable_type',
        'amount',
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
        'status' => UnblockMoneyRequestStatus::class,
        'amount' => 'decimal:2',
    ];

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
     * Get the requestable model (polymorphic relation)
     *
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo
     */
    public function requestable()
    {
        return $this->morphTo();
    }
}
