<?php

namespace Database\Seeders;

use App\Models\Candidate;
use App\Models\Vote;
use App\Models\VoteEvent;
use App\Models\VotingSession;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RealCandidatesSeeder extends Seeder
{
    /**
     * The 41 real nominees for NJV Student Council Elections 2026-27, taken
     * from the school's official "List of Nominated Candidates".
     *
     * Listed in the order they appear on that document so any row can be
     * checked back against it.
     *
     * Position strings must match frontend/src/positions.js exactly, em dash
     * included, or the candidate lands under "Other posts" on the ballot.
     */
    private const NOMINEES = [
        // 1-11  Grade VIII and IX
        ['Muhammad Junaid', 'Grade VIII Male Representative'],
        ['Asif Ali', 'Grade IX Male Representative'],
        ['Hania', 'Events Committee Head — Grade IX'],
        ['Hasnain Mujtaba', 'Academic Committee Head — Grade IX'],
        ['Waqas Ali', 'Grade IX Male Representative'],
        ['Muhammad Nawaz', 'Grade IX Male Representative'],
        ['Muhammad Bilal', 'Grade IX Male Representative'],
        ['Aqsa Rahib', 'Grade IX Female Representative'],
        ['Abdul Wahab', 'Grade IX Male Representative'],
        ['Sana Zadi', 'Grade IX Female Representative'],
        ['Shagufta', 'Grade IX Female Representative'],

        // 12-15  Grade X
        ['M,Zayan', 'General Secretary — Grade X'],
        ['Muhammad Aryanzeb', 'Grade X Male Representative'],
        ['Ayaz Ali', 'General Secretary — Grade X'],
        ['Kashaf ul Khair', 'Grade X Female Representative'],

        // 16-31  Grade XI
        ['Abdul Mujeeb', 'Grade XI Male Representative'],
        ['Nazakat Ali', 'Grade XI Male Representative'],
        ['Muhammad Anas', 'Grade XI Male Representative'],
        ['Abid Ali', 'Vice President — Grade XI'],
        ['Meesam Ali', 'Vice President — Grade XI'],
        ['Ghulam Mehdi Raza', 'Grade XI Male Representative'],
        ['Mujeeb Ullah', 'Vice President — Grade XI'],
        ['Muhammad Abbas', 'Vice President — Grade XI'],
        ['Kashaf Fatima', 'Grade XI Female Representative'],
        ['Abdul Rehman', 'Events Committee Deputy Head — Grade XI'],
        ['Kanwal', 'Events Committee Deputy Head — Grade XI'],
        ['Muhammad Essa Ali', 'Vice President — Grade XI'],
        ['Saeed Hussain', 'Vice President — Grade XI'],
        ['Syed Muhammad Hadi Shah', 'Vice President — Grade XI'],
        ['Musfira Kamran', 'Events Committee Deputy Head — Grade XI'],
        ['Luxhman', 'Hostel Committee Head — Grade XI'],

        // 32-41  Grade XII
        ['Areesha Rao', 'President — Grade XII'],
        ['Shireen', 'Grade XII Female Representative'],
        ['Muhammad Murtaza', 'Academic Committee Head — Grade XII'],
        ['Minsa Mahanoor', 'President — Grade XII'],
        ['Tarshad', 'President — Grade XII'],
        ['Anamta', 'Grade XII Female Representative'],
        ['Virda', 'Academic Committee Head — Grade XII'],
        ['Muhammad Kashan', 'Grade XII Male Representative'],
        ['Komal', 'President — Grade XII'],
        ['Sohail Ahmed', 'Grade XII Male Representative'],
    ];

    public function run(): void
    {
        $cleared = [
            'votes' => Vote::query()->count(),
            'candidates' => Candidate::query()->count(),
        ];

        DB::transaction(function (): void {
            // Order matters: clear the records that point at candidates before
            // the candidates themselves.
            Vote::query()->delete();
            VoteEvent::query()->delete();
            VotingSession::query()->delete();
            Candidate::query()->delete();

            foreach (self::NOMINEES as [$name, $position]) {
                Candidate::query()->create([
                    'name' => $name,
                    'position' => $position,
                    'vote_count' => 0,
                    'is_active' => true,
                ]);
            }
        });

        $this->command?->info("Removed {$cleared['votes']} vote(s) and {$cleared['candidates']} old candidate(s).");
        $this->command?->info('Inserted '.count(self::NOMINEES).' real nominees at zero votes.');
        $this->command?->warn('Staff and admin accounts were left untouched.');
    }
}
