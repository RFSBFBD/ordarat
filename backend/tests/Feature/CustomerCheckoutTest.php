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

class CustomerCheckoutTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $customer;

    protected Store $store;

    protected Branch $branchDowntown;

    protected Branch $branchMaana;

    protected Zone $zone;

    protected Product $productPizza;

    protected Product $productBurger;

    protected Product $productFinished;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'customer-uid-qena',
            'email' => 'customer_qena@example.com',
            'phone' => '01012345678',
            'status' => 'active',
        ]);

        $this->store = Store::factory()->create([
            'name' => 'مطعم النيل قنا',
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);

        // Branch 1: Downtown Qena (26.1642, 32.7181)
        $this->branchDowntown = $this->store->branches()->create([
            'name' => 'فرع وسط البلد',
            'address' => 'شارع المحطة، قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'is_active' => true,
        ]);

        // Branch 2: El-Maana (26.1850, 32.7400)
        $this->branchMaana = $this->store->branches()->create([
            'name' => 'فرع المعنا',
            'address' => 'طريق المعنا، قنا',
            'latitude' => 26.1850,
            'longitude' => 32.7400,
            'is_active' => true,
        ]);

        $this->zone = Zone::create([
            'name' => 'مدينة قنا - وسط البلد',
            'is_active' => true,
        ]);

        $this->branchDowntown->zoneFees()->create([
            'zone_id' => $this->zone->id,
            'delivery_fee' => 15.00,
            'is_served' => true,
        ]);

        $this->productPizza = Product::create([
            'store_id' => $this->store->id,
            'name' => 'بيتزا مشكل جبن',
            'price' => 85.50,
            'is_available' => true,
        ]);

        $this->productBurger = Product::create([
            'store_id' => $this->store->id,
            'name' => 'برجر لحم بلدي',
            'price' => 50.00,
            'is_available' => true,
        ]);

        $this->productFinished = Product::create([
            'store_id' => $this->store->id,
            'name' => 'شاورما لحمة (خلصان)',
            'price' => 60.00,
            'is_available' => false,
        ]);
    }

    public function test_guest_can_preview_quote_with_items_total_and_zone_delivery_fee(): void
    {
        $payload = [
            'store_id' => $this->store->id,
            'items' => [
                ['product_id' => $this->productPizza->id, 'quantity' => 2], // 85.50 * 2 = 171.00
                ['product_id' => $this->productBurger->id, 'quantity' => 1], // 50.00 * 1 = 50.00
            ],
            // Location near downtown Qena
            'delivery_latitude' => 26.1650,
            'delivery_longitude' => 32.7190,
        ];

        $response = $this->postJson('/api/checkout/quote', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.items_total', '221.00')
            ->assertJsonPath('data.delivery_fee', '15.00')
            ->assertJsonPath('data.grand_total', '236.00')
            ->assertJsonPath('data.payment_method', 'COD')
            ->assertJsonPath('data.branch.id', $this->branchDowntown->id);
    }

    public function test_coordinates_outside_qena_city_are_rejected(): void
    {
        // Cairo coordinates (30.0444, 31.2357)
        $payload = [
            'store_id' => $this->store->id,
            'items' => [
                ['product_id' => $this->productPizza->id, 'quantity' => 1],
            ],
            'delivery_latitude' => 30.0444,
            'delivery_longitude' => 31.2357,
        ];

        $response = $this->postJson('/api/checkout/quote', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'CHECKOUT_QUOTE_FAILED')
            ->assertJsonPath('error.message', 'خدمة أوردرات متاحة فقط داخل نطاق مدينة قنا حالياً');
    }

    public function test_order_submission_recalculates_prices_server_side_ignoring_tampered_client_prices(): void
    {
        $token = $this->createValidFirebaseToken('customer-uid-qena', 'customer_qena@example.com');
        $idempotencyKey = (string) Str::uuid();

        // Client attempts to pass a fake low price or grand_total
        $payload = [
            'store_id' => $this->store->id,
            'items' => [
                ['product_id' => $this->productPizza->id, 'quantity' => 1, 'price' => 1.00], // Client claims 1 EGP! Real price is 85.50
            ],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'customer_notes' => 'شقة 3 الدور الثاني',
            'idempotency_key' => $idempotencyKey,
            'grand_total' => 5.00, // Client claims grand total is 5 EGP
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        // Server recalculates: 85.50 + 15.00 = 100.50
        $this->assertEquals('85.50', $response->json('data.items_total'));
        $this->assertEquals('15.00', $response->json('data.delivery_fee'));
        $this->assertEquals('100.50', $response->json('data.grand_total'));
        $this->assertEquals('COD', $response->json('data.payment_method'));

        $this->assertDatabaseHas('orders', [
            'idempotency_key' => $idempotencyKey,
            'customer_id' => $this->customer->id,
            'items_total' => 85.50,
            'delivery_fee' => 15.00,
            'grand_total' => 100.50,
            'payment_method' => 'COD',
            'status' => 'new',
        ]);
    }

    public function test_order_submission_fails_if_product_is_finished(): void
    {
        $token = $this->createValidFirebaseToken('customer-uid-qena', 'customer_qena@example.com');

        $payload = [
            'store_id' => $this->store->id,
            'items' => [
                ['product_id' => $this->productFinished->id, 'quantity' => 1],
            ],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'CHECKOUT_FAILED');
        $this->assertStringContainsString('خلصان', $response->json('error.message'));
    }

    public function test_invalid_phone_number_is_rejected(): void
    {
        $token = $this->createValidFirebaseToken('customer-uid-qena', 'customer_qena@example.com');

        $payload = [
            'store_id' => $this->store->id,
            'items' => [
                ['product_id' => $this->productPizza->id, 'quantity' => 1],
            ],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01412345678', // Invalid carrier prefix
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(422);
    }

    public function test_idempotency_key_prevents_duplicate_orders(): void
    {
        $token = $this->createValidFirebaseToken('customer-uid-qena', 'customer_qena@example.com');
        $idempotencyKey = 'fixed-uuid-'.Str::random(10);

        $payload = [
            'store_id' => $this->store->id,
            'items' => [
                ['product_id' => $this->productPizza->id, 'quantity' => 1],
            ],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'idempotency_key' => $idempotencyKey,
        ];

        // 1st call: creates order
        $firstResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', $payload);
        $firstResponse->assertStatus(201);
        $orderId = $firstResponse->json('data.id');
        $orderNumber = $firstResponse->json('data.order_number');

        // 2nd call: returns existing order without creating a duplicate
        $secondResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', $payload);
        $secondResponse->assertStatus(200);
        $this->assertEquals($orderId, $secondResponse->json('data.id'));
        $this->assertEquals($orderNumber, $secondResponse->json('data.order_number'));

        // Database only has 1 order for this idempotency key
        $this->assertEquals(1, Order::where('idempotency_key', $idempotencyKey)->count());
    }

    public function test_order_routes_to_closest_branch(): void
    {
        $token = $this->createValidFirebaseToken('customer-uid-qena', 'customer_qena@example.com');

        // Customer coordinate very close to El-Maana branch (26.1850, 32.7400)
        $payload = [
            'store_id' => $this->store->id,
            'items' => [
                ['product_id' => $this->productBurger->id, 'quantity' => 2],
            ],
            'delivery_latitude' => 26.1860,
            'delivery_longitude' => 32.7410,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.branch_id', $this->branchMaana->id);
    }
}
