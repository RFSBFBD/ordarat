<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

/**
 * HTTP-level coverage for the remaining admin-ops and merchant catalog
 * routes found untested in the 23 Nov 2026 API audit. Role isolation for
 * these areas is covered elsewhere; here we exercise each route's own
 * behavior with the mock AI provider (no external accounts).
 */
class AdminOpsAndCatalogTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $admin;
    protected User $merchant;
    protected Store $store;
    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->admin = $this->user('admin', 'admin-ops');
        $this->merchant = $this->user('merchant', 'merchant-ops');
        $this->store = Store::factory()->create(['type' => 'restaurant', 'is_active' => true]);
        $this->store->users()->attach($this->merchant->id);
        $this->branch = Branch::factory()->create(['store_id' => $this->store->id, 'is_active' => true]);
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
        return ['Authorization' => 'Bearer '.$this->createValidFirebaseToken($user->firebase_uid, $user->email)];
    }

    public function test_admin_settings_and_ai_read_endpoints_respond(): void
    {
        $auth = $this->auth($this->admin);

        $this->getJson('/api/admin/settings', $auth)->assertOk()->assertJson(['success' => true]);
        $this->getJson('/api/admin/ai/stores', $auth)->assertOk()->assertJson(['success' => true]);
        $this->getJson('/api/admin/ai/usage-logs', $auth)->assertOk()->assertJson(['success' => true]);
        $this->getJson('/api/admin/ai/analysis-history', $auth)->assertOk()->assertJson(['success' => true]);
    }

    public function test_admin_ai_settings_update_kill_switch_and_mock_connection_test(): void
    {
        $auth = $this->auth($this->admin);

        $this->putJson('/api/admin/ai/settings/text_analysis', [
            'provider_name' => 'mock',
            'is_enabled' => true,
            'cost_limit_daily_usd' => 5,
            'cost_limit_monthly_usd' => 50,
            'daily_request_limit' => 100,
            'store_daily_quota' => 20,
            'store_monthly_quota' => 200,
        ], $auth)->assertOk()->assertJson(['success' => true]);

        $this->patchJson('/api/admin/ai/kill-switch', ['kill_switch' => true], $auth)
            ->assertOk()->assertJson(['success' => true, 'kill_switch' => true]);
        $this->patchJson('/api/admin/ai/kill-switch', ['kill_switch' => false], $auth)
            ->assertOk()->assertJson(['success' => true, 'kill_switch' => false]);

        // The mock provider answers offline; no external AI account needed.
        $this->postJson('/api/admin/ai/test-connection', ['provider_name' => 'mock'], $auth)
            ->assertOk()->assertJson(['success' => true]);
    }

    public function test_admin_branch_managers_list_create_and_toggle(): void
    {
        $auth = $this->auth($this->admin);

        $this->getJson('/api/admin/branch-managers', $auth)->assertOk()->assertJson(['success' => true]);

        $this->postJson('/api/admin/branch-managers', [
            'name' => 'مدير الفرع',
            'email' => 'bm-new@ordarat.test',
            'branch_id' => $this->branch->id,
        ], $auth)->assertCreated()->assertJson(['success' => true]);

        $manager = User::where('email', 'bm-new@ordarat.test')->firstOrFail();

        $this->patchJson("/api/admin/branch-managers/{$manager->id}/status", [
            'status' => 'suspended',
            'reason' => 'مراجعة دورية',
        ], $auth)->assertOk()->assertJson(['success' => true]);

        $this->assertSame('suspended', $manager->fresh()->status);
    }

    public function test_merchant_branch_crud(): void
    {
        $auth = $this->auth($this->merchant);
        $base = "/api/merchant/stores/{$this->store->id}/branches";

        $this->getJson($base, $auth)->assertOk()->assertJson(['success' => true]);

        $created = $this->postJson($base, [
            'name' => 'فرع المعهد',
            'address' => 'شارع المعهد، قنا',
        ], $auth)->assertCreated()->assertJson(['success' => true]);

        $branchId = $created->json('data.id');

        $this->putJson("{$base}/{$branchId}", ['is_active' => false], $auth)
            ->assertOk()->assertJson(['success' => true])
            ->assertJsonPath('data.is_active', false);
    }

    public function test_merchant_category_and_product_crud(): void
    {
        $auth = $this->auth($this->merchant);
        $storeBase = "/api/merchant/stores/{$this->store->id}";

        $category = Category::create(['store_id' => $this->store->id, 'name' => 'مشويات', 'sort_order' => 0]);
        $this->getJson("{$storeBase}/categories", $auth)->assertOk()->assertJson(['success' => true]);
        $this->putJson("{$storeBase}/categories/{$category->id}", ['name' => 'مشويات بلدي'], $auth)
            ->assertOk()->assertJson(['success' => true]);

        $product = Product::create([
            'store_id' => $this->store->id,
            'category_id' => $category->id,
            'name' => 'كباب بلدي',
            'price' => 120.00,
            'is_available' => true,
        ]);
        $this->getJson("{$storeBase}/products", $auth)->assertOk()->assertJson(['success' => true]);
        $this->putJson("{$storeBase}/products/{$product->id}", ['price' => 135.5], $auth)
            ->assertOk()->assertJson(['success' => true])
            ->assertJsonPath('data.price', '135.50');

        $this->deleteJson("{$storeBase}/categories/{$category->id}", [], $auth)
            ->assertOk()->assertJson(['success' => true]);
    }

    public function test_image_uploads_validate_the_file_field(): void
    {
        $auth = $this->auth($this->merchant);
        $storeBase = "/api/merchant/stores/{$this->store->id}";

        // Missing file must be a clean 422, never a 500.
        $this->postJson("{$storeBase}/upload-image", [], $auth)->assertStatus(422);

        $product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'كباب بلدي',
            'price' => 120.00,
            'is_available' => true,
        ]);
        $this->postJson("{$storeBase}/products/{$product->id}/upload-image", [], $auth)
            ->assertStatus(422);
    }
}
