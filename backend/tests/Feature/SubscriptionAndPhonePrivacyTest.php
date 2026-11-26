<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionAndPhonePrivacyTest extends TestCase
{
    use RefreshDatabase;

    protected function owner(Store $store): User
    {
        $u = User::factory()->create(['role' => 'merchant', 'status' => 'active']);
        $u->stores()->attach($store->id);

        return $u;
    }

    protected function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    protected function branchFor(Store $store, string $phone = '01012345678'): Branch
    {
        return Branch::create([
            'store_id' => $store->id, 'name' => 'الرئيسي', 'address' => 'قنا',
            'latitude' => 26.16, 'longitude' => 32.72, 'phone' => $phone, 'is_active' => true,
        ]);
    }

    public function test_new_business_without_subscription_cannot_add_products_or_categories(): void
    {
        $store = Store::factory()->unsubscribed()->create();
        $owner = $this->owner($store);

        $this->actingAs($owner)->postJson("/api/merchant/stores/{$store->id}/products", ['name' => 'برجر', 'price' => 50])
            ->assertStatus(403)->assertJsonPath('error.code', 'SUBSCRIPTION_REQUIRED');
        $this->actingAs($owner)->postJson("/api/merchant/stores/{$store->id}/categories", ['name' => 'وجبات'])
            ->assertStatus(403)->assertJsonPath('error.code', 'SUBSCRIPTION_REQUIRED');
        $this->assertSame(0, $store->products()->count());
    }

    public function test_store_stays_listed_publicly_without_subscription(): void
    {
        $store = Store::factory()->unsubscribed()->create(['name' => 'مطعم ظاهر']);
        $this->branchFor($store);

        $this->getJson('/api/stores')->assertOk()->assertJsonFragment(['name' => 'مطعم ظاهر']);
    }

    public function test_admin_activates_then_owner_can_add_then_ending_blocks_again(): void
    {
        $store = Store::factory()->unsubscribed()->create();
        $owner = $this->owner($store);
        $admin = $this->admin();

        $this->actingAs($admin)->patchJson("/api/admin/stores/{$store->id}/subscription", [
            'active' => true, 'starts_at' => now()->subDay()->toDateString(), 'ends_at' => now()->addMonth()->toDateString(),
        ])->assertOk()->assertJsonPath('data.subscription_active', true);

        $this->actingAs($owner)->postJson("/api/merchant/stores/{$store->id}/products", ['name' => 'برجر', 'price' => 50])->assertCreated();

        $this->actingAs($admin)->patchJson("/api/admin/stores/{$store->id}/subscription", ['active' => false])
            ->assertOk()->assertJsonPath('data.subscription_active', false);
        $this->actingAs($owner)->postJson("/api/merchant/stores/{$store->id}/products", ['name' => 'بيتزا', 'price' => 60])->assertStatus(403);
        $this->assertDatabaseHas('audit_logs', ['action' => 'ACTIVATE_SUBSCRIPTION']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'END_SUBSCRIPTION']);
    }

    public function test_expired_and_future_subscriptions_do_not_count(): void
    {
        $store = Store::factory()->create(['subscription_starts_at' => now()->subMonth()->toDateString(), 'subscription_ends_at' => now()->subDay()->toDateString()]);
        $this->assertFalse($store->hasActiveSubscription());
        $store->update(['subscription_starts_at' => now()->addDay()->toDateString(), 'subscription_ends_at' => null]);
        $this->assertFalse($store->fresh()->hasActiveSubscription());
        $store->update(['subscription_starts_at' => now()->toDateString(), 'subscription_ends_at' => now()->toDateString()]);
        $this->assertTrue($store->fresh()->hasActiveSubscription());
    }

    public function test_subscription_endpoint_is_admin_only_and_validates_dates(): void
    {
        $store = Store::factory()->unsubscribed()->create();
        $owner = $this->owner($store);

        $this->actingAs($owner)->patchJson("/api/admin/stores/{$store->id}/subscription", ['active' => true])->assertStatus(403);
        $this->actingAs($this->admin())->patchJson("/api/admin/stores/{$store->id}/subscription", [
            'active' => true, 'starts_at' => '2026-12-10', 'ends_at' => '2026-12-01',
        ])->assertStatus(422);
        $this->assertFalse($store->fresh()->hasActiveSubscription());
    }

    public function test_business_phone_is_hidden_from_visitors_customers_and_other_businesses_but_not_admin_or_owner(): void
    {
        $store = Store::factory()->create(['name' => 'مطعم الهاتف']);
        $this->branchFor($store, '01099998888');
        $other = Store::factory()->create();
        $this->branchFor($other, '01011112222');

        $this->getJson('/api/stores')->assertOk();
        $this->assertStringNotContainsString('01099998888', $this->getJson('/api/stores')->getContent());
        $this->assertStringNotContainsString('subscription_ends_at', $this->getJson('/api/stores')->getContent());
        $this->assertStringNotContainsString('01099998888', $this->getJson("/api/stores/{$store->id}")->getContent());

        $customer = User::factory()->create(['role' => 'customer', 'status' => 'active']);
        $this->assertStringNotContainsString('01099998888', $this->actingAs($customer)->getJson("/api/stores/{$store->id}")->getContent());

        $stranger = $this->owner($other);
        $this->assertStringNotContainsString('01099998888', $this->actingAs($stranger)->getJson("/api/stores")->getContent());

        $this->assertStringContainsString('01099998888', $this->actingAs($this->admin())->getJson('/api/admin/stores')->getContent());
        $this->assertStringContainsString('01099998888', $this->actingAs($this->owner($store))->getJson("/api/merchant/stores/{$store->id}/branches")->getContent());
    }

    public function test_application_needs_opening_hours_and_approval_copies_them_without_a_subscription(): void
    {
        $user = User::factory()->create(['role' => 'customer', 'status' => 'active', 'onboarding_state' => 'new']);
        $payload = [
            'business_name' => 'مطعم الصعيد', 'type' => 'restaurant', 'phone' => '01012345678', 'address' => 'شارع الجمهورية',
            'latitude' => 26.1642, 'longitude' => 32.7181, 'has_branches' => false, 'area_name' => 'المنشية',
            'logo' => self::logoDataUrl(), 'commercial_register' => 'CR-7788-ZZ',
        ];
        $this->actingAs($user)->postJson('/api/onboarding/merchant-application', $payload)->assertStatus(422);
        $res = $this->actingAs($user)->postJson('/api/onboarding/merchant-application', $payload + ['opens_at' => '09:00', 'closes_at' => '23:30']);
        $res->assertStatus(201);
        $this->actingAs($user)->postJson('/api/onboarding/merchant-application', $payload + ['opens_at' => '25:00', 'closes_at' => '23:30'])->assertStatus(422);

        $this->actingAs($this->admin())->postJson('/api/admin/merchant-applications/'.$res->json('data.id').'/approve')->assertOk();
        $store = Store::where('name', 'مطعم الصعيد')->firstOrFail();
        $this->assertSame(['from' => '09:00', 'to' => '23:30'], $store->working_hours);
        $this->assertSame('CR-7788-ZZ', $store->commercial_register);
        $this->assertFalse($store->hasActiveSubscription());
        $this->assertTrue($store->is_active);
        $this->assertStringNotContainsString('CR-7788-ZZ', $this->getJson('/api/stores')->getContent());
    }
}
