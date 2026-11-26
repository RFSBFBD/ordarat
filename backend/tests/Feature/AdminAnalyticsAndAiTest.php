<?php

namespace Tests\Feature;

use App\Models\AiProviderSetting;
use App\Models\Branch;
use App\Models\MenuDraftItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminAnalyticsAndAiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $merchant;

    protected User $otherMerchant;

    protected User $branchManager;

    protected User $customer;

    protected Store $store;

    protected Store $otherStore;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'name' => 'مدير المنصة',
            'email' => 'admin@ordarat.com',
            'phone' => '01011111111',
        ]);

        $this->merchant = User::factory()->create([
            'role' => 'merchant',
            'status' => 'active',
            'name' => 'صاحب مطعم الكرنك',
            'email' => 'merchant@karank.com',
            'phone' => '01022222222',
        ]);

        $this->otherMerchant = User::factory()->create([
            'role' => 'merchant',
            'status' => 'active',
            'name' => 'تاجر آخر',
            'email' => 'other@store.com',
            'phone' => '01033333333',
        ]);

        $this->branchManager = User::factory()->create([
            'role' => 'branch_manager',
            'status' => 'active',
            'name' => 'مسؤول فرع وسط البلد',
            'email' => 'manager@karank.com',
            'phone' => '01044444444',
        ]);

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'status' => 'active',
            'name' => 'محمود حسن',
            'email' => 'customer@qena.com',
            'phone' => '01055555555',
        ]);

        $this->store = Store::create([
            'name' => 'مطعم الكرنك الأصيل',
            'slug' => 'karank-restaurant',
            'type' => 'restaurant',
            'owner_id' => $this->merchant->id,
            'is_active' => true,
            'subscription_starts_at' => now()->subDay()->toDateString(),
        ]);
        $this->merchant->stores()->attach($this->store->id);

        $this->otherStore = Store::create([
            'name' => 'بقالة الأمانة',
            'slug' => 'amana-grocery',
            'type' => 'grocery',
            'owner_id' => $this->otherMerchant->id,
            'is_active' => true,
            'subscription_starts_at' => now()->subDay()->toDateString(),
        ]);
        $this->otherMerchant->stores()->attach($this->otherStore->id);

        $this->branch = Branch::create([
            'store_id' => $this->store->id,
            'name' => 'فرع وسط البلد',
            'address' => 'ميدان المحطة، قنا',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);
        $this->branchManager->managedBranches()->attach($this->branch->id);
    }

    public function test_admin_analytics_returns_reliable_sql_numbers_and_protects_customer_privacy(): void
    {
        $zone1 = Zone::create(['name' => 'وسط البلد', 'is_active' => true]);
        $zone2 = Zone::create(['name' => 'المعنا', 'is_active' => true]);

        // Create 3 delivered orders in zone1 (meets threshold)
        for ($i = 0; $i < 3; $i++) {
            Order::create([
                'order_number' => "ORD-ZONE1-{$i}",
                'idempotency_key' => "idem-zone1-{$i}",
                'customer_id' => $this->customer->id,
                'store_id' => $this->store->id,
                'branch_id' => $this->branch->id,
                'zone_id' => $zone1->id,
                'status' => 'delivered',
                'customer_name' => $this->customer->name,
                'customer_phone' => $this->customer->phone,
                'items_total' => 100.0,
                'delivery_fee' => 10.0,
                'grand_total' => 110.0,
                'created_at' => now('Africa/Cairo'),
            ]);
        }

        // Create 1 delivered order in zone2 (below threshold < 3, should be aggregated into 'أخرى')
        Order::create([
            'order_number' => 'ORD-ZONE2-1',
            'idempotency_key' => 'idem-zone2-1',
            'customer_id' => $this->customer->id,
            'store_id' => $this->store->id,
            'branch_id' => $this->branch->id,
            'zone_id' => $zone2->id,
            'status' => 'delivered',
            'customer_name' => $this->customer->name,
            'customer_phone' => $this->customer->phone,
            'items_total' => 50.0,
            'delivery_fee' => 15.0,
            'grand_total' => 65.0,
            'created_at' => now('Africa/Cairo'),
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/analytics?period=all');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.timezone', 'Africa/Cairo')
            ->assertJsonPath('data.users.total_customers', 1)
            ->assertJsonPath('data.users.total_merchants', 2)
            ->assertJsonPath('data.users.total_branch_managers', 1)
            ->assertJsonPath('data.orders.total_orders', 4)
            ->assertJsonPath('data.orders.by_status.delivered', 4)
            ->assertJsonPath('data.cash_summary.delivered_cash_total_egp', 395)
            ->assertJsonPath('data.cash_summary.label', 'قيمة الطلبات المسلّمة (كاش عند الاستلام، غير محصّلة إلكترونيًا)');

        // Verify Privacy Aggregation: zone2 (<3) merged into 'أخرى'
        $locations = collect($response->json('data.locations_aggregated'));
        $this->assertTrue($locations->contains('zone', 'وسط البلد'));
        $this->assertTrue($locations->contains('zone', 'أخرى (مناطق متفرقة داخل قنا)'));
        $this->assertFalse($locations->contains('zone', 'المعنا')); // Direct zone hidden for privacy
    }

    public function test_non_admin_cannot_access_analytics_or_ai_settings(): void
    {
        $this->actingAs($this->merchant)->getJson('/api/admin/analytics')->assertStatus(403);
        $this->actingAs($this->branchManager)->getJson('/api/admin/analytics')->assertStatus(403);
        $this->actingAs($this->customer)->getJson('/api/admin/analytics')->assertStatus(403);

        $this->actingAs($this->merchant)->getJson('/api/admin/ai/settings')->assertStatus(403);
        $this->actingAs($this->branchManager)->getJson('/api/admin/ai/settings')->assertStatus(403);
        $this->actingAs($this->customer)->getJson('/api/admin/ai/settings')->assertStatus(403);
    }

    public function test_admin_configures_ai_settings_and_api_key_is_never_leaked(): void
    {
        $secretKey = 'sk-proj-qena-secret-api-key-9988';

        $response = $this->actingAs($this->admin)->putJson('/api/admin/ai/settings/text_analysis', [
            'provider_name' => 'mock',
            'api_key' => $secretKey,
            'is_enabled' => true,
            'cost_limit_daily_usd' => 10.00,
            'cost_limit_monthly_usd' => 150.00,
            'daily_request_limit' => 200,
            'store_daily_quota' => 50,
            'store_monthly_quota' => 500,
            'kill_switch' => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_configured', true)
            ->assertJsonPath('data.masked_key', '••••••••9988');

        // Confirm plain secret key does not appear anywhere in JSON response
        $this->assertStringNotContainsString($secretKey, $response->getContent());

        // Verify encrypted in database
        $dbRecord = AiProviderSetting::where('function_type', 'text_analysis')->first();
        $this->assertNotNull($dbRecord->encrypted_api_key);
        $this->assertNotEquals($secretKey, $dbRecord->encrypted_api_key);
        $this->assertEquals($secretKey, Crypt::decryptString($dbRecord->encrypted_api_key));

        // GET endpoint also returns only masked key
        $getRes = $this->actingAs($this->admin)->getJson('/api/admin/ai/settings');
        $getRes->assertStatus(200);
        $this->assertStringNotContainsString($secretKey, $getRes->getContent());
        $this->assertEquals('••••••••9988', $getRes->json('data.settings.text_analysis.masked_key'));
    }

    public function test_zero_budget_blocks_usage_until_configured(): void
    {
        // Default zero budget setting
        AiProviderSetting::create([
            'function_type' => 'text_analysis',
            'provider_name' => 'mock',
            'is_enabled' => true,
            'cost_limit_daily_usd' => 0.0000, // zero budget
            'daily_request_limit' => 0,
            'store_daily_quota' => 0,
            'kill_switch' => false,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/ai/analyze-platform', [
            'period' => 'all',
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'AI_ANALYSIS_FAILED');

        $this->assertStringContainsString('الخدمة دي مش متاحة دلوقتي', $response->json('error.message'));
    }

    public function test_emergency_kill_switch_blocks_all_ai_requests(): void
    {
        AiProviderSetting::create([
            'function_type' => 'text_analysis',
            'provider_name' => 'mock',
            'is_enabled' => true,
            'cost_limit_daily_usd' => 10.00,
            'daily_request_limit' => 100,
            'store_daily_quota' => 10,
            'kill_switch' => true, // Emergency Stop active
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/ai/analyze-platform', [
            'period' => 'all',
        ]);

        $response->assertStatus(400);
        $this->assertStringContainsString('تم إيقاف خدمات الذكاء الاصطناعي لحالة طوارئ', $response->json('error.message'));
    }

    public function test_admin_can_freeze_ai_for_specific_store(): void
    {
        AiProviderSetting::create([
            'function_type' => 'image_generation',
            'provider_name' => 'mock',
            'is_enabled' => true,
            'cost_limit_daily_usd' => 10.00,
            'daily_request_limit' => 100,
            'store_daily_quota' => 10,
            'kill_switch' => false,
        ]);

        // Freeze store
        $freezeRes = $this->actingAs($this->admin)->patchJson("/api/admin/ai/stores/{$this->store->id}/freeze", [
            'is_frozen' => true,
            'reason' => 'مخالفة معايير الاستخدام',
        ]);
        $freezeRes->assertStatus(200);

        // Merchant attempts to generate image -> blocked!
        $genRes = $this->actingAs($this->merchant)->postJson("/api/merchant/stores/{$this->store->id}/ai/generate-product-image", [
            'product_name' => 'وجبة مشاوي',
        ]);

        $genRes->assertStatus(400);
        $this->assertStringContainsString('تم إيقاف استخدام ميزات الذكاء الاصطناعي لهذا المتجر', $genRes->json('error.message'));
    }

    public function test_store_owner_can_extract_menu_draft_review_and_import(): void
    {
        // Enable OCR menu setting
        AiProviderSetting::create([
            'function_type' => 'image_ocr_menu',
            'provider_name' => 'mock',
            'is_enabled' => true,
            'cost_limit_daily_usd' => 20.00,
            'daily_request_limit' => 50,
            'store_daily_quota' => 10,
            'kill_switch' => false,
        ]);

        $fakeImage = UploadedFile::fake()->image('menu.jpg', 600, 800);

        // 1. Merchant extracts menu draft
        $response = $this->actingAs($this->merchant)->postJson("/api/merchant/stores/{$this->store->id}/ai/ocr-menu", [
            'image' => $fakeImage,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $draftId = $response->json('data.id');
        $this->assertNotNull($draftId);

        // Verify draft items created with needs_review: true
        $items = MenuDraftItem::where('menu_draft_id', $draftId)->get();
        $this->assertCount(3, $items);
        foreach ($items as $item) {
            $this->assertTrue($item->needs_review);
        }

        // 2. Other merchant cannot access or edit this draft (Store Isolation)
        $this->actingAs($this->otherMerchant)
            ->getJson("/api/merchant/stores/{$this->store->id}/ai/menu-drafts")
            ->assertStatus(403);

        // 3. Merchant reviews & accepts first item, edits ambiguous item price
        $firstItem = $items->firstWhere('is_ambiguous', false);
        $ambiguousItem = $items->firstWhere('is_ambiguous', true);

        $this->actingAs($this->merchant)->patchJson("/api/merchant/stores/{$this->store->id}/ai/menu-draft-items/{$firstItem->id}", [
            'status' => 'accepted',
        ])->assertStatus(200);

        $this->actingAs($this->merchant)->patchJson("/api/merchant/stores/{$this->store->id}/ai/menu-draft-items/{$ambiguousItem->id}", [
            'price' => 75.00,
            'status' => 'accepted',
        ])->assertStatus(200);

        // 4. Import accepted draft items into actual products table
        $importRes = $this->actingAs($this->merchant)->postJson("/api/merchant/stores/{$this->store->id}/ai/menu-drafts/{$draftId}/import");
        $importRes->assertStatus(200)
            ->assertJsonPath('imported_count', 2);

        $this->assertDatabaseHas('products', [
            'store_id' => $this->store->id,
            'name' => $firstItem->name,
        ]);
        $this->assertDatabaseHas('products', [
            'store_id' => $this->store->id,
            'name' => $ambiguousItem->name,
            'price' => '75.00',
        ]);
    }

    public function test_product_image_generation_and_name_normalization_deduplication(): void
    {
        AiProviderSetting::create([
            'function_type' => 'image_generation',
            'provider_name' => 'mock',
            'is_enabled' => true,
            'cost_limit_daily_usd' => 15.00,
            'daily_request_limit' => 100,
            'store_daily_quota' => 20,
            'kill_switch' => false,
        ]);

        $product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'طاجن بامية باللحم',
            'price' => 85.00,
            'is_available' => true,
        ]);

        // 1. First generation
        $res1 = $this->actingAs($this->merchant)->postJson("/api/merchant/stores/{$this->store->id}/ai/generate-product-image", [
            'product_name' => 'طَاجِن بَامْيَة بِاللَّحْمِ', // With tashkeel
            'product_id' => $product->id,
        ]);

        $res1->assertStatus(200)
            ->assertJsonPath('data.is_illustrative', true)
            ->assertJsonPath('data.cached', false);

        $imageId = $res1->json('data.id');

        // 2. Second generation with same name but without tashkeel and with extra spaces
        $res2 = $this->actingAs($this->merchant)->postJson("/api/merchant/stores/{$this->store->id}/ai/generate-product-image", [
            'product_name' => '  طاجن   باميه   باللحم  ',
            'product_id' => $product->id,
        ]);

        $res2->assertStatus(200)
            ->assertJsonPath('data.cached', true)
            ->assertJsonPath('data.id', $imageId); // Exact same image reused via deduplication cache!

        // 3. Human Approval Workflow: approve image to attach it to product
        $approveRes = $this->actingAs($this->merchant)->postJson("/api/merchant/stores/{$this->store->id}/ai/images/{$imageId}/approve", [
            'product_id' => $product->id,
        ]);

        $approveRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $product->refresh();
        $this->assertNotNull($product->image_url);
        $this->assertEquals($res1->json('data.image_url'), $product->image_url);
    }
}
