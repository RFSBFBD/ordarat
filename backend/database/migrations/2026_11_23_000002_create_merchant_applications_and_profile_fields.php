<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Unified Google sign-in: customers can defer their profile until the
        // first order; business owners submit a join application that stays
        // pending until an admin approves it (no privilege from the browser).
        Schema::table('users', function (Blueprint $table) {
            $table->string('address')->nullable()->after('phone');
            $table->decimal('latitude', 10, 8)->nullable()->after('address');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            $table->timestamp('profile_completed_at')->nullable()->after('longitude');
            $table->string('onboarding_state', 32)->default('new')->after('profile_completed_at')->index();
        });

        Schema::create('merchant_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('business_name');
            $table->string('type', 20); // restaurant | grocery
            $table->string('phone', 20);
            $table->string('address');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->boolean('has_branches')->default(false);
            $table->string('area_name'); // the Qena district/zone the activity is in
            $table->string('status', 20)->default('pending')->index(); // pending | approved | rejected
            $table->text('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_applications');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'address',
                'latitude',
                'longitude',
                'profile_completed_at',
                'onboarding_state',
            ]);
        });
    }
};
