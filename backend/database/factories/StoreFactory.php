<?php

namespace Database\Factories;

use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

class StoreFactory extends Factory
{
    protected $model = Store::class;

    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'type' => fake()->randomElement(['restaurant', 'grocery']),
            'image_url' => null,
            'is_active' => true,
            'is_accepting_orders' => true,
        ];
    }
}
