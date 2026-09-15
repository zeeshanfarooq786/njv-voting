<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $cached = Cache::rememberForever('setting.'.$key, function () use ($key) {
            return static::query()->where('key', $key)->value('value');
        });

        if ($cached === null) {
            return $default;
        }

        return $cached;
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value]
        );

        Cache::forget('setting.'.$key);
        Cache::forever('setting.'.$key, is_bool($value) ? ($value ? '1' : '0') : (string) $value);
    }

    public static function votingOpen(): bool
    {
        return static::getValue('voting_open', '1') === '1';
    }

    public static function electionTitle(): string
    {
        return (string) static::getValue('election_title', 'NJV Government School Student Council Election');
    }

    public static function eligibleStudents(): int
    {
        return (int) static::getValue('eligible_students', '450');
    }
}
