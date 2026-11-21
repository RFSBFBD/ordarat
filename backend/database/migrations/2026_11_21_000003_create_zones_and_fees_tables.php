<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. "منطقة وسط البلد - قنا (تجريبي)"
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('branch_zone_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained('zones')->cascadeOnDelete();
            $table->decimal('delivery_fee', 10, 2)->default(0.00); // in EGP
            $table->boolean('is_served')->default(true)->index();
            $table->timestamps();

            $table->unique(['branch_id', 'zone_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_zone_fees');
        Schema::dropIfExists('zones');
    }
};
