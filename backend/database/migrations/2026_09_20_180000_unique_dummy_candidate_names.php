<?php

use App\Support\DummyBallot;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
        //
    }
};
