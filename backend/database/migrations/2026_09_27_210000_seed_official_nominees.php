<?php

use App\Support\OfficialNominees;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('votes')->delete();
        if (Schema::hasTable('vote_events')) {
            DB::table('vote_events')->delete();
        }
        DB::table('voting_sessions')->delete();

        if (Schema::hasTable('candidates')) {
            DB::table('candidates')->delete();
        }

        if (Storage::disk('public')->exists('candidates')) {
            Storage::disk('public')->deleteDirectory('candidates');
        }

        OfficialNominees::seed();
    }

    public function down(): void
    {
        DB::table('candidates')->delete();
    }
};
