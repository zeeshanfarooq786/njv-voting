<?php

namespace App\Http\Controllers;

use App\Models\Candidate;
use App\Models\Setting;
use App\Models\Vote;
use App\Models\VoteEvent;
use App\Models\VotingSession;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VoteController extends Controller
{
    public function candidates(Request $request): JsonResponse
    {
        $session = $this->activeSession($request->query('session_token'));

        if (!$session) {
            return response()->json([
                'message' => 'An active teacher-authorized session is required.',
            ], 403);
        }

        $candidates = Candidate::query()
            ->where('is_active', true)
            ->orderBy('position')
            ->orderBy('name')
            ->get()
            ->map(fn (Candidate $candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'position' => $candidate->position,
                'photo_url' => $candidate->photoUrl(),
                'color_tag' => $candidate->color_tag,
                'vote_count' => $candidate->vote_count,
                'has_photo' => filled($candidate->photo_path),
            ]);

        return response()->json([
            'election_title' => Setting::electionTitle(),
            'student_email' => $session->student_email,
            'expires_at' => $session->expires_at->toIso8601String(),
            'candidates' => $candidates,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!Setting::votingOpen()) {
            return response()->json([
                'message' => 'Voting is currently closed.',
            ], 403);
        }

        $data = $request->validate([
            'session_token' => ['required', 'string'],
            'candidate_id' => ['nullable', 'integer', 'exists:candidates,id'],
            'candidate_ids' => ['nullable', 'array', 'min:1'],
            'candidate_ids.*' => ['integer', 'exists:candidates,id'],
        ]);

        $ids = $data['candidate_ids'] ?? [];
        if ($data['candidate_id'] ?? null) {
            $ids[] = (int) $data['candidate_id'];
        }
        $ids = array_values(array_unique(array_map('intval', $ids)));
        if ($ids === []) {
            return response()->json(['message' => 'Select a candidate for every post.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($request, $data, $ids) {
                $session = VotingSession::query()
                    ->where('token', $data['session_token'])
                    ->lockForUpdate()
                    ->first();

                if (!$session || !$session->isActive()) {
                    abort(403, 'This voting session is no longer active.');
                }

                if (Vote::query()->where('student_email', $session->student_email)->exists()) {
                    abort(409, 'This student has already voted.');
                }

                $previousLeader = Candidate::query()
                    ->orderByDesc('vote_count')
                    ->orderBy('id')
                    ->first();

                $last = null;
                $names = [];
                foreach ($ids as $id) {
                    $candidate = Candidate::query()
                        ->where('id', $id)
                        ->where('is_active', true)
                        ->lockForUpdate()
                        ->first();

                    if (!$candidate) {
                        abort(404, 'Candidate not found.');
                    }

                    Vote::query()->create([
                        'candidate_id' => $candidate->id,
                        'student_email' => $session->student_email,
                        'ip_address' => $request->ip(),
                        'voted_at' => now(),
                        'teacher_id' => $session->teacher_id,
                    ]);

                    $candidate->increment('vote_count');
                    $candidate->refresh();
                    $last = $candidate;
                    $names[] = $candidate->name;
                }

                $newLeader = Candidate::query()
                    ->orderByDesc('vote_count')
                    ->orderBy('id')
                    ->first();

                $leadChanged = $previousLeader
                    && $newLeader
                    && (int) $previousLeader->id !== (int) $newLeader->id;

                $event = VoteEvent::query()->create([
                    'candidate_id' => $last->id,
                    'new_count' => $last->vote_count,
                    'lead_changed' => $leadChanged,
                    'leader_id' => $newLeader?->id,
                ]);

                $session->markVoted();

                return [
                    'candidate' => $last,
                    'names' => $names,
                    'lead_changed' => $leadChanged,
                    'leader_id' => $newLeader?->id,
                    'event_id' => $event->id,
                ];
            });
        } catch (QueryException $e) {
            if (str_contains(strtolower($e->getMessage()), 'unique')) {
                return response()->json([
                    'message' => 'This student has already voted.',
                ], 409);
            }

            throw $e;
        }

        return response()->json([
            'message' => 'Vote cast successfully.',
            'candidate_id' => $result['candidate']->id,
            'candidate_name' => implode(', ', $result['names']),
            'new_count' => $result['candidate']->vote_count,
            'lead_changed' => $result['lead_changed'],
            'leader_id' => $result['leader_id'],
        ]);
    }

    public function ballot(): JsonResponse
    {
        $candidates = Candidate::query()
            ->where('is_active', true)
            ->orderBy('position')
            ->orderBy('name')
            ->get()
            ->map(fn (Candidate $candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'position' => $candidate->position,
                'photo_url' => $candidate->photoUrl(),
                'color_tag' => $candidate->color_tag,
                'vote_count' => $candidate->vote_count,
                'has_photo' => filled($candidate->photo_path),
            ]);

        return response()->json([
            'ok' => true,
            'election_title' => Setting::electionTitle(),
            'candidates' => $candidates,
        ]);
    }

    private function activeSession(?string $token): ?VotingSession
    {
        if (!$token) {
            return null;
        }

        $session = VotingSession::query()->where('token', $token)->first();

        if (!$session || !$session->isActive()) {
            return null;
        }

        return $session;
    }
}
