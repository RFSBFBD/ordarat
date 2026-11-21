<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'order_number' => 'ORD-'.strtoupper(Str::random(8)),
            'idempotency_key' => (string) Str::uuid(),
            'store_id' => Store::factory(),
            'branch_id' => Branch::factory(),
            'customer_id' => User::factory(),
            'customer_name' => fake()->name(),
            'customer_phone' => '01012345678',
            'status' => 'new',
            'delivery_latitude' => 26.1642,
            'delivery_longitude' => 32.7181,
            'customer_notes' => 'قريب من محطة القطار',
            'items_total' => 150.00,
            'delivery_fee' => 15.00,
            'grand_total' => 165.00,
            'payment_method' => 'COD',
        ];
    }
}
