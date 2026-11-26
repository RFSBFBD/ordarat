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
            'subscription_starts_at' => now()->subDay()->toDateString(),
            'subscription_ends_at' => null,
        ];
    }

    /** A store with no running subscription (the state of every newly approved business). */
    public function unsubscribed(): static
    {
        return $this->state(fn () => ['subscription_starts_at' => null, 'subscription_ends_at' => null]);
    }
}
