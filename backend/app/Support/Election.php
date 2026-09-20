<?php

namespace App\Support;

use App\Models\Candidate;
use Illuminate\Support\Collection;

class Election
{
    public const GRADES = ['VIII', 'IX', 'X', 'XI', 'XII'];

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

    public static function visibleForGrade(Candidate $candidate, ?string $grade): bool
    {
        if (!static::isClassRep($candidate->position)) {
            return true;
        }

        return $grade !== null && strcasecmp((string) $candidate->grade, $grade) === 0;
    }

    public static function ballot(Collection $candidates, ?string $grade): Collection
    {
        return $candidates
            ->filter(fn (Candidate $candidate) => $candidate->is_active && static::visibleForGrade($candidate, $grade))
            ->values();
    }
}
