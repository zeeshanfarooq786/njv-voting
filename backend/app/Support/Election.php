<?php

namespace App\Support;

use App\Models\Candidate;
use Illuminate\Support\Collection;

class Election
{
    public const GRADES = ['VIII', 'IX', 'X', 'XI', 'XII'];

    public const BOARDING = ['hosteller', 'day_scholar'];

    public const HOSTEL_POSTS = [
        'Hostel Committee Head',
        'Deputy Hostel Committee Head',
    ];

    public const CLASS_REPS = [
        'Male Batch/Class Representative',
        'Female Batch/Class Representative',
    ];

    public const POSTS = [
        'President',
        'Vice President',
        'General Secretary',
        'Male Batch/Class Representative',
        'Female Batch/Class Representative',
        'Event Committee Head',
        'Deputy Event Committee Head',
        'Hostel Committee Head',
        'Deputy Hostel Committee Head',
        'Academics Committee Head',
        'Deputy Academics Committee Head',
        'Sports Committee Head',
        'Deputy Sports Committee Head',
    ];

    public static function isClassRep(string $position): bool
    {
        return in_array($position, self::CLASS_REPS, true);
    }

    public static function isHostelPost(string $position): bool
    {
        return in_array($position, self::HOSTEL_POSTS, true);
    }

    public static function visibleForStudent(Candidate $candidate, ?string $grade, ?string $boarding): bool
    {
        if (static::isHostelPost($candidate->position) && $boarding !== 'hosteller') {
            return false;
        }

        if (!static::isClassRep($candidate->position)) {
            return true;
        }

        return $grade !== null && strcasecmp((string) $candidate->grade, $grade) === 0;
    }

    public static function visibleForGrade(Candidate $candidate, ?string $grade): bool
    {
        return static::visibleForStudent($candidate, $grade, 'hosteller');
    }

    public static function ballot(Collection $candidates, ?string $grade, ?string $boarding = 'hosteller'): Collection
    {
        return $candidates
            ->filter(fn (Candidate $candidate) => $candidate->is_active && static::visibleForStudent($candidate, $grade, $boarding))
            ->values();
    }
}
