<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\BranchZoneFee;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\Store;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // This seeder creates DEMO data only: demo users with a known password,
        // sample stores, products, zones and orders. It must never run in a
        // production deployment unless explicitly requested for a controlled
        // demo environment.
        if (app()->environment('production') && ! filter_var(env('SEED_DEMO_DATA', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->command?->warn('Demo seeder skipped in production. Set SEED_DEMO_DATA=true only for a disposable demo environment.');
            return;
        }

        // The demo password can be overridden with SEED_DEMO_PASSWORD; the
        // fallback is only reachable outside production (see the guard above).
        $demoPassword = env('SEED_DEMO_PASSWORD', 'password123');

        // 1. Users
        $admin = User::create([
            'name' => 'أدمن أوردرات (تجريبي)',
            'email' => 'admin@ordarat-qena.local',
            'phone' => '01000000001',
            'role' => 'admin',
            'status' => 'active',
            'password' => Hash::make($demoPassword),
        ]);

        $merchantA = User::create([
            'name' => 'صاحب مطعم الكرنك (تجريبي)',
            'email' => 'karnak@ordarat-qena.local',
            'phone' => '01011111111',
            'role' => 'merchant',
            'status' => 'active',
            'password' => Hash::make($demoPassword),
        ]);

        $merchantB = User::create([
            'name' => 'صاحب بقالة الأمانة (تجريبي)',
            'email' => 'amana@ordarat-qena.local',
            'phone' => '01022222222',
            'role' => 'merchant',
            'status' => 'active',
            'password' => Hash::make($demoPassword),
        ]);

        $customerA = User::create([
            'name' => 'عميل قنا أ (تجريبي)',
            'email' => 'customer_a@ordarat-qena.local',
            'phone' => '01033333333',
            'role' => 'customer',
            'status' => 'active',
            'password' => Hash::make($demoPassword),
        ]);

        $customerB = User::create([
            'name' => 'عميل قنا ب (تجريبي)',
            'email' => 'customer_b@ordarat-qena.local',
            'phone' => '01044444444',
            'role' => 'customer',
            'status' => 'active',
            'password' => Hash::make($demoPassword),
        ]);

        $branchManager = User::create([
            'name' => 'مدير فرع وسط البلد (تجريبي)',
            'email' => 'branch.manager@ordarat-qena.local',
            'phone' => '01066666666',
            'role' => 'branch_manager',
            'status' => 'active',
            'password' => Hash::make($demoPassword),
        ]);

        $suspendedCustomer = User::create([
            'name' => 'عميل معطل (تجريبي)',
            'email' => 'suspended@ordarat-qena.local',
            'phone' => '01055555555',
            'role' => 'customer',
            'status' => 'suspended',
            'password' => Hash::make($demoPassword),
        ]);

        // 2. Stores & Branches
        $restaurant = Store::create([
            'type' => 'restaurant',
            'name' => 'مطعم الكرنك (تجريبي - قنا)',
            'is_active' => true,
            'is_accepting_orders' => true,
            'working_hours' => [
                'from' => '11:00',
                'to' => '01:00',
            ],
        ]);
        $restaurant->users()->attach($merchantA->id);

        $grocery = Store::create([
            'type' => 'grocery',
            'name' => 'بقالة الأمانة (تجريبي - قنا)',
            'is_active' => true,
            'is_accepting_orders' => true,
            'working_hours' => [
                'from' => '08:00',
                'to' => '23:00',
            ],
        ]);
        $grocery->users()->attach($merchantB->id);

        $branchA = Branch::create([
            'store_id' => $restaurant->id,
            'name' => 'فرع وسط البلد (تجريبي)',
            'address' => 'شارع المحطة، مدينة قنا',
            'latitude' => 26.1550,
            'longitude' => 32.7160,
            'phone' => '01011111111',
            'is_active' => true,
        ]);

        $branchB = Branch::create([
            'store_id' => $grocery->id,
            'name' => 'فرع الشؤون (تجريبي)',
            'address' => 'ميدان الشؤون، مدينة قنا',
            'latitude' => 26.1620,
            'longitude' => 32.7210,
            'phone' => '01022222222',
            'is_active' => true,
        ]);

        // Link the demo branch manager to the restaurant's downtown branch
        $branchManager->managedBranches()->attach($branchA->id);

        // 3. Categories & Products
        $catFood = Category::create([
            'store_id' => $restaurant->id,
            'name' => 'مشويات (تجريبي)',
            'sort_order' => 1,
        ]);

        $product1 = Product::create([
            'store_id' => $restaurant->id,
            'category_id' => $catFood->id,
            'name' => 'كباب وكفتة مشوي (ربع كيلو)',
            'description' => 'كباب بلدي طازج',
            'price' => 120.00,
            'is_available' => true,
        ]);

        $product2 = Product::create([
            'store_id' => $restaurant->id,
            'category_id' => $catFood->id,
            'name' => 'طاجن لحمة بالبصل قناوي',
            'description' => 'طاجن فخار بلدي',
            'price' => 110.00,
            'is_available' => false,
        ]);

        // 4. Qena Zones with geographic coverage (clearly marked as test)
        $zone1 = Zone::create([
            'name' => 'منطقة وسط البلد - قنا (تجريبي)',
            'center_lat' => 26.1642,
            'center_lng' => 32.7181,
            'radius_km' => 2.0,
        ]);
        $zone2 = Zone::create([
            'name' => 'منطقة الجامعة - قنا (تجريبي)',
            'center_lat' => 26.1890,
            'center_lng' => 32.7260,
            'radius_km' => 2.5,
        ]);
        $zone3 = Zone::create([
            'name' => 'منطقة الشؤون - قنا (تجريبي)',
            'center_lat' => 26.1620,
            'center_lng' => 32.7210,
            'radius_km' => 1.5,
        ]);

        BranchZoneFee::create([
            'branch_id' => $branchA->id,
            'zone_id' => $zone1->id,
            'delivery_fee' => 10.00,
            'is_served' => true,
        ]);

        BranchZoneFee::create([
            'branch_id' => $branchA->id,
            'zone_id' => $zone2->id,
            'delivery_fee' => 15.00,
            'is_served' => true,
        ]);

        // 5. Sample Order for Customer A
        $order = Order::create([
            'order_number' => 'ORD-QNA-1001',
            'idempotency_key' => 'idemp-seed-order-1',
            'customer_id' => $customerA->id,
            'store_id' => $restaurant->id,
            'branch_id' => $branchA->id,
            'zone_id' => $zone1->id,
            'customer_name' => $customerA->name,
            'customer_phone' => $customerA->phone,
            'delivery_latitude' => 26.1560,
            'delivery_longitude' => 32.7170,
            'customer_notes' => 'الدور الثالث، علامة مميزة بجوار الصيدلية',
            'items_total' => 120.00,
            'delivery_fee' => 10.00,
            'grand_total' => 130.00,
            'status' => 'new',
            'payment_method' => 'COD',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product1->id,
            'product_name' => $product1->name,
            'unit_price' => 120.00,
            'quantity' => 1,
            'subtotal' => 120.00,
        ]);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'changed_by_user_id' => $customerA->id,
            'from_status' => null,
            'to_status' => 'new',
            'note' => 'تم إنشاء الطلب من قبل العميل',
        ]);

        SystemSetting::set('subscription_contact_number', '+201055370118');
        SystemSetting::set('unaccepted_order_alert_minutes', 10);
        SystemSetting::set('order_rate_limit_per_minute', 5);
    }
}
