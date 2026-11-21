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
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Users
        $admin = User::create([
            'name' => 'أدمن أوردرات (تجريبي)',
            'email' => 'admin@ordarat-qena.local',
            'phone' => '01000000001',
            'role' => 'admin',
            'status' => 'active',
            'password' => Hash::make('password123'),
        ]);

        $merchantA = User::create([
            'name' => 'صاحب مطعم الكرنك (تجريبي)',
            'email' => 'karnak@ordarat-qena.local',
            'phone' => '01011111111',
            'role' => 'merchant',
            'status' => 'active',
            'password' => Hash::make('password123'),
        ]);

        $merchantB = User::create([
            'name' => 'صاحب بقالة الأمانة (تجريبي)',
            'email' => 'amana@ordarat-qena.local',
            'phone' => '01022222222',
            'role' => 'merchant',
            'status' => 'active',
            'password' => Hash::make('password123'),
        ]);

        $customerA = User::create([
            'name' => 'عميل قنا أ (تجريبي)',
            'email' => 'customer_a@ordarat-qena.local',
            'phone' => '01033333333',
            'role' => 'customer',
            'status' => 'active',
            'password' => Hash::make('password123'),
        ]);

        $customerB = User::create([
            'name' => 'عميل قنا ب (تجريبي)',
            'email' => 'customer_b@ordarat-qena.local',
            'phone' => '01044444444',
            'role' => 'customer',
            'status' => 'active',
            'password' => Hash::make('password123'),
        ]);

        $suspendedCustomer = User::create([
            'name' => 'عميل معطل (تجريبي)',
            'email' => 'suspended@ordarat-qena.local',
            'phone' => '01055555555',
            'role' => 'customer',
            'status' => 'suspended',
            'password' => Hash::make('password123'),
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

        // 4. Qena Zones (clearly marked as test)
        $zone1 = Zone::create(['name' => 'منطقة وسط البلد - قنا (تجريبي)']);
        $zone2 = Zone::create(['name' => 'منطقة الجامعة - قنا (تجريبي)']);
        $zone3 = Zone::create(['name' => 'منطقة الشؤون - قنا (تجريبي)']);

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
    }
}
