<?php

use App\Support\DummyBallot;
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

        DummyBallot::seed();
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
