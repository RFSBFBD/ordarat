<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Store;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

class SecurityHardeningTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected User $customer;

    protected Store $store;

    protected Branch $branch;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'sec-customer-uid',
            'email' => 'sec-customer@ordarat.com',
            'status' => 'active',
        ]);

        $this->store = Store::factory()->create(['name' => 'مطعم الأمان', 'is_active' => true]);
        $this->branch = $this->store->branches()->create([
            'name' => 'فرع قنا',
            'address' => 'قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'is_active' => true,
        ]);

        $zone = Zone::create(['name' => 'قنا', 'is_active' => true]);
        $this->branch->zoneFees()->create(['zone_id' => $zone->id, 'delivery_fee' => 10.00, 'is_served' => true]);

        $this->product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'ساندوتش',
            'price' => 30.00,
            'is_available' => true,
        ]);
    }

    public function test_all_api_responses_include_security_headers(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200);
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'geolocation=(self)');
    }

    public function test_checkout_rate_limiter_blocks_excessive_submissions(): void
    {
        SystemSetting::set('order_rate_limit_per_minute', 2);

        $token = $this->createValidFirebaseToken('sec-customer-uid', 'sec-customer@ordarat.com');

        $payload = [
            'store_id' => $this->store->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
        ];

        // 1st request -> OK
        $res1 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', array_merge($payload, ['idempotency_key' => (string) Str::uuid()]));
        $res1->assertStatus(201);

        // 2nd request -> OK
        $res2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', array_merge($payload, ['idempotency_key' => (string) Str::uuid()]));
        $res2->assertStatus(201);

        // 3rd request -> Rate limited (429)
        $res3 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', array_merge($payload, ['idempotency_key' => (string) Str::uuid()]));
        $res3->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMITED');
    }

    public function test_sql_injection_and_tampered_payload_resistance(): void
    {
        $token = $this->createValidFirebaseToken('sec-customer-uid', 'sec-customer@ordarat.com');

        $payload = [
            'store_id' => $this->store->id,
            'items' => [['product_id' => '1; DROP TABLE users; --', 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'idempotency_key' => (string) Str::uuid(),
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/checkout', $payload);

        $response->assertStatus(422);
        $this->assertDatabaseHas('stores', ['id' => $this->store->id]);
    }
}
