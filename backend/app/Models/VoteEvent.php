<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoteEvent extends Model
{
    protected $fillable = [
        'candidate_id',
        'new_count',
        'lead_changed',
        'leader_id',
    ];

    protected function casts(): array
    {
        return [
            'new_count' => 'integer',
            'lead_changed' => 'boolean',
        ];
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(Candidate::class, 'leader_id');
    }
}
