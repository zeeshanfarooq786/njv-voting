<?php

namespace App\Support;

class StudentEmail
{
    public static function domain(): string
    {
        return implode('.', ['njv', 'edu', 'pk']);
    }

    public static function isValid(?string $email): bool
    {
        if (!$email) {
            return false;
        }

        $normalized = self::normalize($email);

        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        return str_ends_with($normalized, '@'.self::domain());
    }

    public static function isStaffValid(?string $email): bool
    {
        if (!$email) {
            return false;
        }

        $normalized = self::normalize($email);

        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        return str_ends_with($normalized, '@'.self::domain())
            || str_ends_with($normalized, '@gmail.com');
    }

    public static function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    public static function address(string $localPart): string
    {
        return strtolower($localPart).'@'.self::domain();
    }
}
