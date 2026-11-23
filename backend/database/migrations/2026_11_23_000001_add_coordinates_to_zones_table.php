<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds geographic coverage to delivery zones so checkout pricing can
 * resolve the customer's zone from their actual shared location instead
 * of blindly picking the first active zone.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->decimal('center_lat', 10, 7)->nullable()->after('name');
            $table->decimal('center_lng', 10, 7)->nullable()->after('center_lat');
            $table->decimal('radius_km', 6, 2)->nullable()->after('center_lng');
        });
    }

    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->dropColumn(['center_lat', 'center_lng', 'radius_km']);
        });
    }
};
