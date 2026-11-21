<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseAndAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_unauthenticated_user_cannot_access_private_order_data(): void
    {
        $order = Order::first();

        $response = $this->getJson("/api/orders/{$order->id}");

        // Unauthenticated request must receive 401
        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'error' => ['code' => 'UNAUTHENTICATED'],
            ]);
    }

    public function test_customer_cannot_read_another_customers_order(): void
    {
        $customerA = User::where('email', 'customer_a@ordarat-qena.local')->first();
        $customerB = User::where('email', 'customer_b@ordarat-qena.local')->first();
        $orderA = Order::where('customer_id', $customerA->id)->first();

        // Customer B tries to read Customer A's order -> 403 Forbidden
        $response = $this->actingAs($customerB)->getJson("/api/orders/{$orderA->id}");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN'],
            ]);
    }

    public function test_customer_can_read_their_own_order(): void
    {
        $customerA = User::where('email', 'customer_a@ordarat-qena.local')->first();
        $orderA = Order::where('customer_id', $customerA->id)->first();

        $response = $this->actingAs($customerA)->getJson("/api/orders/{$orderA->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $orderA->id)
            ->assertJsonPath('data.customer_id', $customerA->id);
    }

    public function test_merchant_cannot_read_or_update_another_store(): void
    {
        $merchantA = User::where('email', 'karnak@ordarat-qena.local')->first();
        $groceryStore = Store::where('type', 'grocery')->first();

        // Merchant A belongs to Karnak restaurant, tries to update Amana grocery store
        $response = $this->actingAs($merchantA)->putJson("/api/stores/{$groceryStore->id}", [
            'name' => 'اختراق اسم البقالة',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN'],
            ]);
    }

    public function test_merchant_can_update_their_own_store(): void
    {
        $merchantA = User::where('email', 'karnak@ordarat-qena.local')->first();
        $restaurantStore = Store::where('type', 'restaurant')->first();

        $response = $this->actingAs($merchantA)->putJson("/api/stores/{$restaurantStore->id}", [
            'is_accepting_orders' => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_accepting_orders', false);
    }

    public function test_only_admin_can_open_store_accounts(): void
    {
        $admin = User::where('email', 'admin@ordarat-qena.local')->first();
        $customer = User::where('email', 'customer_a@ordarat-qena.local')->first();
        $merchant = User::where('email', 'karnak@ordarat-qena.local')->first();

        $payload = [
            'name' => 'مطعم جديد في قنا (تجريبي)',
            'type' => 'restaurant',
            'owner_id' => $customer->id,
            'branch_name' => 'الفرع الرئيسي',
            'branch_address' => 'ميدان الساعة، قنا',
        ];

        // Customer attempts to open store -> 403
        $this->actingAs($customer)->postJson('/api/admin/stores', $payload)->assertStatus(403);

        // Merchant attempts to open store -> 403
        $this->actingAs($merchant)->postJson('/api/admin/stores', $payload)->assertStatus(403);

        // Admin opens store -> 201 Created
        $response = $this->actingAs($admin)->postJson('/api/admin/stores', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'مطعم جديد في قنا (تجريبي)');

        $this->assertDatabaseHas('stores', ['name' => 'مطعم جديد في قنا (تجريبي)']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'OPEN_STORE_ACCOUNT']);
    }

    public function test_customer_cannot_update_order_status(): void
    {
        $customerA = User::where('email', 'customer_a@ordarat-qena.local')->first();
        $orderA = Order::where('customer_id', $customerA->id)->first();

        $response = $this->actingAs($customerA)->patchJson("/api/orders/{$orderA->id}/status", [
            'status' => 'delivered',
        ]);

        $response->assertStatus(403);
    }

    public function test_assigned_merchant_can_update_order_status(): void
    {
        $merchantA = User::where('email', 'karnak@ordarat-qena.local')->first();
        $orderA = Order::where('customer_id', User::where('email', 'customer_a@ordarat-qena.local')->first()->id)->first();

        $response = $this->actingAs($merchantA)->patchJson("/api/orders/{$orderA->id}/status", [
            'status' => 'accepted',
            'note' => 'تم استلام وتأكيد الطلب',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');

        $this->assertDatabaseHas('order_status_history', [
            'order_id' => $orderA->id,
            'to_status' => 'accepted',
        ]);
    }
}
