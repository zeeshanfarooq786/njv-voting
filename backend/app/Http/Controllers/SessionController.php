<?php

namespace App\Http\Controllers;

use App\Models\Candidate;
use App\Models\Setting;
use App\Models\Vote;
use App\Models\VotingSession;
use App\Support\Election;
use App\Support\StudentEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    public function start(Request $request): JsonResponse
    {
        if (!Setting::votingOpen()) {
            return response()->json([
                'message' => 'Voting is currently closed.',
            ], 403);
        }

        $data = $request->validate([
            'student_email' => ['required', 'string', 'max:255'],
            'student_grade' => ['required', 'string', 'in:'.implode(',', Election::GRADES)],
            'student_boarding' => ['required', 'string', 'in:'.implode(',', Election::BOARDING)],
        ]);

        $email = StudentEmail::normalize($data['student_email']);

        if (!StudentEmail::isValid($email)) {
            return response()->json([
                'message' => 'Email must be a valid @'.StudentEmail::domain().' address.',
            ], 422);
        }

        if (Vote::query()->where('student_email', $email)->exists()) {
            return response()->json([
                'message' => 'This student has already voted.',
            ], 409);
        }

        $teacher = $request->user();

        $grade = strtoupper($data['student_grade']);
        $boarding = $data['student_boarding'];

        $session = DB::transaction(function () use ($teacher, $email, $grade, $boarding) {
            VotingSession::query()
                ->where('teacher_id', $teacher->id)
                ->where('status', VotingSession::STATUS_ACTIVE)
                ->get()
                ->each(fn (VotingSession $active) => $active->markExpired());

            return VotingSession::query()->create([
                'teacher_id' => $teacher->id,
                'student_email' => $email,
                'student_grade' => $grade,
                'student_boarding' => $boarding,
                'token' => VotingSession::generateToken(),
                'started_at' => now(),
                'expires_at' => now()->addMinutes(VotingSession::IDLE_MINUTES),
                'status' => VotingSession::STATUS_ACTIVE,
            ]);
        });

        $candidates = Election::ballot(
            Candidate::query()->orderBy('position')->orderBy('name')->get(),
            $grade,
            $boarding,
        )->map(fn (Candidate $candidate) => [
            'id' => $candidate->id,
            'name' => $candidate->name,
            'position' => $candidate->position,
            'grade' => $candidate->grade,
            'photo_url' => $candidate->photoUrl(),
            'color_tag' => $candidate->color_tag,
            'vote_count' => $candidate->vote_count,
            'has_photo' => filled($candidate->photo_path),
        ]);

        return response()->json([
            'session_token' => $session->token,
            'student_email' => $session->student_email,
            'student_grade' => $session->student_grade,
            'student_boarding' => $session->student_boarding,
            'expires_at' => $session->expires_at->toIso8601String(),
            'election_title' => Setting::electionTitle(),
            'candidates' => $candidates,
        ], 201);
    }

    public function end(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session_token' => ['required', 'string'],
        ]);

        $session = VotingSession::query()
            ->where('token', $data['session_token'])
            ->where('teacher_id', $request->user()->id)
            ->first();

        if ($session && $session->status === VotingSession::STATUS_ACTIVE) {
            $session->markExpired();
        }

        return response()->json(['message' => 'Session ended.']);
    }
}
