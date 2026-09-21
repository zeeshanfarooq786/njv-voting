<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('voting_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('voting_sessions', 'student_boarding')) {
                $table->string('student_boarding', 24)->nullable()->after('student_grade');
            }
        });
    }

    public function down(): void
    {
        Schema::table('voting_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('voting_sessions', 'student_boarding')) {
                $table->dropColumn('student_boarding');
            }
        });
    }
};
