<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

class BranchFactory extends Factory
{
    protected $model = Branch::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'name' => 'الفرع الرئيسي',
            'address' => 'شارع الهلال الأحمر، قنا',
            'phone' => '01099887766',
            'latitude' => 26.1642,
            'longitude' => 32.7181,
            'is_active' => true,
        ];
    }
}
