<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BranchZoneFee;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

/**
 * Covers the 23 Nov 2026 hardening round:
 *  - server-side role middleware on admin/merchant/branch route groups
 *  - coordinate-based delivery zone resolution in checkout pricing
 *  - strict order status lifecycle transitions
 */
class RoleIsolationAndZoneResolutionTest extends TestCase
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

    public function test_customer_cannot_access_admin_or_merchant_or_branch_sections(): void
    {
        $customer = $this->user('customer', 'cust-1');

        $this->getJson('/api/admin/stores', $this->auth($customer))->assertStatus(403);
        $this->getJson('/api/merchant/stores', $this->auth($customer))->assertStatus(403);
        $this->getJson('/api/branch/dashboard', $this->auth($customer))->assertStatus(403);
    }

    public function test_merchant_cannot_access_admin_section(): void
    {
        $merchant = $this->user('merchant', 'merch-1');

        $this->getJson('/api/admin/stores', $this->auth($merchant))->assertStatus(403);
        $this->getJson('/api/branch/dashboard', $this->auth($merchant))->assertStatus(403);
    }

    public function test_admin_can_access_admin_section(): void
    {
        $admin = $this->user('admin', 'admin-1');

        $this->getJson('/api/admin/stores', $this->auth($admin))->assertStatus(200);
    }

    public function test_branch_manager_reaches_branch_dashboard_and_merchant_cannot_impersonate(): void
    {
        $store = Store::factory()->create(['type' => 'restaurant', 'is_active' => true]);
        $branch = Branch::factory()->create(['store_id' => $store->id]);

        $branchManager = $this->user('branch_manager', 'bm-1');
        $branchManager->managedBranches()->attach($branch->id);

        $this->getJson('/api/branch/dashboard', $this->auth($branchManager))
            ->assertStatus(200)
            ->assertJsonPath('data.branch.id', $branch->id);

        // A branch manager is not a merchant and cannot list merchant stores.
        $this->getJson('/api/merchant/stores', $this->auth($branchManager))->assertStatus(403);
    }

    public function test_unauthenticated_requests_are_rejected_before_role_checks(): void
    {
        $this->getJson('/api/admin/stores')->assertStatus(401);
        $this->getJson('/api/branch/dashboard')->assertStatus(401);
    }

    public function test_quote_uses_the_zone_containing_the_customer_location(): void
    {
        $merchant = $this->user('merchant', 'merch-z');
        $store = Store::factory()->create([
            'type' => 'restaurant',
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);
        $store->users()->attach($merchant->id);

        $branch = Branch::factory()->create([
            'store_id' => $store->id,
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);

        $zoneA = Zone::create([
            'name' => 'وسط البلد',
            'is_active' => true,
            'center_lat' => 26.1642,
            'center_lng' => 32.7181,
            'radius_km' => 1.0,
        ]);
        $zoneB = Zone::create([
            'name' => 'الجامعة',
            'is_active' => true,
            'center_lat' => 26.1890,
            'center_lng' => 32.7260,
            'radius_km' => 1.5,
        ]);

        BranchZoneFee::create([
            'branch_id' => $branch->id,
            'zone_id' => $zoneA->id,
            'delivery_fee' => 10.00,
            'is_served' => true,
        ]);
        BranchZoneFee::create([
            'branch_id' => $branch->id,
            'zone_id' => $zoneB->id,
            'delivery_fee' => 25.00,
            'is_served' => true,
        ]);

        $product = Product::create([
            'store_id' => $store->id,
            'name' => 'وجبة اختبار',
            'price' => 50.00,
            'is_available' => true,
        ]);

        // Location clearly inside zone B (near the university), far from zone A.
        $response = $this->postJson('/api/checkout/quote', [
            'store_id' => $store->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1895,
            'delivery_longitude' => 32.7255,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.zone.id', $zoneB->id)
            ->assertJsonPath('data.delivery_fee', '25.00');
    }

    public function test_order_status_rejects_invalid_transitions_and_accepts_valid_ones(): void
    {
        $merchant = $this->user('merchant', 'merch-t');
        $store = Store::factory()->create(['type' => 'restaurant', 'is_active' => true]);
        $store->users()->attach($merchant->id);
        $branch = Branch::factory()->create(['store_id' => $store->id]);
        $customer = $this->user('customer', 'cust-t');

        $order = Order::create([
            'order_number' => 'ORD-TST-1',
            'idempotency_key' => (string) Str::uuid(),
            'customer_id' => $customer->id,
            'store_id' => $store->id,
            'branch_id' => $branch->id,
            'customer_name' => $customer->name,
            'customer_phone' => '01012345678',
            'items_total' => 50.00,
            'delivery_fee' => 10.00,
            'grand_total' => 60.00,
            'status' => 'new',
            'payment_method' => 'COD',
        ]);

        // Illegal jump: new -> delivered must be rejected.
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'delivered'], $this->auth($merchant))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION');

        // Legal path: new -> accepted -> preparing.
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'accepted'], $this->auth($merchant))
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'preparing'], $this->auth($merchant))
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'preparing');

        // Going backwards is rejected too.
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'accepted'], $this->auth($merchant))
            ->assertStatus(422);
    }
}
