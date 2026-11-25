<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Business logos are small images stored with the data itself, because the
 * serverless host has no persistent disk. The upload is validated and
 * size-capped by the API and served from /api/.../logo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_applications', function (Blueprint $table) {
            $table->longText('logo_data')->nullable();
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->longText('logo_data')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('merchant_applications', function (Blueprint $table) {
            $table->dropColumn('logo_data');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('logo_data');
        });
    }
};
