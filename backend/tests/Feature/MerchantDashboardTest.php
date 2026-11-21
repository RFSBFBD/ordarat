<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

class MerchantDashboardTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $merchantA;

    protected User $merchantB;

    protected User $customer;

    protected Store $storeA;

    protected Store $storeB;

    protected Branch $branchA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->merchantA = User::factory()->create([
            'role' => 'merchant',
            'firebase_uid' => 'merchant-uid-A',
            'email' => 'merchantA@ordarat.com',
            'status' => 'active',
        ]);

        $this->merchantB = User::factory()->create([
            'role' => 'merchant',
            'firebase_uid' => 'merchant-uid-B',
            'email' => 'merchantB@ordarat.com',
            'status' => 'active',
        ]);

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'customer-uid-1',
            'email' => 'customer@ordarat.com',
            'status' => 'active',
        ]);

        $this->storeA = Store::factory()->create(['name' => 'مطعم النيل قنا', 'is_active' => true]);
        $this->storeA->users()->attach($this->merchantA->id);
        $this->branchA = $this->storeA->branches()->create([
            'name' => 'الفرع الرئيسي',
            'address' => 'شارع الهلال، قنا',
            'is_active' => true,
        ]);

        $this->storeB = Store::factory()->create(['name' => 'بقالة الصعيد', 'is_active' => true]);
        $this->storeB->users()->attach($this->merchantB->id);
    }

    public function test_customer_cannot_access_merchant_endpoints(): void
    {
        $token = $this->createValidFirebaseToken('customer-uid-1', 'customer@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/merchant/stores/{$this->storeA->id}");

        $response->assertStatus(403);
    }

    public function test_merchant_can_view_own_store_but_forbidden_from_another_store(): void
    {
        $tokenA = $this->createValidFirebaseToken('merchant-uid-A', 'merchantA@ordarat.com');

        // Access own store
        $responseOwn = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson("/api/merchant/stores/{$this->storeA->id}");
        $responseOwn->assertStatus(200)
            ->assertJsonPath('data.name', 'مطعم النيل قنا');

        // Attempt accessing store B
        $responseOther = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson("/api/merchant/stores/{$this->storeB->id}");
        $responseOther->assertStatus(403);
    }

    public function test_merchant_can_toggle_is_accepting_orders(): void
    {
        $tokenA = $this->createValidFirebaseToken('merchant-uid-A', 'merchantA@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->putJson("/api/merchant/stores/{$this->storeA->id}", [
                'is_accepting_orders' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_accepting_orders', false);

        $this->assertDatabaseHas('stores', [
            'id' => $this->storeA->id,
            'is_accepting_orders' => false,
        ]);
    }

    public function test_merchant_can_manage_categories_and_products(): void
    {
        $tokenA = $this->createValidFirebaseToken('merchant-uid-A', 'merchantA@ordarat.com');

        // 1. Create Category
        $catResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson("/api/merchant/stores/{$this->storeA->id}/categories", [
                'name' => 'مشويات وسندوتشات',
                'sort_order' => 1,
            ]);
        $catResponse->assertStatus(201);
        $catId = $catResponse->json('data.id');

        // 2. Create Product with decimal price
        $prodResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson("/api/merchant/stores/{$this->storeA->id}/products", [
                'category_id' => $catId,
                'name' => 'ساندوتش كفتة قناوي',
                'price' => 45.50,
                'description' => 'كفتة بلدي مشوية على الفحم مع طحينة',
                'is_available' => true,
            ]);

        $prodResponse->assertStatus(201)
            ->assertJsonPath('data.price', '45.50')
            ->assertJsonPath('data.is_available', true);

        $productId = $prodResponse->json('data.id');

        // 3. Toggle product availability to 'finished' without deleting
        $toggleResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/products/{$productId}/toggle-availability");

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('data.is_available', false)
            ->assertJsonPath('data.badge', 'خلصان');

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'is_available' => false,
        ]);
    }

    public function test_merchant_cannot_tamper_with_another_stores_product(): void
    {
        $productB = Product::create([
            'store_id' => $this->storeB->id,
            'name' => 'أرز مصري 1ك',
            'price' => 32.00,
            'is_available' => true,
        ]);

        $tokenA = $this->createValidFirebaseToken('merchant-uid-A', 'merchantA@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/products/{$productB->id}/toggle-availability");

        $response->assertStatus(403);
    }

    public function test_merchant_orders_queue_has_new_orders_audio_flag(): void
    {
        Order::factory()->create([
            'store_id' => $this->storeA->id,
            'branch_id' => $this->branchA->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
        ]);

        $tokenA = $this->createValidFirebaseToken('merchant-uid-A', 'merchantA@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson("/api/merchant/stores/{$this->storeA->id}/orders");

        $response->assertStatus(200)
            ->assertJsonPath('data.new_orders_count', 1)
            ->assertJsonPath('data.play_audio_alert', true);
    }

    public function test_merchant_order_lifecycle_and_transition_guard(): void
    {
        $order = Order::factory()->create([
            'store_id' => $this->storeA->id,
            'branch_id' => $this->branchA->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
        ]);

        $tokenA = $this->createValidFirebaseToken('merchant-uid-A', 'merchantA@ordarat.com');

        // Invalid jump: new -> delivered should fail
        $invalidResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/orders/{$order->id}/status", [
                'status' => 'delivered',
            ]);
        $invalidResponse->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION');

        // Valid: new -> accepted
        $acceptResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/orders/{$order->id}/status", [
                'status' => 'accepted',
            ]);
        $acceptResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');

        // Valid: accepted -> preparing
        $prepResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/orders/{$order->id}/status", [
                'status' => 'preparing',
            ]);
        $prepResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'preparing');

        // Valid: preparing -> out_for_delivery
        $dispatchResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/orders/{$order->id}/status", [
                'status' => 'out_for_delivery',
            ]);
        $dispatchResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'out_for_delivery');

        // Valid: out_for_delivery -> delivered
        $deliveredResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/orders/{$order->id}/status", [
                'status' => 'delivered',
            ]);
        $deliveredResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'delivered');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'delivered']);
        $this->assertDatabaseHas('order_status_history', [
            'order_id' => $order->id,
            'from_status' => 'out_for_delivery',
            'to_status' => 'delivered',
        ]);
    }

    public function test_merchant_order_rejection_requires_reason(): void
    {
        $order = Order::factory()->create([
            'store_id' => $this->storeA->id,
            'branch_id' => $this->branchA->id,
            'customer_id' => $this->customer->id,
            'status' => 'new',
        ]);

        $tokenA = $this->createValidFirebaseToken('merchant-uid-A', 'merchantA@ordarat.com');

        // Rejection without reason fails validation
        $failResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/orders/{$order->id}/status", [
                'status' => 'rejected',
            ]);
        $failResponse->assertStatus(422);

        // Rejection with reason succeeds
        $successResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->patchJson("/api/merchant/stores/{$this->storeA->id}/orders/{$order->id}/status", [
                'status' => 'rejected',
                'reason' => 'الأصناف المطلوبة نفذت من الفرع حالياً',
            ]);
        $successResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'الأصناف المطلوبة نفذت من الفرع حالياً');
    }
}
