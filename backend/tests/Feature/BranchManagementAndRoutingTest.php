<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

class BranchManagementAndRoutingTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $admin;

    protected User $merchant;

    protected User $customer;

    protected Store $store;

    protected Branch $branchA;

    protected Branch $branchB;

    protected Zone $zone;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'firebase_uid' => 'admin-branch-uid',
            'email' => 'admin@ordarat.com',
            'status' => 'active',
        ]);

        $this->merchant = User::factory()->create([
            'role' => 'merchant',
            'firebase_uid' => 'merchant-branch-uid',
            'email' => 'merchant@ordarat.com',
            'status' => 'active',
        ]);

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'customer-branch-uid',
            'email' => 'customer@ordarat.com',
            'phone' => '01012345678',
            'status' => 'active',
        ]);

        $this->store = Store::factory()->create(['name' => 'مطعم النيل - قنا', 'is_active' => true]);
        $this->store->users()->attach($this->merchant->id);

        // Branch A: Downtown Qena (26.1642, 32.7181)
        $this->branchA = $this->store->branches()->create([
            'name' => 'فرع وسط البلد',
            'address' => 'شارع المحطة، قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);

        // Branch B: El-Maana (26.1850, 32.7400)
        $this->branchB = $this->store->branches()->create([
            'name' => 'فرع المعنا',
            'address' => 'طريق المعنا، قنا',
            'latitude' => 26.1850,
            'longitude' => 32.7400,
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);

        $this->zone = Zone::create(['name' => 'قنا', 'is_active' => true]);

        $this->branchA->zoneFees()->create(['zone_id' => $this->zone->id, 'delivery_fee' => 12.00, 'is_served' => true]);
        $this->branchB->zoneFees()->create(['zone_id' => $this->zone->id, 'delivery_fee' => 18.00, 'is_served' => true]);

        $this->product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'طاجن لحمة',
            'price' => 90.00,
            'is_available' => true,
        ]);
    }

    public function test_admin_can_create_and_list_branch_managers_while_non_admin_is_forbidden(): void
    {
        $adminToken = $this->createValidFirebaseToken('admin-branch-uid', 'admin@ordarat.com');
        $merchantToken = $this->createValidFirebaseToken('merchant-branch-uid', 'merchant@ordarat.com');

        // 1. Merchant attempt is rejected with 403
        $forbiddenResponse = $this->withHeader('Authorization', "Bearer {$merchantToken}")
            ->postJson('/api/admin/branch-managers', [
                'name' => 'مسؤول فرع وسط البلد',
                'email' => 'bm_downtown@ordarat.com',
                'branch_id' => $this->branchA->id,
            ]);
        $forbiddenResponse->assertStatus(403);

        // 2. Admin creates branch manager
        $createResponse = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/admin/branch-managers', [
                'name' => 'أحمد قناوي',
                'email' => 'bm_downtown@ordarat.com',
                'phone' => '01099887766',
                'branch_id' => $this->branchA->id,
            ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.role', 'branch_manager');

        $this->assertDatabaseHas('users', [
            'email' => 'bm_downtown@ordarat.com',
            'role' => 'branch_manager',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('branch_user', [
            'branch_id' => $this->branchA->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'CREATE_BRANCH_MANAGER',
        ]);
    }

    public function test_suspended_branch_manager_is_immediately_rejected(): void
    {
        $manager = User::factory()->create([
            'role' => 'branch_manager',
            'firebase_uid' => 'bm-suspended-uid',
            'email' => 'bm_suspended@ordarat.com',
            'status' => 'suspended',
        ]);
        $this->branchA->managers()->attach($manager->id);

        $token = $this->createValidFirebaseToken('bm-suspended-uid', 'bm_suspended@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/branch/dashboard');

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'ACCOUNT_SUSPENDED');
    }

    public function test_branch_manager_can_manage_own_branch_orders_but_forbidden_from_other_branch_orders(): void
    {
        $managerA = User::factory()->create([
            'role' => 'branch_manager',
            'firebase_uid' => 'manager-a-uid',
            'email' => 'managerA@ordarat.com',
            'status' => 'active',
        ]);
        $this->branchA->managers()->attach($managerA->id);

        // Order for Branch A
        $orderA = Order::factory()->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branchA->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
        ]);

        // Order for Branch B
        $orderB = Order::factory()->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branchB->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
        ]);

        $tokenA = $this->createValidFirebaseToken('manager-a-uid', 'managerA@ordarat.com');

        // 1. Manager A can view dashboard
        $dashResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson('/api/branch/dashboard');
        $dashResponse->assertStatus(200)
            ->assertJsonPath('data.branch.name', 'فرع وسط البلد')
            ->assertJsonPath('data.stats.new_orders', 1);

        // 2. Manager A can accept order of Branch A
        $acceptResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/branch/orders/{$orderA->id}/status", ['status' => 'accepted']);
        $acceptResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');

        // 3. Manager A is strictly FORBIDDEN from modifying order of Branch B
        $forbiddenResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/branch/orders/{$orderB->id}/status", ['status' => 'accepted']);
        $forbiddenResponse->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN')
            ->assertJsonPath('error.message', 'الطلب ده مش على فرعك');
    }

    public function test_branch_manager_can_toggle_branch_orders_acceptance(): void
    {
        $managerA = User::factory()->create([
            'role' => 'branch_manager',
            'firebase_uid' => 'manager-a-uid',
            'email' => 'managerA@ordarat.com',
            'status' => 'active',
        ]);
        $this->branchA->managers()->attach($managerA->id);

        $tokenA = $this->createValidFirebaseToken('manager-a-uid', 'managerA@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson('/api/branch/status', [
                'is_accepting_orders' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_accepting_orders', false);

        $this->assertDatabaseHas('branches', [
            'id' => $this->branchA->id,
            'is_accepting_orders' => false,
        ]);
    }

    public function test_customer_order_routes_to_nearest_open_branch_and_skips_closed_branch(): void
    {
        // Close Branch A (downtown)
        $this->branchA->update(['is_accepting_orders' => false]);

        $tokenCustomer = $this->createValidFirebaseToken('customer-branch-uid', 'customer@ordarat.com');

        // Customer coordinate is right in downtown (26.1642, 32.7181)
        // Since Branch A is closed, it MUST automatically route to Branch B (Maana)!
        $payload = [
            'store_id' => $this->store->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
            'branch_id' => 9999, // Tampered client-sent branch_id MUST be ignored
        ];

        $response = $this->withHeader('Authorization', "Bearer {$tokenCustomer}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.branch_id', $this->branchB->id); // Routed to open Branch B
    }

    public function test_order_is_blocked_if_all_branches_are_closed(): void
    {
        // Close all branches
        $this->branchA->update(['is_accepting_orders' => false]);
        $this->branchB->update(['is_accepting_orders' => false]);

        $tokenCustomer = $this->createValidFirebaseToken('customer-branch-uid', 'customer@ordarat.com');

        $payload = [
            'store_id' => $this->store->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$tokenCustomer}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'CHECKOUT_FAILED')
            ->assertJsonPath('error.message', 'النشاط ده مقفول دلوقتي، جرّب بعدين');
    }

    public function test_tie_breaking_rule_picks_oldest_branch_when_distances_are_equal(): void
    {
        // Place customer right in the geometric midpoint between two mock equal distance branches
        // Or set both branches to the exact same coordinates
        $branchEqui1 = $this->store->branches()->create([
            'name' => 'فرع النادي - أقدم',
            'address' => 'قنا',
            'latitude' => 26.1700,
            'longitude' => 32.7200,
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);
        $branchEqui1->zoneFees()->create(['zone_id' => $this->zone->id, 'delivery_fee' => 15.00, 'is_served' => true]);

        $branchEqui2 = $this->store->branches()->create([
            'name' => 'فرع النادي - أحدث',
            'address' => 'قنا',
            'latitude' => 26.1700,
            'longitude' => 32.7200, // Exact same distance
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);
        $branchEqui2->zoneFees()->create(['zone_id' => $this->zone->id, 'delivery_fee' => 15.00, 'is_served' => true]);

        // Customer coordinate right at (26.1700, 32.7200)
        $tokenCustomer = $this->createValidFirebaseToken('customer-branch-uid', 'customer@ordarat.com');

        $payload = [
            'store_id' => $this->store->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1700,
            'delivery_longitude' => 32.7200,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$tokenCustomer}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(201);
        // Must choose the older branch with lower ID
        $this->assertEquals($branchEqui1->id, $response->json('data.branch_id'));
    }

    public function test_legacy_orders_with_null_branch_id_load_safely(): void
    {
        $legacyOrder = Order::create([
            'order_number' => 'ORD-LEGACY-001',
            'idempotency_key' => (string) Str::uuid(),
            'store_id' => $this->store->id,
            'branch_id' => null, // Legacy order with no branch assigned
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_phone' => $this->customer->phone,
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'items_total' => 90.00,
            'delivery_fee' => 15.00,
            'grand_total' => 105.00,
            'status' => 'delivered',
            'payment_method' => 'COD',
        ]);

        $tokenCustomer = $this->createValidFirebaseToken('customer-branch-uid', 'customer@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$tokenCustomer}")
            ->getJson("/api/orders/{$legacyOrder->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.branch_id', null)
            ->assertJsonPath('data.branch', null);
    }
}
