<?php

namespace Tests\Feature;

use App\Models\MerchantApplication;
use App\Models\Store;
use App\Models\User;
use App\Services\FirebaseAuthService;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailPasswordAndLogoTest extends TestCase
{
    use RefreshDatabase;

    private string $kid = 'kid-pw-1';

    protected function setUp(): void
    {
        parent::setUp();
        [$private, $public] = $this->keyPair();
        $this->privateKey = $private;
        $service = new FirebaseAuthService;
        $service->setMockPublicKeys([$this->kid => $public]);
        $this->app->instance(FirebaseAuthService::class, $service);
        $this->projectId = $service->getProjectId();
    }

    private string $privateKey;

    private string $projectId;

    private function keyPair(): array
    {
        $res = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($res, $private);

        return [$private, openssl_pkey_get_details($res)['key']];
    }

    private function token(array $over = []): string
    {
        $payload = array_merge([
            'iss' => 'https://securetoken.google.com/'.$this->projectId,
            'aud' => $this->projectId,
            'sub' => 'pw-uid-1',
            'email' => 'Buyer@Example.com',
            'email_verified' => true,
            'name' => 'مشتري جديد',
            'iat' => time() - 10,
            'exp' => time() + 3600,
            'firebase' => ['sign_in_provider' => 'password'],
        ], $over);

        return JWT::encode($payload, $this->privateKey, 'RS256', $this->kid);
    }

    private function me(string $token)
    {
        return $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/auth/me');
    }

    public function test_verified_email_password_user_becomes_a_customer_with_incomplete_profile(): void
    {
        $this->me($this->token())
            ->assertStatus(200)
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.profile_complete', false)
            ->assertJsonPath('data.onboarding_state', 'new')
            ->assertJsonPath('data.email', 'buyer@example.com');
    }

    public function test_password_user_with_unverified_email_gets_no_account(): void
    {
        $this->me($this->token(['email_verified' => false]))
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'EMAIL_NOT_VERIFIED');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_session_exchange_accepts_password_provider_and_reports_unverified(): void
    {
        $this->postJson('/api/auth/session', ['firebase_token' => $this->token()])
            ->assertStatus(200)
            ->assertJsonPath('data.role', 'customer');

        $this->postJson('/api/auth/session', ['firebase_token' => $this->token(['sub' => 'x', 'email' => 'x@example.com', 'email_verified' => false])])
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'EMAIL_NOT_VERIFIED');
    }

    public function test_same_email_with_a_different_identity_is_refused_not_merged(): void
    {
        $this->me($this->token())->assertStatus(200);

        // A Google identity arrives later with the same verified email but another uid.
        $this->me($this->token(['sub' => 'google-uid-9', 'firebase' => ['sign_in_provider' => 'google.com']]))
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'ACCOUNT_LINK_REQUIRED');

        $this->assertDatabaseCount('users', 1);
        $this->assertSame('pw-uid-1', User::first()->firebase_uid);
    }

    public function test_password_account_never_becomes_admin_without_listed_verified_email(): void
    {
        config()->set('ordarat.admin_emails', ['boss@example.com']);

        $this->me($this->token(['email' => 'someone@example.com']))->assertJsonPath('data.role', 'customer');
        $this->me($this->token(['sub' => 'boss-uid', 'email' => 'boss@example.com']))->assertJsonPath('data.role', 'admin');
    }

    private function applicationPayload(array $over = []): array
    {
        return array_merge([
            'business_name' => 'مطعم الوردة',
            'type' => 'restaurant',
            'phone' => '01012345678',
            'address' => 'وسط البلد قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'has_branches' => false,
            'area_name' => 'وسط البلد',
            'logo' => self::logoDataUrl(),
            'opens_at' => '09:00',
            'closes_at' => '23:00',
        ], $over);
    }

    private function applicant(): User
    {
        return User::factory()->create(['role' => 'customer', 'status' => 'active', 'onboarding_state' => 'new']);
    }

    public function test_application_requires_a_valid_logo(): void
    {
        $user = $this->applicant();

        $this->actingAs($user)->postJson('/api/onboarding/merchant-application', $this->applicationPayload(['logo' => null]))
            ->assertStatus(422);

        foreach (['data:image/svg+xml;base64,'.base64_encode('<svg onload="x"/>'), 'data:text/html;base64,'.base64_encode('<b>x</b>'), 'data:image/png;base64,'.base64_encode('not an image'), 'javascript:alert(1)'] as $bad) {
            $this->actingAs($user)->postJson('/api/onboarding/merchant-application', $this->applicationPayload(['logo' => $bad]))
                ->assertStatus(422)
                ->assertJsonPath('error.code', 'INVALID_LOGO');
        }

        $this->assertDatabaseCount('merchant_applications', 0);
    }

    public function test_pending_business_shows_only_name_type_and_logo_publicly(): void
    {
        $user = $this->applicant();
        $this->actingAs($user)->postJson('/api/onboarding/merchant-application', $this->applicationPayload())->assertStatus(201);
        $id = MerchantApplication::first()->id;

        $list = $this->getJson('/api/pending-businesses')->assertStatus(200);
        $this->assertSame(['id', 'logo_url', 'name', 'type'], collect($list->json('data.0'))->keys()->sort()->values()->all());
        $list->assertJsonPath('data.0.name', 'مطعم الوردة');
        $this->assertStringNotContainsString('01012345678', $list->getContent());
        $this->assertStringNotContainsString('وسط البلد', $list->getContent());

        $logo = $this->get("/api/pending-businesses/{$id}/logo")->assertStatus(200);
        $this->assertSame('image/png', $logo->headers->get('Content-Type'));

        // Not a store yet: no menu, no ordering, not in the real store list
        $this->getJson('/api/stores')->assertJsonCount(0, 'data');

        config()->set('ordarat.show_pending_businesses', false);
        $this->getJson('/api/pending-businesses')->assertJsonCount(0, 'data');
        $this->get("/api/pending-businesses/{$id}/logo")->assertStatus(404);
    }

    public function test_approval_publishes_full_store_with_the_same_logo_and_removes_the_teaser(): void
    {
        $user = $this->applicant();
        $this->actingAs($user)->postJson('/api/onboarding/merchant-application', $this->applicationPayload())->assertStatus(201);
        $app = MerchantApplication::first();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin)->getJson('/api/admin/merchant-applications')
            ->assertJsonPath('data.0.logo_url', "/api/pending-businesses/{$app->id}/logo");

        $this->actingAs($admin)->postJson("/api/admin/merchant-applications/{$app->id}/approve")->assertStatus(200);

        $this->getJson('/api/pending-businesses')->assertJsonCount(0, 'data');
        $this->get("/api/pending-businesses/{$app->id}/logo")->assertStatus(404);

        $store = Store::first();
        $stores = $this->getJson('/api/stores')->assertJsonCount(1, 'data');
        $this->assertStringStartsWith("/api/stores/{$store->id}/logo", $stores->json('data.0.logo_url'));
        $this->assertStringNotContainsString('logo_data', $stores->getContent());
        $this->get("/api/stores/{$store->id}/logo")->assertStatus(200)->assertHeader('Content-Type', 'image/png');
    }

    public function test_inactive_store_logo_is_not_served(): void
    {
        $store = Store::create(['type' => 'restaurant', 'name' => 'مخفي', 'is_active' => false, 'is_accepting_orders' => false, 'logo_data' => self::logoDataUrl()]);
        $this->get("/api/stores/{$store->id}/logo")->assertStatus(404);
    }
}
