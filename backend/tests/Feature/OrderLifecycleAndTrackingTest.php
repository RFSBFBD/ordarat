<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

class OrderLifecycleAndTrackingTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $customer1;

    protected User $customer2;

    protected User $merchant;

    protected Store $store;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->customer1 = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'cust-uid-1',
            'email' => 'cust1@ordarat.com',
            'phone' => '01011112222',
            'status' => 'active',
        ]);

        $this->customer2 = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'cust-uid-2',
            'email' => 'cust2@ordarat.com',
            'phone' => '01122223333',
            'status' => 'active',
        ]);

        $this->merchant = User::factory()->create([
            'role' => 'merchant',
            'firebase_uid' => 'merch-uid-1',
            'email' => 'merchant@ordarat.com',
            'status' => 'active',
        ]);

        $this->store = Store::factory()->create(['name' => 'مطعم قناوي', 'is_active' => true]);
        $this->store->users()->attach($this->merchant->id);
        $this->branch = $this->store->branches()->create([
            'name' => 'الفرع الرئيسي',
            'address' => 'قنا',
            'is_active' => true,
        ]);
    }

    public function test_customer_can_track_own_order_with_status_history(): void
    {
        $order = Order::factory()->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer1->id,
            'status' => 'new',
        ]);

        $order->statusHistory()->create([
            'changed_by_user_id' => $this->customer1->id,
            'from_status' => null,
            'to_status' => 'new',
            'note' => 'تم إنشاء الطلب',
        ]);

        $token1 = $this->createValidFirebaseToken('cust-uid-1', 'cust1@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token1}")
            ->getJson("/api/orders/{$order->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.status', 'new');

        $this->assertCount(1, $response->json('data.status_history'));
    }

    public function test_customer_cannot_track_another_customers_order(): void
    {
        $order = Order::factory()->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer1->id,
            'status' => 'new',
        ]);

        $token2 = $this->createValidFirebaseToken('cust-uid-2', 'cust2@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->getJson("/api/orders/{$order->id}");

        $response->assertStatus(403);
    }

    public function test_customer_can_cancel_order_before_store_accepts_it(): void
    {
        $order = Order::factory()->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer1->id,
            'status' => 'new',
        ]);

        $token1 = $this->createValidFirebaseToken('cust-uid-1', 'cust1@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token1}")
            ->postJson("/api/orders/{$order->id}/cancel", [
                'reason' => 'طلبت بالخطأ وأريد تعديل الأصناف',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);

        $this->assertDatabaseHas('order_status_history', [
            'order_id' => $order->id,
            'from_status' => 'new',
            'to_status' => 'cancelled',
        ]);
    }

    public function test_customer_cannot_cancel_order_after_store_accepts_it(): void
    {
        $order = Order::factory()->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer1->id,
            'status' => 'accepted', // Store already accepted
        ]);

        $token1 = $this->createValidFirebaseToken('cust-uid-1', 'cust1@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token1}")
            ->postJson("/api/orders/{$order->id}/cancel", [
                'reason' => 'محاولة إلغاء متأخرة',
            ]);

        $response->assertStatus(403);
    }

    public function test_customer_orders_list_returns_only_authenticated_customer_orders(): void
    {
        Order::factory()->count(2)->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer1->id,
        ]);

        Order::factory()->count(3)->create([
            'store_id' => $this->store->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer2->id,
        ]);

        $token1 = $this->createValidFirebaseToken('cust-uid-1', 'cust1@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token1}")
            ->getJson('/api/orders');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertCount(2, $response->json('data'));
    }
}
