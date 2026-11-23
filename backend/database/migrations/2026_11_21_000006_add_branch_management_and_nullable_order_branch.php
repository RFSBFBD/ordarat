<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add branch-level order acceptance toggle and working hours
        Schema::table('branches', function (Blueprint $table) {
            if (! Schema::hasColumn('branches', 'is_accepting_orders')) {
                $table->boolean('is_accepting_orders')->default(true)->after('is_active');
            }
            if (! Schema::hasColumn('branches', 'working_hours')) {
                $table->json('working_hours')->nullable()->after('is_accepting_orders');
            }
        });

        // 2. Allow 'branch_manager' role for users
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'pgsql') {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 30)->default('customer')->change();
        });

        // 3. Create branch_user pivot table for branch managers
        if (! Schema::hasTable('branch_user')) {
            Schema::create('branch_user', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['branch_id', 'user_id']);
            });
        }

        // 4. Make orders.branch_id nullable for legacy/historical orders
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_user');

        Schema::table('branches', function (Blueprint $table) {
            if (Schema::hasColumn('branches', 'working_hours')) {
                $table->dropColumn('working_hours');
            }
            if (Schema::hasColumn('branches', 'is_accepting_orders')) {
                $table->dropColumn('is_accepting_orders');
            }
        });
    }
};
