<?php

use App\Models\Candidate;
use App\Support\Election;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            if (!Schema::hasColumn('candidates', 'grade')) {
                $table->string('grade', 8)->nullable()->after('position');
            }
        });

        Schema::table('voting_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('voting_sessions', 'student_grade')) {
                $table->string('student_grade', 8)->nullable()->after('student_email');
            }
        });

        DB::table('votes')->delete();
        if (Schema::hasTable('vote_events')) {
            DB::table('vote_events')->delete();
        }
        DB::table('voting_sessions')->delete();
        DB::table('candidates')->delete();

        $palette = ['#0d7a3e', '#1d4ed8', '#b45309', '#7c3aed', '#be123c', '#0f766e', '#c2410c', '#4338ca'];
        $boys = ['Ahmed Khan', 'Bilal Hussain', 'Hassan Ali'];
        $girls = ['Ayesha Siddiqui', 'Zara Malik', 'Fatima Noor'];
        $now = now();
        $i = 0;

        foreach (Election::POSTS as $post) {
            if (Election::isClassRep($post)) {
                $names = str_contains($post, 'Female') ? $girls : $boys;
                foreach (Election::GRADES as $grade) {
                    foreach ($names as $n => $name) {
                        Candidate::query()->create([
                            'name' => $name.' '.$grade,
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

            $names = str_contains($post, 'Female') ? $girls : $boys;
            foreach ($names as $name) {
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

    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            if (Schema::hasColumn('candidates', 'grade')) {
                $table->dropColumn('grade');
            }
        });
        Schema::table('voting_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('voting_sessions', 'student_grade')) {
                $table->dropColumn('student_grade');
            }
        });
    }
};
