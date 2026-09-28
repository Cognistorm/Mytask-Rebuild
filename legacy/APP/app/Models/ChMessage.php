<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;   // ← change this


class ChMessage extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'ch_messages';

    /**
     * Get message from
     *
     * @return object
     */
    public function from()
    {
        return $this->belongsTo(User::class, 'from_id');
    }

    /**
     * Get message to
     *
     * @return object
     */
    public function to()
    {
        return $this->belongsTo(User::class, 'to_id');
    }

    /**
     * Get avatar
     *
     * @return object
     */
    public function avatar()
    {
        return $this->belongsTo(FileManager::class, 'avatar_id');
    }

    public function scopeBetween(Builder $query, int $a, int $b): Builder
    {
        return $query
            ->where(fn($q) => $q
                ->where('from_id', $a)
                ->where('to_id',   $b)
            )
            ->orWhere(fn($q) => $q
                ->where('from_id', $b)
                ->where('to_id',   $a)
            );
    }
}
