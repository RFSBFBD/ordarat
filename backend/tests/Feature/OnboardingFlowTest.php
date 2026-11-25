<?php

namespace Tests\Feature;

use App\Models\MerchantApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function customer(): User
    {
        return User::factory()->create([
            'role' => 'customer',
            'status' => 'active',
            'onboarding_state' => 'new',
        ]);
    }

    protected function admin(): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_customer_completes_profile_with_egyptian_phone_and_qena_location(): void
    {
        $user = $this->customer();

        $response = $this->actingAs($user)->postJson('/api/onboarding/customer', [
            'name' => 'محمد أحمد',
            'phone' => '01012345678',
            'address' => 'شارع الجمهورية',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.profile_complete', true);

        $user->refresh();
        $this->assertNotNull($user->profile_completed_at);
        $this->assertSame('customer', $user->onboarding_state);
        $this->assertSame('01012345678', $user->phone);
    }

    public function test_customer_profile_rejects_non_egyptian_phone(): void
    {
        $response = $this->actingAs($this->customer())->postJson('/api/onboarding/customer', [
            'name' => 'محمد أحمد',
            'phone' => '12345',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
        ]);

        $response->assertStatus(422);
    }

    public function test_customer_profile_rejects_location_outside_qena(): void
    {
        $response = $this->actingAs($this->customer())->postJson('/api/onboarding/customer', [
            'name' => 'محمد أحمد',
            'phone' => '01012345678',
            'latitude' => 30.0444, // Cairo
            'longitude' => 31.2357,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'OUT_OF_COVERAGE');
    }

    public function test_first_time_form_cannot_be_skipped(): void
    {
        $user = $this->customer();

        $this->actingAs($user)->postJson('/api/onboarding/skip')
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'PROFILE_REQUIRED');

        $this->assertSame('new', $user->fresh()->onboarding_state);
        $this->assertNull($user->fresh()->profile_completed_at);
    }

    public function test_merchant_application_is_stored_pending_without_any_role_grant(): void
    {
        $user = $this->customer();

        $response = $this->actingAs($user)->postJson('/api/onboarding/merchant-application', [
            'business_name' => 'مطعم الوردة',
            'type' => 'restaurant',
            'phone' => '01012345678',
            'address' => 'وسط البلد قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'has_branches' => false,
            'area_name' => 'وسط البلد',
            'logo' => \Tests\TestCase::logoDataUrl(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending');

        $user->refresh();
        $this->assertSame('customer', $user->role, 'Choosing business in the UI must never grant the merchant role');
        $this->assertSame('merchant_applied', $user->onboarding_state);
        $this->assertDatabaseHas('merchant_applications', [
            'user_id' => $user->id,
            'business_name' => 'مطعم الوردة',
            'status' => 'pending',
        ]);
    }

    public function test_second_pending_application_is_rejected(): void
    {
        $user = $this->customer();
        $user->merchantApplications()->create([
            'business_name' => 'مطعم الوردة',
            'type' => 'restaurant',
            'phone' => '01012345678',
            'address' => 'وسط البلد',
            'latitude' => 26.16,
            'longitude' => 32.71,
            'has_branches' => false,
            'area_name' => 'وسط البلد',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($user)->postJson('/api/onboarding/merchant-application', [
            'business_name' => 'بقالة النور',
            'type' => 'grocery',
            'phone' => '01012345678',
            'address' => 'الشيخ زايد',
            'latitude' => 26.16,
            'longitude' => 32.71,
            'has_branches' => true,
            'area_name' => 'الشيخ زايد',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'APPLICATION_ALREADY_PENDING');
    }

    public function test_admin_approval_creates_store_branch_and_grants_role(): void
    {
        $admin = $this->admin();
        $user = $this->customer();
        $application = $user->merchantApplications()->create([
            'business_name' => 'بقالة النور',
            'type' => 'grocery',
            'phone' => '01012345678',
            'address' => 'الشيخ زايد قنا',
            'latitude' => 26.16,
            'longitude' => 32.71,
            'has_branches' => true,
            'area_name' => 'الشيخ زايد',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/api/admin/merchant-applications/{$application->id}/approve");

        $response->assertStatus(200);
        $user->refresh();
        $this->assertSame('merchant', $user->role);
        $this->assertSame('approved', $application->fresh()->status);
        $this->assertDatabaseHas('stores', ['name' => 'بقالة النور', 'type' => 'grocery']);
        $this->assertDatabaseHas('branches', ['name' => 'الفرع الرئيسي', 'address' => 'الشيخ زايد قنا']);
        $this->assertSame(1, $user->stores()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'APPROVE_MERCHANT_APPLICATION']);
    }

    public function test_admin_rejection_requires_note_and_keeps_user_customer(): void
    {
        $admin = $this->admin();
        $user = $this->customer();
        $application = $user->merchantApplications()->create([
            'business_name' => 'مطعم الوردة',
            'type' => 'restaurant',
            'phone' => '01012345678',
            'address' => 'وسط البلد',
            'latitude' => 26.16,
            'longitude' => 32.71,
            'has_branches' => false,
            'area_name' => 'وسط البلد',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)->postJson("/api/admin/merchant-applications/{$application->id}/reject", [])
            ->assertStatus(422);

        $response = $this->actingAs($admin)->postJson("/api/admin/merchant-applications/{$application->id}/reject", [
            'note' => 'العنوان خارج نطاق الخدمة',
        ]);

        $response->assertStatus(200);
        $this->assertSame('rejected', $application->fresh()->status);
        $this->assertSame('العنوان خارج نطاق الخدمة', $application->fresh()->admin_note);
        $this->assertSame('customer', $user->fresh()->role);
    }

    public function test_non_admin_cannot_review_applications(): void
    {
        $user = $this->customer();
        $application = $user->merchantApplications()->create([
            'business_name' => 'مطعم الوردة',
            'type' => 'restaurant',
            'phone' => '01012345678',
            'address' => 'وسط البلد',
            'latitude' => 26.16,
            'longitude' => 32.71,
            'has_branches' => false,
            'area_name' => 'وسط البلد',
            'status' => 'pending',
        ]);

        $this->actingAs($user)->postJson("/api/admin/merchant-applications/{$application->id}/approve")
            ->assertStatus(403);

        $this->actingAs($user)->getJson('/api/admin/merchant-applications')
            ->assertStatus(403);
    }

    public function test_checkout_persists_profile_data_for_deferred_customer(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $user = User::factory()->create([
            'role' => 'customer',
            'status' => 'active',
            'onboarding_state' => 'new',
            'profile_completed_at' => null,
        ]);

        $store = \App\Models\Store::where('is_active', true)->first();
        $product = $store->products()->first();

        $response = $this->actingAs($user)->postJson('/api/checkout', [
            'store_id' => $store->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'phone' => '01012345678',
            'name' => 'محمد أحمد',
            'idempotency_key' => 'test-onboarding-checkout-1',
        ]);

        $response->assertStatus(201);

        $user->refresh();
        $this->assertNotNull($user->profile_completed_at, 'Order time completion must persist the profile');
        $this->assertSame('01012345678', $user->phone);
        $this->assertSame('محمد أحمد', $user->name);
        $this->assertSame('customer', $user->onboarding_state);
    }
}
