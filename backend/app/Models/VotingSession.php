<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class VotingSession extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_VOTED = 'voted';
    public const STATUS_EXPIRED = 'expired';

    public const IDLE_MINUTES = 5;

    protected $fillable = [
        'teacher_id',
        'student_email',
        'student_grade',
        'student_boarding',
        'token',
        'started_at',
        'ended_at',
        'expires_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function isActive(): bool
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            $this->markExpired();

            return false;
        }

        return true;
    }

    public function markVoted(): void
    {
        $this->update([
            'status' => self::STATUS_VOTED,
            'ended_at' => now(),
        ]);
    }

    public function markExpired(): void
    {
        if ($this->status === self::STATUS_ACTIVE) {
            $this->update([
                'status' => self::STATUS_EXPIRED,
                'ended_at' => now(),
            ]);
        }
    }

    public static function generateToken(): string
    {
        return Str::random(48);
    }
}
