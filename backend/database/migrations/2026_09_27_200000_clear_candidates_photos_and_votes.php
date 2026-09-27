<?php

use App\Models\Candidate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        foreach (Candidate::query()->whereNotNull('photo_path')->get() as $candidate) {
            Storage::disk('public')->delete($candidate->photo_path);
        }

        if (Storage::disk('public')->exists('candidates')) {
            Storage::disk('public')->deleteDirectory('candidates');
        }

        DB::table('votes')->delete();
        if (Schema::hasTable('vote_events')) {
            DB::table('vote_events')->delete();
        }
        DB::table('voting_sessions')->delete();
        DB::table('candidates')->delete();
    }

    public function down(): void
    {
        //
    }
};
