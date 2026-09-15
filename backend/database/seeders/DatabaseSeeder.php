<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use App\Support\StudentEmail;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => StudentEmail::address('admin')],
            [
                'name' => 'NJV Principal',
                'password' => Hash::make('admin12345'),
                'role' => 'admin',
            ]
        );

        User::query()->updateOrCreate(
            ['email' => StudentEmail::address('teacher')],
            [
                'name' => 'Ms. Ayesha Khan',
                'password' => Hash::make('teacher12345'),
                'role' => 'teacher',
            ]
        );

        Setting::setValue('voting_open', true);
        Setting::setValue('election_title', 'NJV Government School Student Council Election 2026');
        Setting::setValue('eligible_students', 450);

        // Candidates are added in the admin panel for the official 2026-27 posts.
    }
}
