<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive only: a new table for the extra branches an applicant lists in the
     * first registration form. No existing table or column is touched. On approval
     * they become normal rows in `branches`.
     */
    public function up(): void
    {
        Schema::create('merchant_application_branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_application_id')->constrained('merchant_applications')->cascadeOnDelete();
            $table->string('name');
            $table->string('address');
            $table->string('phone', 20)->nullable();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_application_branches');
    }
};
