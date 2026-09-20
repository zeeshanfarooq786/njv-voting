<?php

namespace App\Http\Controllers;

use App\Models\Candidate;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vote;
use App\Models\VoteEvent;
use App\Support\Election;
use App\Support\StudentEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function results(): JsonResponse
    {
        $candidates = Candidate::query()
            ->orderByDesc('vote_count')
            ->orderBy('name')
            ->get()
            ->map(fn (Candidate $candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'position' => $candidate->position,
                'grade' => $candidate->grade,
                'photo_url' => $candidate->photoUrl(),
                'vote_count' => $candidate->vote_count,
                'color_tag' => $candidate->color_tag,
                'is_active' => $candidate->is_active,
                'has_photo' => filled($candidate->photo_path),
            ]);

        $totalVotes = (int) Vote::query()->count();
        $eligible = Setting::eligibleStudents();
        $leader = $candidates->first();

        return response()->json([
            'election_title' => Setting::electionTitle(),
            'voting_open' => Setting::votingOpen(),
            'winners_declared' => Setting::winnersDeclared(),
            'eligible_students' => $eligible,
            'total_votes' => $totalVotes,
            'turnout_percent' => $eligible > 0 ? round(($totalVotes / $eligible) * 100, 1) : 0,
            'leader_id' => $leader && $leader['vote_count'] > 0 ? $leader['id'] : null,
            'candidates' => $candidates,
        ]);
    }

    public function votes(): JsonResponse
    {
        $votes = Vote::query()
            ->with(['candidate:id,name,position', 'teacher:id,name'])
            ->orderByDesc('voted_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Vote $vote) => [
                'id' => $vote->id,
                'student_email' => $vote->student_email,
                'candidate_name' => $vote->candidate?->name,
                'position' => $vote->candidate?->position,
                'teacher_name' => $vote->teacher?->name,
                'voted_at' => optional($vote->voted_at)->toIso8601String(),
            ]);

        return response()->json(['votes' => $votes]);
    }

    public function events(Request $request): JsonResponse
    {
        $afterId = (int) $request->query('after_id', 0);

        $events = VoteEvent::query()
            ->with(['candidate:id,name', 'leader:id,name'])
            ->where('id', '>', $afterId)
            ->orderBy('id')
            ->limit(50)
            ->get()
            ->map(fn (VoteEvent $event) => [
                'id' => $event->id,
                'candidate_id' => $event->candidate_id,
                'candidate_name' => $event->candidate?->name,
                'new_count' => $event->new_count,
                'lead_changed' => $event->lead_changed,
                'leader_id' => $event->leader_id,
                'leader_name' => $event->leader?->name,
                'created_at' => $event->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'events' => $events,
        ]);
    }

    public function storeCandidate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'position' => ['required', 'string', Rule::in(Election::POSTS)],
            'grade' => ['nullable', 'string', Rule::in(Election::GRADES)],
            'color_tag' => ['nullable', 'string', 'max:20', 'regex:/^#[0-9a-fA-F]{3,8}$/'],
            'photo' => ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048'],
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $this->storePublicPhoto($request->file('photo'));
        }

        if (Election::isClassRep($data['position']) && empty($data['grade'])) {
            throw ValidationException::withMessages([
                'grade' => 'Choose the candidate grade for class representatives.',
            ]);
        }

        $candidate = Candidate::query()->create([
            'name' => $data['name'],
            'position' => $data['position'],
            'grade' => Election::isClassRep($data['position']) ? ($data['grade'] ?? null) : null,
            'color_tag' => $data['color_tag'] ?? $this->nextColor(),
            'photo_path' => $photoPath,
            'vote_count' => 0,
            'is_active' => true,
        ]);

        return response()->json([
            'candidate' => $this->serialize($candidate),
        ], 201);
    }

    public function updateCandidate(Request $request, Candidate $candidate): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'position' => ['sometimes', 'required', 'string', Rule::in(Election::POSTS)],
            'grade' => ['nullable', 'string', Rule::in(Election::GRADES)],
            'color_tag' => ['nullable', 'string', 'max:20', 'regex:/^#[0-9a-fA-F]{3,8}$/'],
            'is_active' => ['sometimes', 'boolean'],
            'photo' => ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048'],
        ]);

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $this->storePublicPhoto($request->file('photo'));
        }

        unset($data['photo']);
        $candidate->update($data);

        return response()->json([
            'candidate' => $this->serialize($candidate->fresh()),
        ]);
    }

    public function destroyCandidate(Candidate $candidate): JsonResponse
    {
        if ($candidate->photo_path) {
            Storage::disk('public')->delete($candidate->photo_path);
        }

        $candidate->delete();

        return response()->json(['message' => 'Candidate removed.']);
    }

    public function toggleVoting(Request $request): JsonResponse
    {
        $data = $request->validate([
            'open' => ['required', 'boolean'],
        ]);

        Setting::setValue('voting_open', $data['open']);
        if ($data['open']) {
            Setting::setValue('winners_declared', false);
        }

        return response()->json([
            'voting_open' => Setting::votingOpen(),
            'winners_declared' => Setting::winnersDeclared(),
        ]);
    }

    public function declareWinners(): JsonResponse
    {
        Setting::setValue('voting_open', false);
        Setting::setValue('winners_declared', true);

        return response()->json([
            'voting_open' => false,
            'winners_declared' => true,
        ]);
    }

    public function settings(): JsonResponse
    {
        return response()->json([
            'election_title' => Setting::electionTitle(),
            'eligible_students' => Setting::eligibleStudents(),
            'total_eligible_students' => Setting::eligibleStudents(),
            'voting_open' => Setting::votingOpen(),
            'winners_declared' => Setting::winnersDeclared(),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'election_title' => ['sometimes', 'string', 'max:200'],
            'eligible_students' => ['sometimes', 'integer', 'min:0'],
            'total_eligible_students' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (array_key_exists('election_title', $data)) {
            Setting::setValue('election_title', $data['election_title']);
        }

        $eligible = $data['eligible_students'] ?? $data['total_eligible_students'] ?? null;
        if ($eligible !== null) {
            Setting::setValue('eligible_students', $eligible);
        }

        return response()->json([
            'election_title' => Setting::electionTitle(),
            'eligible_students' => Setting::eligibleStudents(),
            'total_eligible_students' => Setting::eligibleStudents(),
            'voting_open' => Setting::votingOpen(),
            'winners_declared' => Setting::winnersDeclared(),
        ]);
    }

    public function teachers(): JsonResponse
    {
        $teachers = User::query()
            ->where('role', 'teacher')
            ->withCount('votes')
            ->orderBy('name')
            ->get()
            ->map(fn (User $teacher) => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'created_at' => optional($teacher->created_at)->toIso8601String(),
                'votes_count' => $teacher->votes_count,
                // Deleting a teacher cascades to their votes, so the UI hides
                // the option when doing so would erase recorded results.
                'can_delete' => $teacher->votes_count === 0,
            ]);

        return response()->json(['teachers' => $teachers]);
    }

    public function storeTeacher(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:191', $this->schoolEmailRule(), 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ]);

        $teacher = User::query()->create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role' => 'teacher',
        ]);

        return response()->json([
            'teacher' => $teacher->only(['id', 'name', 'email']),
        ], 201);
    }

    public function updateTeacher(Request $request, User $user): JsonResponse
    {
        $this->assertTeacher($user);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => [
                'sometimes', 'required', 'email', 'max:191',
                $this->schoolEmailRule(),
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        if (isset($data['email'])) {
            $data['email'] = strtolower($data['email']);
        }

        $user->update($data);

        return response()->json([
            'teacher' => $user->only(['id', 'name', 'email']),
        ]);
    }

    public function updateTeacherPassword(Request $request, User $user): JsonResponse
    {
        $this->assertTeacher($user);

        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed'],
        ]);

        $user->update(['password' => $data['password']]);

        // Force the staff member to sign in again with the new password.
        $user->tokens()->delete();

        return response()->json(['ok' => true]);
    }

    public function destroyTeacher(Request $request, User $user): JsonResponse
    {
        $this->assertTeacher($user);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        $votes = $user->votes()->count();

        if ($votes > 0) {
            return response()->json([
                'message' => "This account is recorded on {$votes} vote(s). Deleting it would erase them from the results, so it has been blocked.",
            ], 409);
        }

        $user->votingSessions()->delete();
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Staff and students share the school domain, so both go through the same
     * check to keep one source of truth for the allowed email domain.
     */
    private function schoolEmailRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if (!StudentEmail::isValid((string) $value)) {
                $fail('The email must be a valid @'.StudentEmail::domain().' address.');
            }
        };
    }

    private function assertTeacher(User $user): void
    {
        abort_unless($user->isTeacher(), 404);
    }

    /**
     * Accepts only genuine raster images, strips metadata/payloads by
     * re-encoding, and always stores with a generated name and safe extension.
     */
    private function storePublicPhoto($file): string
    {
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        $type = $file->getMimeType();
        if (!isset($allowed[$type])) {
            throw ValidationException::withMessages([
                'photo' => 'Only JPG, PNG or WEBP images are allowed.',
            ]);
        }

        if ($file->getSize() > 2 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'photo' => 'Image must be 2MB or smaller.',
            ]);
        }

        $info = @getimagesize($file->getRealPath());
        if ($info === false || (int) $info[0] < 1 || (int) $info[1] < 1) {
            throw ValidationException::withMessages([
                'photo' => 'This file is not a valid image.',
            ]);
        }

        if ($info[0] > 6000 || $info[1] > 6000) {
            throw ValidationException::withMessages([
                'photo' => 'Image dimensions are too large.',
            ]);
        }

        $image = match ($type) {
            'image/jpeg' => @imagecreatefromjpeg($file->getRealPath()),
            'image/png' => @imagecreatefrompng($file->getRealPath()),
            'image/webp' => @imagecreatefromwebp($file->getRealPath()),
            default => false,
        };

        if ($image === false) {
            throw ValidationException::withMessages([
                'photo' => 'This image could not be processed.',
            ]);
        }

        imagealphablending($image, true);
        imagesavealpha($image, false);

        $max = 800;
        $width = imagesx($image);
        $height = imagesy($image);
        if ($width > $max || $height > $max) {
            $scale = $max / max($width, $height);
            $nw = max(1, (int) round($width * $scale));
            $nh = max(1, (int) round($height * $scale));
            $resized = imagecreatetruecolor($nw, $nh);
            $fill = imagecolorallocate($resized, 10, 59, 101);
            imagefilledrectangle($resized, 0, 0, $nw, $nh, $fill);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $nw, $nh, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }

        $dir = public_path('uploads/candidates');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $name = bin2hex(random_bytes(16)).'.jpg';
        $target = $dir.DIRECTORY_SEPARATOR.$name;
        $saved = imagejpeg($image, $target, 80);

        imagedestroy($image);

        if (!$saved) {
            throw ValidationException::withMessages([
                'photo' => 'The image could not be saved.',
            ]);
        }

        @chmod($target, 0644);

        return 'uploads/candidates/'.$name;
    }

    private function serialize(Candidate $candidate): array
    {
        return [
            'id' => $candidate->id,
            'name' => $candidate->name,
            'position' => $candidate->position,
            'grade' => $candidate->grade,
            'photo_url' => $candidate->photoUrl(),
            'vote_count' => $candidate->vote_count,
            'color_tag' => $candidate->color_tag,
            'is_active' => $candidate->is_active,
            'has_photo' => filled($candidate->photo_path),
        ];
    }

    private function nextColor(): string
    {
        $palette = ['#0d7a3e', '#1d4ed8', '#b45309', '#7c3aed', '#be123c', '#0f766e', '#c2410c', '#4338ca'];
        $index = Candidate::query()->count() % count($palette);

        return $palette[$index];
    }
}
