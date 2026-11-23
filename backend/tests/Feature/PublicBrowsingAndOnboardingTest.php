<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

/**
 * Closes coverage gaps found in the 23 Nov 2026 API audit: the public
 * browsing endpoints every guest hits first, onboarding status polling,
 * and the branch orders feed had no direct HTTP tests.
 */
class PublicBrowsingAndOnboardingTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();
    }

    protected function user(string $role, string $uid): User
    {
        return User::factory()->create([
            'role' => $role,
            'firebase_uid' => $uid,
            'email' => "{$uid}@ordarat.test",
            'status' => 'active',
        ]);
    }

    protected function auth(User $user): array
    {
        $token = $this->createValidFirebaseToken($user->firebase_uid, $user->email);

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_public_store_list_returns_only_active_stores_in_envelope(): void
    {
        Store::factory()->create(['name' => 'مطعم نشط', 'is_active' => true]);
        Store::factory()->create(['name' => 'مطعم موقوف', 'is_active' => false]);

        $response = $this->getJson('/api/stores');

        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'مطعم نشط');
    }

    public function test_public_store_detail_loads_and_unknown_store_is_404(): void
    {
        $store = Store::factory()->create(['is_active' => true]);
        Branch::factory()->create(['store_id' => $store->id, 'is_active' => true]);

        $this->getJson("/api/stores/{$store->id}")
            ->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.id', $store->id);

        $this->getJson('/api/stores/999999')->assertNotFound();
    }

    public function test_onboarding_status_requires_auth_and_reports_shape(): void
    {
        $this->getJson('/api/onboarding/status')->assertUnauthorized();

        $customer = $this->user('customer', 'onboard-1');

        $this->getJson('/api/onboarding/status', $this->auth($customer))
            ->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'success',
                'data' => ['profile_complete', 'onboarding_state'],
            ]);
    }

    public function test_branch_orders_feed_scoped_to_manager_branch(): void
    {
        $store = Store::factory()->create(['type' => 'restaurant', 'is_active' => true]);
        $branch = Branch::factory()->create(['store_id' => $store->id]);
        $otherBranch = Branch::factory()->create(['store_id' => $store->id]);

        $manager = $this->user('branch_manager', 'bm-feed-1');
        $manager->managedBranches()->attach($branch->id);

        $this->getJson('/api/branch/orders', $this->auth($manager))
            ->assertOk()
            ->assertJson(['success' => true]);

        // A merchant must not read the branch feed.
        $merchant = $this->user('merchant', 'merch-feed-1');
        $this->getJson('/api/branch/orders', $this->auth($merchant))->assertStatus(403);
    }
}
