<?php

namespace Tests\Feature;

use App\Models\MerchantApplication;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;
use Tests\Traits\CreatesFirebaseTokens;

/**
 * End-to-end verification of the unified sign-in flow rules:
 *  - customer area + location are stored for the CUSTOMER profile too;
 *  - a visitor who skips onboarding gets their data saved at first order;
 *  - a pending business applicant has no privileged access at all;
 *  - the admin sees visitors and business applicants in separate records.
 */
class UnifiedFlowVerificationTest extends TestCase
{
    use CreatesFirebaseTokens;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupFirebaseMock();
    }

    public function test_customer_completion_persists_area_and_location(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
            'status' => 'active',
            'onboarding_state' => 'new',
        ]);

        $this->actingAs($user)->postJson('/api/onboarding/customer', [
            'name' => 'محمد أحمد',
            'phone' => '01012345678',
            'address' => 'شارع الجمهورية، جنب مسجد النور',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
        ])->assertStatus(200);

        $user->refresh();
        $this->assertSame('شارع الجمهورية، جنب مسجد النور', $user->address);
        $this->assertEquals(26.1642, (float) $user->latitude);
        $this->assertEquals(32.7181, (float) $user->longitude);
        $this->assertNotNull($user->profile_completed_at);
    }

    public function test_new_account_data_is_saved_to_profile_at_first_order(): void
    {
        [$store, $product] = $this->makeOrderableStore();

        $user = User::factory()->create([
            'role' => 'customer',
            'firebase_uid' => 'skipper-uid-qena',
            'email' => 'skipper_qena@example.com',
            'phone' => null,
            'status' => 'active',
            'onboarding_state' => 'new',
            'profile_completed_at' => null,
        ]);

        // Deferring is no longer possible: the first-time form is mandatory
        $this->actingAs($user)->postJson('/api/onboarding/skip')->assertStatus(422);
        $this->assertNull($user->fresh()->profile_completed_at);

        // First real order: the confirmed checkout data lands in the profile
        $token = $this->createValidFirebaseToken('skipper-uid-qena', 'skipper_qena@example.com');
        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/checkout', [
            'store_id' => $store->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01098765432',
            'name' => 'محمد المتخطي',
            'idempotency_key' => (string) Str::uuid(),
        ])->assertStatus(201);

        $user->refresh();
        $this->assertSame('محمد المتخطي', $user->name);
        $this->assertSame('01098765432', $user->phone);
        $this->assertEquals(26.1642, (float) $user->latitude);
        $this->assertEquals(32.7181, (float) $user->longitude);
        $this->assertNotNull($user->profile_completed_at);
    }

    public function test_pending_applicant_is_blocked_from_merchant_and_admin_areas(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
            'status' => 'active',
            'onboarding_state' => 'merchant_applied',
        ]);
        $user->merchantApplications()->create([
            'business_name' => 'مطعم الوردة',
            'type' => 'restaurant',
            'phone' => '01012345678',
            'address' => 'وسط البلد قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'has_branches' => false,
            'area_name' => 'وسط البلد',
            'status' => MerchantApplication::STATUS_PENDING,
        ]);

        $this->actingAs($user)->getJson('/api/merchant/stores')->assertStatus(403);
        $this->actingAs($user)->getJson('/api/branch/dashboard')->assertStatus(403);
        $this->actingAs($user)->getJson('/api/admin/stores')->assertStatus(403);
        $this->actingAs($user)->getJson('/api/admin/merchant-applications')->assertStatus(403);

        $this->assertSame('customer', $user->fresh()->role, 'pending applicant keeps the plain customer role');
    }

    public function test_admin_sees_visitors_and_business_applications_as_separate_records(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $visitor = User::factory()->create(['role' => 'customer', 'status' => 'active']);
        $merchant = User::factory()->create(['role' => 'merchant', 'status' => 'active']);
        $applicant = User::factory()->create(['role' => 'customer', 'status' => 'active']);
        $applicant->merchantApplications()->create([
            'business_name' => 'بقالة النور',
            'type' => 'grocery',
            'phone' => '01012345678',
            'address' => 'الشيخ زايد قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'has_branches' => true,
            'area_name' => 'الشيخ زايد',
            'status' => MerchantApplication::STATUS_PENDING,
        ]);

        $customersResponse = $this->actingAs($admin)->getJson('/api/admin/customers');
        $customersResponse->assertStatus(200);
        $customerIds = collect($customersResponse->json('data'))->pluck('id');
        $this->assertContains($visitor->id, $customerIds);
        $this->assertNotContains($merchant->id, $customerIds, 'business owners must not appear in the visitors list');

        $applicationsResponse = $this->actingAs($admin)->getJson('/api/admin/merchant-applications');
        $applicationsResponse->assertStatus(200);
        $applications = collect($applicationsResponse->json('data'));
        $this->assertTrue($applications->contains('business_name', 'بقالة النور'));
        $this->assertFalse($applications->contains(fn ($a) => ($a['owner']['id'] ?? null) === $visitor->id),
            'plain visitors must not appear in the business applications list');
    }

    /**
     * @return array{0: Store, 1: Product}
     */
    private function makeOrderableStore(): array
    {
        $store = Store::factory()->create([
            'name' => 'مطعم النيل قنا',
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);

        $branch = $store->branches()->create([
            'name' => 'فرع وسط البلد',
            'address' => 'شارع المحطة، قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'is_active' => true,
        ]);

        $zone = Zone::create(['name' => 'مدينة قنا - وسط البلد', 'is_active' => true]);
        $branch->zoneFees()->create([
            'zone_id' => $zone->id,
            'delivery_fee' => 15.00,
            'is_served' => true,
        ]);

        $product = Product::create([
            'store_id' => $store->id,
            'name' => 'بيتزا مشكل جبن',
            'price' => 85.50,
            'is_available' => true,
        ]);

        return [$store, $product];
    }
}
