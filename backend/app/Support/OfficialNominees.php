<?php

namespace App\Support;

use App\Models\Candidate;

class OfficialNominees
{
    public static function rows(): array
    {
        return [
            ['Muhammad Junaid', 'Male Batch/Class Representative', 'VIII'],
            ['Asif Ali', 'Male Batch/Class Representative', 'IX'],
            ['Hania', 'Event Committee Head', 'IX'],
            ['Hasnain Mujtaba', 'Academics Committee Head', 'IX'],
            ['Waqas Ali', 'Male Batch/Class Representative', 'IX'],
            ['Muhammad Nawaz', 'Male Batch/Class Representative', 'IX'],
            ['Muhammad Bilal', 'Male Batch/Class Representative', 'IX'],
            ['Aqsa Rahib', 'Female Batch/Class Representative', 'IX'],
            ['Abdul Wahab', 'Male Batch/Class Representative', 'IX'],
            ['Sana Zadi', 'Female Batch/Class Representative', 'IX'],
            ['Shagufta', 'Female Batch/Class Representative', 'IX'],
            ['M. Zayan', 'General Secretary', 'X'],
            ['Muhammad Aryanzeb', 'Male Batch/Class Representative', 'X'],
            ['Ayaz Ali', 'General Secretary', 'X'],
            ['Kashaf ul Khair', 'Female Batch/Class Representative', 'X'],
            ['Abdul Mujeeb', 'Male Batch/Class Representative', 'XI'],
            ['Nazakat Ali', 'Male Batch/Class Representative', 'XI'],
            ['Muhammad Anas', 'Male Batch/Class Representative', 'XI'],
            ['Abid Ali', 'Vice President', 'XI'],
            ['Meesam Ali', 'Vice President', 'XI'],
            ['Ghulam Mehdi Raza', 'Male Batch/Class Representative', 'XI'],
            ['Mujeeb Ullah', 'Vice President', 'XI'],
            ['Muhammad Abbas', 'Vice President', 'XI'],
            ['Kashaf Fatima', 'Female Batch/Class Representative', 'XI'],
            ['Abdul Rehman', 'Deputy Event Committee Head', 'XI'],
            ['Kanwal', 'Deputy Event Committee Head', 'XI'],
            ['Muhammad Essa Ali', 'Vice President', 'XI'],
            ['Saeed Hussain', 'Vice President', 'XI'],
            ['Syed Muhammad Hadi Shah', 'Vice President', 'XI'],
            ['Musfira Kamran', 'Deputy Event Committee Head', 'XI'],
            ['Luxhman', 'Hostel Committee Head', 'XI'],
            ['Areesha Rao', 'President', 'XII'],
            ['Shireen', 'Female Batch/Class Representative', 'XII'],
            ['Muhammad Murtaza', 'Academics Committee Head', 'XII'],
            ['Minsa Mahanoor', 'President', 'XII'],
            ['Tarshad', 'President', 'XII'],
            ['Anamta', 'Female Batch/Class Representative', 'XII'],
            ['Virda', 'Academics Committee Head', 'XII'],
            ['Muhammad Kashan', 'Male Batch/Class Representative', 'XII'],
            ['Komal', 'President', 'XII'],
            ['Sohail Ahmed', 'Male Batch/Class Representative', 'XII'],
        ];
    }

    public static function seed(): void
    {
        $palette = ['#0d7a3e', '#1d4ed8', '#b45309', '#7c3aed', '#be123c', '#0f766e', '#c2410c', '#4338ca'];
        $now = now();
        $i = 0;

        foreach (static::rows() as [$name, $position, $grade]) {
            Candidate::query()->create([
                'name' => $name,
                'position' => $position,
                'grade' => Election::isClassRep($position) ? $grade : null,
                'color_tag' => $palette[$i++ % count($palette)],
                'vote_count' => 0,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
