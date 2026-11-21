<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. AI Provider Configuration & Cost Limits
        Schema::create('ai_provider_settings', function (Blueprint $table) {
            $table->id();
            $table->string('function_type')->unique(); // text_analysis, image_ocr_menu, image_generation
            $table->string('provider_name')->default('mock'); // mock, gemini, openai
            $table->text('encrypted_api_key')->nullable();
            $table->boolean('is_enabled')->default(false); // Default disabled
            $table->decimal('cost_limit_daily_usd', 8, 4)->default(0.0000); // 0 = zero budget (blocked until admin configures)
            $table->decimal('cost_limit_monthly_usd', 8, 4)->default(0.0000);
            $table->integer('daily_request_limit')->default(0); // 0 = blocked
            $table->integer('max_input_size_kb')->default(2048);
            $table->integer('max_output_tokens')->default(1000);
            $table->integer('store_daily_quota')->default(0); // 0 = zero quota until set
            $table->integer('store_monthly_quota')->default(0);
            $table->boolean('kill_switch')->default(false); // Immediate emergency cutoff
            $table->json('custom_settings')->nullable();
            $table->timestamps();
        });

        // 2. Per-Store AI Quotas & Freezes (Admin controlled)
        Schema::create('ai_store_quotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->boolean('is_frozen')->default(false);
            $table->string('freeze_reason')->nullable();
            $table->integer('custom_daily_quota')->nullable();
            $table->integer('custom_monthly_quota')->nullable();
            $table->timestamps();
            $table->unique('store_id');
        });

        // 3. AI Usage Audit Logs (Zero customer PII, No raw prompts)
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->string('function_type');
            $table->string('provider_name');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->integer('input_size')->default(0);
            $table->integer('output_size')->default(0);
            $table->decimal('estimated_cost_usd', 8, 4)->default(0.0000);
            $table->string('status'); // success, failed, blocked
            $table->string('error_code')->nullable();
            $table->integer('latency_ms')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        // 4. Atomic Budget Reservations
        Schema::create('ai_budget_reservations', function (Blueprint $table) {
            $table->id();
            $table->string('function_type');
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->decimal('reserved_cost_usd', 8, 4)->default(0.0000);
            $table->string('status')->default('reserved'); // reserved, settled, released
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('settled_at')->nullable();
        });

        // 5. Historical AI Platform Analyses for Admin
        Schema::create('ai_analysis_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('period')->default('all');
            $table->json('summary_snapshot');
            $table->text('ai_insights');
            $table->timestamp('created_at')->useCurrent();
        });

        // 6. Menu Extraction Drafts
        Schema::create('menu_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('source_image_url')->nullable();
            $table->string('status')->default('draft'); // draft, partially_accepted, accepted, discarded
            $table->integer('items_count')->default(0);
            $table->timestamps();
        });

        // 7. Menu Draft Items (Reviewable item by item)
        Schema::create('menu_draft_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_draft_id')->constrained('menu_drafts')->cascadeOnDelete();
            $table->string('category_name')->nullable();
            $table->string('name');
            $table->decimal('price', 8, 2)->nullable();
            $table->text('description')->nullable();
            $table->boolean('needs_review')->default(true);
            $table->boolean('is_ambiguous')->default(false);
            $table->string('ambiguity_reason')->nullable();
            $table->string('status')->default('pending'); // pending, accepted, rejected
            $table->timestamps();
        });

        // 8. AI Generated Product Images
        Schema::create('ai_generated_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('normalized_name');
            $table->string('image_url');
            $table->boolean('is_illustrative')->default(true); // Always marked as illustrative
            $table->string('status')->default('pending_approval'); // pending_approval, approved, rejected
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'normalized_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_generated_images');
        Schema::dropIfExists('menu_draft_items');
        Schema::dropIfExists('menu_drafts');
        Schema::dropIfExists('ai_analysis_history');
        Schema::dropIfExists('ai_budget_reservations');
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_store_quotas');
        Schema::dropIfExists('ai_provider_settings');
    }
};
