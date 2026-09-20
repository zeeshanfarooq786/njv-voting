<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Candidate extends Model
{
    protected $fillable = [
        'name',
        'position',
        'grade',
        'photo_path',
        'vote_count',
        'color_tag',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'vote_count' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    public function photoUrl(): ?string
    {
        if (!$this->photo_path) {
            return null;
        }

        $path = ltrim(str_replace('\\', '/', $this->photo_path), '/');
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $name = basename($path);

        // Photos have lived in a few places over time; return whichever
        // path actually exists so old and new uploads both keep working.
        foreach ([
            'uploads/candidates/'.$name,
            'uploads/'.$path,
            'storage/candidates/'.$name,
            'storage/'.$path,
        ] as $relative) {
            if (is_file(public_path($relative))) {
                return '/'.$relative;
            }
        }

        return '/storage/candidates/'.$name;
    }
}
