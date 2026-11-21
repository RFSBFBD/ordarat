<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

class MerchantZonePricingTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $merchantA;

    protected User $merchantB;

    protected User $customer;

    protected Store $storeA;

    protected Store $storeB;

    protected Branch $branchA;

    protected Zone $zoneDowntown;

    protected Zone $zoneMaana;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->merchantA = User::factory()->create([
            'role' => 'merchant',
            'firebase_uid' => 'merch-uid-A',
            'email' => 'merchantA@ordarat.com',
            'status' => 'active',
        ]);

        $this->merchantB = User::factory()->create([
            'role' => 'merchant',
            'firebase_uid' => 'merch-uid-B',
            'email' => 'merchantB@ordarat.com',
            'status' => 'active',
        ]);

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'customer-uid-qena',
            'email' => 'customer@ordarat.com',
            'status' => 'active',
        ]);

        $this->storeA = Store::factory()->create(['name' => 'مطعم الأصيل قنا', 'is_active' => true]);
        $this->storeA->users()->attach($this->merchantA->id);

        $this->branchA = $this->storeA->branches()->create([
            'name' => 'الفرع الرئيسي',
            'address' => 'وسط البلد، قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'is_active' => true,
        ]);

        $this->storeB = Store::factory()->create(['name' => 'مطعم آخر', 'is_active' => true]);
        $this->storeB->users()->attach($this->merchantB->id);

        $this->zoneDowntown = Zone::create(['name' => 'وسط البلد', 'is_active' => true]);
        $this->zoneMaana = Zone::create(['name' => 'المعنا', 'is_active' => true]);

        $this->product = Product::create([
            'store_id' => $this->storeA->id,
            'name' => 'وجبة مشاوي',
            'price' => 100.00,
            'is_available' => true,
        ]);
    }

    public function test_merchant_can_list_and_set_zone_delivery_fees_for_own_branch(): void
    {
        $tokenA = $this->createValidFirebaseToken('merch-uid-A', 'merchantA@ordarat.com');

        // 1. List zones
        $listResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson("/api/merchant/stores/{$this->storeA->id}/branches/{$this->branchA->id}/zones");

        $listResponse->assertStatus(200)
            ->assertJsonPath('data.pricing_policy', 'STORE_OWNER_PRICED');

        // 2. Set custom fees: 18.50 for Downtown, 25.00 for Maana
        $updateResponse = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->putJson("/api/merchant/stores/{$this->storeA->id}/branches/{$this->branchA->id}/zones", [
                'fees' => [
                    ['zone_id' => $this->zoneDowntown->id, 'delivery_fee' => 18.50, 'is_served' => true],
                    ['zone_id' => $this->zoneMaana->id, 'delivery_fee' => 25.00, 'is_served' => true],
                ],
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('branch_zone_fees', [
            'branch_id' => $this->branchA->id,
            'zone_id' => $this->zoneDowntown->id,
            'delivery_fee' => 18.50,
            'is_served' => true,
        ]);

        $this->assertDatabaseHas('branch_zone_fees', [
            'branch_id' => $this->branchA->id,
            'zone_id' => $this->zoneMaana->id,
            'delivery_fee' => 25.00,
            'is_served' => true,
        ]);
    }

    public function test_checkout_uses_exact_delivery_fee_set_by_store_owner(): void
    {
        // Store owner sets delivery fee to 22.00 EGP
        $this->branchA->zoneFees()->create([
            'zone_id' => $this->zoneDowntown->id,
            'delivery_fee' => 22.00,
            'is_served' => true,
        ]);

        $tokenCustomer = $this->createValidFirebaseToken('customer-uid-qena', 'customer@ordarat.com');

        $payload = [
            'store_id' => $this->storeA->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$tokenCustomer}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.delivery_fee', '22.00')
            ->assertJsonPath('data.items_total', '100.00')
            ->assertJsonPath('data.grand_total', '122.00');
    }

    public function test_checkout_rejects_if_store_owner_does_not_serve_zone(): void
    {
        // Store owner explicitly marks this zone as not served
        $this->branchA->zoneFees()->create([
            'zone_id' => $this->zoneDowntown->id,
            'delivery_fee' => 30.00,
            'is_served' => false,
        ]);

        $tokenCustomer = $this->createValidFirebaseToken('customer-uid-qena', 'customer@ordarat.com');

        $payload = [
            'store_id' => $this->storeA->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$tokenCustomer}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'CHECKOUT_FAILED');
        $this->assertStringContainsString('لا يوفر التوصيل', $response->json('error.message'));
    }

    public function test_merchant_cannot_modify_zone_fees_of_another_stores_branch(): void
    {
        $tokenB = $this->createValidFirebaseToken('merch-uid-B', 'merchantB@ordarat.com');

        $response = $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->putJson("/api/merchant/stores/{$this->storeA->id}/branches/{$this->branchA->id}/zones", [
                'fees' => [
                    ['zone_id' => $this->zoneDowntown->id, 'delivery_fee' => 5.00, 'is_served' => true],
                ],
            ]);

        $response->assertStatus(403);
    }
}
