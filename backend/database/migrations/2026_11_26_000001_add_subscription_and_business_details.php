<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A business can be listed (logo + name) as soon as it is approved, but it can
 * only add products and other info while an admin-activated subscription is
 * running. No payment is involved: the admin sets the dates by hand.
 * Stores that already exist keep working: they get an open-ended subscription
 * starting today.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->date('subscription_starts_at')->nullable();
            $table->date('subscription_ends_at')->nullable();
            $table->string('commercial_register', 60)->nullable();
        });

        Schema::table('merchant_applications', function (Blueprint $table) {
            $table->string('opens_at', 5)->nullable();
            $table->string('closes_at', 5)->nullable();
            $table->string('commercial_register', 60)->nullable();
        });

        DB::table('stores')->update(['subscription_starts_at' => now()->toDateString()]);
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['subscription_starts_at', 'subscription_ends_at', 'commercial_register']);
        });

        Schema::table('merchant_applications', function (Blueprint $table) {
            $table->dropColumn(['opens_at', 'closes_at', 'commercial_register']);
        });
    }
};
