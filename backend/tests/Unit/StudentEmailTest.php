<?php

namespace Tests\Unit;

use App\Support\StudentEmail;
use PHPUnit\Framework\TestCase;

class StudentEmailTest extends TestCase
{
    public function test_accepts_valid_njv_email(): void
    {
        $this->assertTrue(StudentEmail::isValid(StudentEmail::address('ahmed.001')));
        $this->assertTrue(StudentEmail::isValid(StudentEmail::address('sara.malik')));
    }

    public function test_rejects_other_domains(): void
    {
        $this->assertFalse(StudentEmail::isValid('student@gmail.com'));
        $this->assertFalse(StudentEmail::isValid('not-an-email'));
        $this->assertFalse(StudentEmail::isValid(''));
    }

    public function test_normalizes_email(): void
    {
        $raw = '  '.strtoupper(StudentEmail::address('ahmed.001')).'  ';
        $this->assertSame(StudentEmail::address('ahmed.001'), StudentEmail::normalize($raw));
    }
}
