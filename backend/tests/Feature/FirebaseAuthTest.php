<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\FirebaseAuthService;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FirebaseAuthTest extends TestCase
{
    use RefreshDatabase;

    protected string $kid = 'test-firebase-kid-1';

    protected string $projectId = 'ordarat-qena';

    protected const TEST_PRIVATE_KEY = <<<'KEY'
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCfFLeX9HGebFVx
du97RaqHVPiDfPKDmf1oOIAZ9B18ylNjBQ/hNwZNUv1GmhKbAwxrPFmxbyXQCUu9
cubh8kZC6EicbYHZwcLrdBk/C0Lpl8tLiv4n97keWSU5UR9ccvFUV7K/Q9kQoZ/1
rWYerQmKQe7b7iTNUhrIqPgJGZgRDoIRNDW91Lv7EmAQV2pIx0A/o/sEtldySeF1
AQo6jPKO0G+jPKZtuSHRHeYM4c+4a/9+z4FL+iyJPzwTBlJFZWCJk+i8Jp8Od2ls
6AFKlG1qyqd4Vyjz5NMWJSbKXnv/nsZEY+keJS1LnBHyzzbBK1k78kjvC7dTcvvM
Zw7iGgMFAgMBAAECggEAIxnCosQ8d6zGs5j/IW+PP3ontXeR2SjWqbLhzRg4k2rf
OFeLF/H4sYIQwY3IciybhmPUFJsGOF98t0oNmKhJCYVQVDezcZVXyXUeBvOYqYsl
P79k8fOuhHw+AuYb6d2w0x/goGQ7lnhbH63JfRZIJxoCNsPWmfk2ULU7uWJM0+JK
/pPMSsKqBjnxUD5Vuo/0B9TMrPhsQdOmO63/MLWxEiaKM4Msnia3BnDNXjW1Scil
zMMTQdObHacjqFhXDA7/HOPnHWpl1sVTwUp79sxUONya0Z15ii3kkumiH5CdNxf6
Gwh7epz24/eOzei1bTLzXzafjRI1S/b95Dj3cF3wZwKBgQDSLd+TnUTTdVXj9T7s
HBKi2kbWUneiTpNb34aXJJcwRuTBCPktPQgEsIwPjtwhftS5fayRxhAmo5Nc1UeO
qKlRYfxM9Rd1CWSZrR2BBsb6vCWzFpFsTQc9GXYT4bK/4Pppo+ducAxHf+63v84V
CDngXYz8Jh17g/EXSvvsIfXFNwKBgQDBwwsT98Y3n4WYPfpDymd4erVS5/2gN/DV
85XkYkXIO2lFx6O7u0Smmae2u28WLfF2QbP2J56SearScSEbwBrwAe2O9GW89H3G
ZlKZqgsXQit6w7hZtG10+UEt67YsxYdQ3OE85wF+YeZ3sZVfwbwzjFTpJ9M4eG2Z
I2zAtAaXowKBgBBQbT1JBNGhFvSl0aeEGlI3vS3fotefX8LO2+SZe37M0e7F4omH
Zjru9UAz55RWAu8O+TkrdY96PPMEvxQstU/S2kGi+JomC3/+Nv8P5pwJxKddBhaw
9/HfKxIp/7TzIpzWkx04Z0uZe48ZvUZWqB9pQ4tC7iDrQeh78ogGrswLAoGARGGq
UjS6nrzMsCsHXM9c7vcXcRfwuY+kjk12E/Dewci94WOQlFuF4eoOd330uXYjZmHP
ukrHOth3gedtENceap+zkCUOlr4OeWt5MUQCwAWZRK04LWhwzLx+1U7/rxNTKyWY
1B6Ot2SjqpBgsDe2TNb0zIhCkgZmX4pSAjxGq1MCgYAlujqoPvJUvEEkmKngOzGK
lDrJzEC9CaLKdoLFJzHm8ynsXMcFzv+kIGgXwAmiDBG+WOpssn0V7t/8ln7BEveY
SOJIVhbs0In3Lv9elTF6M/DPyXtf34g4mVm+aKK/RQ+JBQYTQI9VTmkQUdBpxK+V
3qEbzBmCnRMCPbb98+F3cQ==
-----END PRIVATE KEY-----
KEY;

    protected const TEST_PUBLIC_KEY = <<<'KEY'
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnxS3l/RxnmxVcXbve0Wq
h1T4g3zyg5n9aDiAGfQdfMpTYwUP4TcGTVL9RpoSmwMMazxZsW8l0AlLvXLm4fJG
QuhInG2B2cHC63QZPwtC6ZfLS4r+J/e5HlklOVEfXHLxVFeyv0PZEKGf9a1mHq0J
ikHu2+4kzVIayKj4CRmYEQ6CETQ1vdS7+xJgEFdqSMdAP6P7BLZXcknhdQEKOozy
jtBvozymbbkh0R3mDOHPuGv/fs+BS/osiT88EwZSRWVgiZPovCafDndpbOgBSpRt
asqneFco8+TTFiUmyl57/57GRGPpHiUtS5wR8s82wStZO/JI7wu3U3L7zGcO4hoD
BQIDAQAB
-----END PUBLIC KEY-----
KEY;

    protected const FOREIGN_PRIVATE_KEY = <<<'KEY'
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDmWtH23rFCU9Y8
i0jbpS2wHl8pzz/Qu5HBN/cqknRnkIjT4DPRB9eOyrU7Lz6eYLXuL7eewBdFqQLf
vrqbs7kDUPUWermxxq6G9QK6bX3uwwtOy7Hireij6V42rkPT6mkBpUHwdbCKt6aH
hBxqX3qRrJM05YOi2t4Um7uo8GV15BvsgIC+yfCZoJblSxFcKyCXRsgNpsGkndQ1
VnbgAfkm+1LRJemaYVwe4kJRX8ltQ2Bk1E4iRGVQvBenrwgcqp63wzfWTb/80TvU
fgF4AMcf6nfvFlChREG66ws6bgvXPBVzPvpa8x1LV0NJdgS4CtAHOVI26ejiOgDv
fqhXuHXFAgMBAAECggEAJMkunAuih4rPXNJKY4cchXJINKtLz9fQViiLkFEchThj
3WABrlkf/4XYDLhF+fFMRFn66v9WiBGOK7Bv6PL5sfGg/gLBukXV86fXVHGtSW58
1Qu6383xZ5GaMcXA/6vAsppTLiUBORnMXnpGtmcCchZ62JjpXV2x1t0qyfb/4OQr
xi3YcyNwDphjxDfCrQv0l2bPp6xZaMBe8UjYvQapCrAgvZd9lUCD4/iDJftmbuWS
cMZehmIQmMmA7PO3DLqibepitAVlB1Y9SjBIZedZIt4TiM9mCBtSqdg+BdRbkooU
R5xuBWNKt/KMQLKJWzdu1Zk6P1EAnW8N+rVj+EQ9AQKBgQD6/I9JzEvq0HhZinJy
mQFKqfIbqU4wMH+uEhtVYGUMw+NmGu9LquJVQXDMGGnwh7vtMI4OFZQqycYdzYwA
9CEKxPAciqOOl0wZCR7aoXW0MxEC+9OPF+knwUUW8VtiA7o54hb+7M+cuiFU8uBa
y59JqdN3NNF14Sg5IctN0mp+xQKBgQDq9MIRzEG7/KX6NR71qfKCGPV4h4t8wE/v
HyICVR78UJKRAlqebljiBwjzS+j9NRmKJvEdBY/fqL6qQHcDjUAAk9RrIbATFYPA
M3f9TiZ3RraHgBhZ3y4QCK6DO3USQ4vEyhbsdWboRNAxos2nMKC5yWJpCdTK4YXv
Ny9C4CWLAQKBgCVjqGjjAVA6vCMCp+gAeRvJU2Lhht9Q6kRhOCcw0/zh1adpTcqk
61CuDgKphGarochE2nSorEjvhA7+huPBeoajLe3ijVj5mwGDxU/mi6VLkjYyk6KW
ekpM1WEElYt1aLGkx640Uv1TERIZmGiOOu17WiBBAw8feqGAMkwmk2zNAoGAUAiX
ouBk89gX4ab+qMf/J3nBBBGH3jLUB6wfNZQxPdlkU6jtnVIRTM0Aq3+MGdRgosKp
Fy2x2InuiKf04mzXBFtW3DdZdua5PltJ4CsixzZ7LqTfpp1zX1rVtzYlptcDYUFF
lb5YE359PKssSmsyFJcYwpbquUEhEl9F5g3cPAECgYBPwqMGHPLd9KapXkzIq7kd
QOF8qIIySXh8rztVbtt7xdzL4oNc4Fu8TJ9zKDbAqWfjgYpbuKH1Ve8eLZ80p1Qd
O16JTv4/llxhtM9D7J3k9JCoLY5cKZ0PQ0BGqQnl3QhXaUS8e+QZrw41eNGIELqi
GC/DgVSPZ7jXAH90nQx+VA==
-----END PRIVATE KEY-----
KEY;

    protected function setUp(): void
    {
        parent::setUp();

        $service = new FirebaseAuthService;
        $this->projectId = $service->getProjectId();
        $service->setMockPublicKeys([
            $this->kid => self::TEST_PUBLIC_KEY,
        ]);
        $this->app->instance(FirebaseAuthService::class, $service);
    }

    protected function generateTestToken(array $overrides = [], ?string $signingKey = null): string
    {
        $payload = array_merge([
            'iss' => 'https://securetoken.google.com/'.$this->projectId,
            'aud' => $this->projectId,
            'sub' => 'firebase_uid_test_123',
            'email' => 'customer_qena@example.com',
            'email_verified' => true,
            'name' => 'أحمد قناوي',
            'iat' => time() - 10,
            'exp' => time() + 3600,
            'firebase' => [
                'sign_in_provider' => 'google.com',
            ],
        ], $overrides);

        return JWT::encode($payload, $signingKey ?: self::TEST_PRIVATE_KEY, 'RS256', $this->kid);
    }

    public function test_valid_firebase_token_authenticates_customer(): void
    {
        $token = $this->generateTestToken();

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'أحمد قناوي')
            ->assertJsonPath('data.role', 'customer');

        $this->assertDatabaseHas('users', [
            'firebase_uid' => 'firebase_uid_test_123',
            'role' => 'customer',
            'status' => 'active',
        ]);
    }

    public function test_expired_firebase_token_is_rejected(): void
    {
        $token = $this->generateTestToken([
            'exp' => time() - 100,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_TOKEN');
    }

    public function test_token_from_another_firebase_project_is_rejected(): void
    {
        $token = $this->generateTestToken([
            'aud' => 'other-unauthorized-project',
            'iss' => 'https://securetoken.google.com/other-unauthorized-project',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_TOKEN');
    }

    public function test_tampered_signature_token_is_rejected(): void
    {
        $token = $this->generateTestToken([], self::FOREIGN_PRIVATE_KEY);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_TOKEN');
    }

    public function test_missing_token_returns_unauthenticated(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_suspended_account_is_rejected_even_with_valid_token(): void
    {
        $token = $this->generateTestToken(['sub' => 'suspended_user_uid']);
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/auth/me')->assertStatus(200);

        User::where('firebase_uid', 'suspended_user_uid')->update(['status' => 'suspended']);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/auth/me');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ACCOUNT_SUSPENDED',
                    'message' => 'حسابك متوقف. اتواصل معنا',
                ],
            ]);
    }

    public function test_browser_cannot_spoof_or_override_role(): void
    {
        $token = $this->generateTestToken(['role' => 'admin']);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.role', 'customer');

        $user = User::where('firebase_uid', 'firebase_uid_test_123')->first();
        $this->assertEquals('customer', $user->role);
    }

    public function test_egyptian_phone_validation(): void
    {
        $token = $this->generateTestToken();

        $badResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/profile', [
                'name' => 'أحمد قناوي',
                'phone' => '0212345678',
            ]);
        $badResponse->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $goodResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/profile', [
                'name' => 'أحمد قناوي',
                'phone' => '01012345678',
            ]);
        $goodResponse->assertStatus(200)
            ->assertJsonPath('data.phone', '01012345678');
    }

    public function test_verified_google_email_links_existing_account(): void
    {
        $existing = User::factory()->create([
            'email' => 'manager@ordarat.test',
            'firebase_uid' => null,
            'role' => 'branch_manager',
            'status' => 'active',
        ]);

        $token = $this->generateTestToken([
            'sub' => 'firebase_uid_manager_link',
            'email' => 'manager@ordarat.test',
            'email_verified' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $existing->id)
            ->assertJsonPath('data.role', 'branch_manager');

        $this->assertSame('firebase_uid_manager_link', $existing->fresh()->firebase_uid);
    }

    public function test_unverified_google_email_cannot_link_existing_account(): void
    {
        User::factory()->create([
            'email' => 'victim@ordarat.test',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $token = $this->generateTestToken([
            'sub' => 'firebase_uid_attacker',
            'email' => 'victim@ordarat.test',
            'email_verified' => false,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        // Refused: the email must be verified before it can touch any account
        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'EMAIL_NOT_VERIFIED');
    }

    public function test_admin_emails_env_bootstraps_admin_role_with_verified_email(): void
    {
        config()->set('ordarat.admin_emails', ['boss@ordarat.test']);

        $token = $this->generateTestToken([
            'sub' => 'firebase_uid_new_admin',
            'email' => 'boss@ordarat.test',
            'email_verified' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.role', 'admin');
    }

    public function test_admin_emails_env_ignored_when_email_unverified(): void
    {
        config()->set('ordarat.admin_emails', ['boss@ordarat.test']);

        $token = $this->generateTestToken([
            'sub' => 'firebase_uid_fake_admin',
            'email' => 'boss@ordarat.test',
            'email_verified' => false,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        // Rejected as unverified
        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'EMAIL_NOT_VERIFIED');
    }

    public function test_frontend_supplied_role_is_never_accepted(): void
    {
        $token = $this->generateTestToken([
            'sub' => 'firebase_uid_role_spoof',
            'email' => 'spoof@ordarat.test',
            'email_verified' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/profile', [
                'name' => 'محاول صلاحية',
                'phone' => '01012345678',
                'role' => 'admin',
            ]);

        $response->assertStatus(200);
        $this->assertSame('customer', User::where('firebase_uid', 'firebase_uid_role_spoof')->first()->role);
    }

    public function test_unsupported_provider_token_is_rejected(): void
    {
        $token = $this->generateTestToken([
            'firebase' => [
                'sign_in_provider' => 'anonymous',
            ],
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_TOKEN');
    }

    public function test_token_with_future_iat_is_rejected(): void
    {
        $token = $this->generateTestToken([
            'iat' => time() + 600, // 10 minutes in the future
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_TOKEN');
    }

    public function test_app_session_creation_and_logout_invalidation(): void
    {
        $firebaseToken = $this->generateTestToken([
            'sub' => 'session_test_uid',
            'email' => 'session@ordarat.test',
        ]);

        // 1. Exchange Firebase Token for App Session Token
        $loginRes = $this->postJson('/api/auth/session', [
            'firebase_token' => $firebaseToken,
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['token', 'data' => ['id', 'name', 'role']]);

        $appToken = $loginRes->json('token');
        $this->assertStringStartsWith('ordarat_sess_', $appToken);

        // 2. Call API with the App Session Token
        $meRes = $this->withHeader('Authorization', 'Bearer '.$appToken)
            ->getJson('/api/auth/me');
        $meRes->assertStatus(200)
            ->assertJsonPath('data.email', 'session@ordarat.test');

        // 3. Logout and invalidate session
        $logoutRes = $this->withHeader('Authorization', 'Bearer '.$appToken)
            ->postJson('/api/auth/logout');
        $logoutRes->assertStatus(200)
            ->assertJsonPath('success', true);

        // 4. Calling API with invalidated token must be rejected with 401
        $rejectedRes = $this->withHeader('Authorization', 'Bearer '.$appToken)
            ->getJson('/api/auth/me');
        $rejectedRes->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_same_firebase_uid_returns_same_account_without_duplication(): void
    {
        $token1 = $this->generateTestToken([
            'sub' => 'persistent_uid_999',
            'email' => 'persistent@ordarat.test',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token1)->getJson('/api/auth/me')->assertStatus(200);
        $countAfterFirst = User::where('firebase_uid', 'persistent_uid_999')->count();
        $this->assertSame(1, $countAfterFirst);

        // Second login with same UID
        $token2 = $this->generateTestToken([
            'sub' => 'persistent_uid_999',
            'email' => 'persistent@ordarat.test',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token2)->getJson('/api/auth/me')->assertStatus(200);
        $countAfterSecond = User::where('firebase_uid', 'persistent_uid_999')->count();
        $this->assertSame(1, $countAfterSecond);
    }

    public function test_non_admin_cannot_access_analytics_endpoint(): void
    {
        $customerToken = $this->generateTestToken([
            'sub' => 'customer_for_analytics_check',
            'email' => 'cust@ordarat.test',
        ]);

        // Customer attempts to access admin analytics
        $response = $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/admin/analytics');

        $response->assertStatus(403);
    }
}
