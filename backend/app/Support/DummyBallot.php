<?php

namespace App\Support;

use App\Models\Candidate;

class DummyBallot
{
    public static function namesFor(string $post, ?string $grade = null): array
    {
        $key = $grade ? $post.'|'.$grade : $post;

        return match ($key) {
            'President' => ['Rayyan Malik', 'Saad Qureshi', 'Ibrahim Shah'],
            'Vice President' => ['Hamza Raza', 'Owais Siddiqui', 'Taha Javed'],
            'General Secretary' => ['Usman Farooq', 'Daniyal Sheikh', 'Arham Khan'],
            'Event Committee Head' => ['Shayan Ahmed', 'Rehan Butt', 'Zayan Hashmi'],
            'Deputy Event Committee Head' => ['Mikael Noor', 'Fahad Ansari', 'Haroon Yousuf'],
            'Hostel Committee Head' => ['Ayan Chaudhry', 'Noman Iqbal', 'Kashif Mehmood'],
            'Deputy Hostel Committee Head' => ['Samiullah Baig', 'Waleed Anwar', 'Hammad Rauf'],
            'Academics Committee Head' => ['Zeeshan Tariq', 'Fawad Nadeem', 'Salman Akhtar'],
            'Deputy Academics Committee Head' => ['Moiz Kamran', 'Adeel Hussain', 'Yousuf Imran'],
            'Sports Committee Head' => ['Shahzaib Ali', 'Arsalan Mir', 'Rafay Hassan'],
            'Deputy Sports Committee Head' => ['Umer Latif', 'Nabeel Asif', 'Hassaan Bukhari'],
            'Male Batch/Class Representative|VIII' => ['Ali Haider', 'Farhan Zubair', 'Junaid Saleem'],
            'Male Batch/Class Representative|IX' => ['Abdullah Nisar', 'Maaz Khalid', 'Sohail Anjum'],
            'Male Batch/Class Representative|X' => ['Ehsan Waris', 'Talha Rehman', 'Asadullah Jan'],
            'Male Batch/Class Representative|XI' => ['Rohaan Zaidi', 'Murtaza Gill', 'Sameer Abbasi'],
            'Male Batch/Class Representative|XII' => ['Aariz Siddique', 'Hadi Qazi', 'Zohaib Naeem'],
            'Female Batch/Class Representative|VIII' => ['Hania Riaz', 'Laiba Faisal', 'Maham Irfan'],
            'Female Batch/Class Representative|IX' => ['Areeba Younus', 'Inaya Shahid', 'Dua Fatima'],
            'Female Batch/Class Representative|X' => ['Eshal Waseem', 'Minahil Asim', 'Rania Qadir'],
            'Female Batch/Class Representative|XI' => ['Sarah Jameel', 'Hoorain Saeed', 'Anaya Buksh'],
            'Female Batch/Class Representative|XII' => ['Mehak Aslam', 'Zoya Noman', 'Alina Khawaja'],
            default => ['Sample One', 'Sample Two', 'Sample Three'],
        };
    }

    public static function seed(): void
    {
        $palette = ['#0d7a3e', '#1d4ed8', '#b45309', '#7c3aed', '#be123c', '#0f766e', '#c2410c', '#4338ca'];
        $now = now();
        $i = 0;

        foreach (Election::POSTS as $post) {
            if (Election::isClassRep($post)) {
                foreach (Election::GRADES as $grade) {
                    foreach (static::namesFor($post, $grade) as $name) {
                        Candidate::query()->create([
                            'name' => $name,
                            'position' => $post,
                            'grade' => $grade,
                            'color_tag' => $palette[$i++ % count($palette)],
                            'vote_count' => 0,
                            'is_active' => true,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }
                continue;
            }

            foreach (static::namesFor($post) as $name) {
                Candidate::query()->create([
                    'name' => $name,
                    'position' => $post,
                    'grade' => null,
                    'color_tag' => $palette[$i++ % count($palette)],
                    'vote_count' => 0,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
}
