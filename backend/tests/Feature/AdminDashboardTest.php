<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

class AdminDashboardTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $admin;

    protected User $customer;

    protected User $merchant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'firebase_uid' => 'admin-uid-1',
            'email' => 'admin@ordarat.com',
            'status' => 'active',
        ]);

        $this->merchant = User::factory()->create([
            'role' => 'merchant',
            'firebase_uid' => 'merchant-uid-1',
            'email' => 'merchant@ordarat.com',
            'status' => 'active',
        ]);

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'customer-uid-1',
            'email' => 'customer@ordarat.com',
            'status' => 'active',
        ]);
    }

    public function test_customer_cannot_access_admin_stores(): void
    {
        $token = $this->createValidFirebaseToken('customer-uid-1', 'customer@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/stores');

        $response->assertStatus(403);
    }

    public function test_admin_can_list_stores(): void
    {
        Store::factory()->count(3)->create();
        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/stores');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_admin_can_open_store_account_with_initial_branch_and_merchant(): void
    {
        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $payload = [
            'name' => 'مطعم قنا الأصيل',
            'type' => 'restaurant',
            'owner_id' => $this->merchant->id,
            'branch_name' => 'فرع شارع الجمهورية',
            'branch_address' => 'شارع الجمهورية، قنا',
            'branch_phone' => '01011112222',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/stores', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'مطعم قنا الأصيل');

        $storeId = $response->json('data.id');
        $this->assertDatabaseHas('stores', ['id' => $storeId, 'name' => 'مطعم قنا الأصيل']);
        $this->assertDatabaseHas('branches', ['store_id' => $storeId, 'name' => 'فرع شارع الجمهورية']);
        $this->assertDatabaseHas('store_user', ['store_id' => $storeId, 'user_id' => $this->merchant->id]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'OPEN_STORE_ACCOUNT',
            'auditable_type' => Store::class,
            'auditable_id' => $storeId,
        ]);
    }

    public function test_admin_can_toggle_store_status_with_mandatory_reason(): void
    {
        $store = Store::factory()->create(['is_active' => true]);
        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        // Missing reason should fail validation
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/stores/{$store->id}/status", [
                'is_active' => false,
            ]);
        $response->assertStatus(422);

        // With reason should succeed
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/stores/{$store->id}/status", [
                'is_active' => false,
                'reason' => 'مخالفة معايير الجودة والتسعير في قنا',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('stores', ['id' => $store->id, 'is_active' => false]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'SUSPEND_STORE',
            'auditable_type' => Store::class,
            'auditable_id' => $store->id,
        ]);
    }

    public function test_admin_can_list_and_suspend_customer(): void
    {
        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $listResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/customers');

        $listResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        // Suspend customer
        $suspendResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/customers/{$this->customer->id}/status", [
                'status' => 'suspended',
                'reason' => 'طلبات وهمية متكررة',
            ]);

        $suspendResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'suspended');

        $this->assertDatabaseHas('users', ['id' => $this->customer->id, 'status' => 'suspended']);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'SUSPEND_USER',
            'auditable_id' => $this->customer->id,
        ]);
    }

    public function test_admin_cannot_suspend_another_admin(): void
    {
        $otherAdmin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/customers/{$otherAdmin->id}/status", [
                'status' => 'suspended',
                'reason' => 'محاولة غير مسموحة',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'CANNOT_SUSPEND_ADMIN');
    }

    public function test_admin_orders_list_flags_unaccepted_orders_timeout(): void
    {
        $store = Store::factory()->create();
        $branch = $store->branches()->create([
            'name' => 'الفرع الرئيسي',
            'address' => 'قنا',
            'is_active' => true,
        ]);

        // Old new order (15 mins ago)
        Order::factory()->create([
            'store_id' => $store->id,
            'branch_id' => $branch->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
            'created_at' => Carbon::now()->subMinutes(15),
        ]);

        // Fresh new order (2 mins ago)
        Order::factory()->create([
            'store_id' => $store->id,
            'branch_id' => $branch->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
            'created_at' => Carbon::now()->subMinutes(2),
        ]);

        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/orders');

        $response->assertStatus(200)
            ->assertJsonPath('data.unaccepted_alert_count', 1);
    }

    public function test_admin_can_manually_override_order_status_with_reason_and_history(): void
    {
        $store = Store::factory()->create();
        $branch = $store->branches()->create(['name' => 'الفرع', 'address' => 'قنا']);
        $order = Order::factory()->create([
            'store_id' => $store->id,
            'branch_id' => $branch->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
        ]);

        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/orders/{$order->id}/status", [
                'status' => 'cancelled',
                'reason' => 'المحل مغلق لظرف طارئ بناء على شكوى العميل',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('order_status_history', [
            'order_id' => $order->id,
            'from_status' => 'new',
            'to_status' => 'cancelled',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'MANUAL_ORDER_STATUS_UPDATE',
            'auditable_id' => $order->id,
        ]);
    }

    public function test_admin_can_update_and_view_settings(): void
    {
        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $updateResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/admin/settings', [
                'subscription_contact_number' => '01099887766',
                'unaccepted_order_alert_minutes' => 15,
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.subscription_contact_number', '01099887766')
            ->assertJsonPath('data.unaccepted_order_alert_minutes', 15);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'UPDATE_SYSTEM_SETTINGS',
        ]);
    }

    public function test_admin_can_view_audit_logs(): void
    {
        AuditLog::create([
            'user_id' => $this->admin->id,
            'action' => 'TEST_ACTION',
            'auditable_type' => Store::class,
            'auditable_id' => 1,
            'ip_address' => '127.0.0.1',
        ]);

        $token = $this->createValidFirebaseToken('admin-uid-1', 'admin@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/audit-logs');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertNotEmpty($response->json('data'));
    }
}
