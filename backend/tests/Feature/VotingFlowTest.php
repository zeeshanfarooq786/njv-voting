<?php

namespace Tests\Feature;

use App\Models\Candidate;
use App\Models\Setting;
use App\Models\User;
use App\Support\StudentEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VotingFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $teacher;
    private Candidate $candidate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create([
            'email' => StudentEmail::address('admin'),
        ]);

        $this->teacher = User::factory()->teacher()->create([
            'email' => StudentEmail::address('teacher'),
        ]);

        $this->candidate = Candidate::query()->create([
            'name' => 'Ahmed Farooq',
            'position' => 'Head Boy',
            'color_tag' => '#0d7a3e',
            'vote_count' => 0,
            'is_active' => true,
        ]);

        Setting::setValue('voting_open', true);
        Setting::setValue('election_title', 'NJV Test Election');
        Setting::setValue('eligible_students', 100);
    }

    public function test_teacher_can_login_and_start_session(): void
    {
        $login = $this->postJson('/api/teacher/login', [
            'email' => StudentEmail::address('teacher'),
            'password' => 'password',
        ]);

        $login->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'role']]);

        $token = $login->json('token');
        $student = StudentEmail::address('ahmed.001');

        $start = $this->withToken($token)->postJson('/api/session/start', [
            'student_email' => $student,
        ]);

        $start->assertCreated()->assertJsonStructure(['session_token', 'student_email']);
        $this->assertDatabaseHas('voting_sessions', [
            'student_email' => $student,
            'status' => 'active',
        ]);
    }

    public function test_invalid_email_domain_is_rejected(): void
    {
        $token = $this->teacherToken();

        $this->withToken($token)->postJson('/api/session/start', [
            'student_email' => 'student@gmail.com',
        ])->assertStatus(422);
    }

    public function test_student_can_vote_once(): void
    {
        $teacherToken = $this->teacherToken();
        $student = StudentEmail::address('ahmed.001');
        $sessionToken = $this->openVotingSession($teacherToken, $student);

        $vote = $this->postJson('/api/vote', [
            'session_token' => $sessionToken,
            'candidate_id' => $this->candidate->id,
        ]);

        $vote->assertOk()->assertJson(['message' => 'Vote cast successfully.']);

        $this->assertDatabaseHas('votes', [
            'student_email' => $student,
            'candidate_id' => $this->candidate->id,
        ]);

        $this->assertSame(1, $this->candidate->fresh()->vote_count);

        $this->postJson('/api/vote', [
            'session_token' => $sessionToken,
            'candidate_id' => $this->candidate->id,
        ])->assertStatus(403);
    }

    public function test_duplicate_email_cannot_start_second_session_after_vote(): void
    {
        $teacherToken = $this->teacherToken();
        $student = StudentEmail::address('ahmed.001');
        $sessionToken = $this->openVotingSession($teacherToken, $student);

        $this->postJson('/api/vote', [
            'session_token' => $sessionToken,
            'candidate_id' => $this->candidate->id,
        ])->assertOk();

        $this->withToken($teacherToken)->postJson('/api/session/start', [
            'student_email' => $student,
        ])->assertStatus(409);
    }

    public function test_admin_can_view_results_and_toggle_voting(): void
    {
        $login = $this->postJson('/api/admin/login', [
            'email' => StudentEmail::address('admin'),
            'password' => 'password',
        ]);

        $login->assertOk();
        $token = $login->json('token');

        $this->withToken($token)->getJson('/api/admin/results')
            ->assertOk()
            ->assertJsonPath('voting_open', true);

        $this->withToken($token)->postJson('/api/admin/voting/toggle', [
            'open' => false,
        ])->assertOk()->assertJson(['voting_open' => false]);

        $teacherToken = $this->teacherToken();
        $this->withToken($teacherToken)->postJson('/api/session/start', [
            'student_email' => StudentEmail::address('ahmed.001'),
        ])->assertStatus(403);
    }

    public function test_candidates_require_active_session(): void
    {
        $this->getJson('/api/candidates')->assertStatus(403);

        $teacherToken = $this->teacherToken();
        $student = StudentEmail::address('ahmed.001');
        $sessionToken = $this->openVotingSession($teacherToken, $student);

        $this->getJson('/api/candidates?session_token='.$sessionToken)
            ->assertOk()
            ->assertJsonPath('student_email', $student);
    }

    public function test_teacher_cannot_access_admin_routes(): void
    {
        $token = $this->teacherToken();

        $this->withToken($token)->getJson('/api/admin/results')->assertStatus(403);
    }

    private function teacherToken(): string
    {
        return $this->postJson('/api/teacher/login', [
            'email' => StudentEmail::address('teacher'),
            'password' => 'password',
        ])->json('token');
    }

    private function openVotingSession(string $teacherToken, string $email): string
    {
        $response = $this->withToken($teacherToken)->postJson('/api/session/start', [
            'student_email' => $email,
        ]);

        $token = $response->json('session_token');
        $this->assertIsString($token);

        return $token;
    }
}
