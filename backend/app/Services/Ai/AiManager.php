<?php

namespace App\Services\Ai;

use App\Models\AiGeneratedImage;
use App\Models\AiProviderSetting;
use App\Models\AiUsageLog;
use Carbon\Carbon;
use RuntimeException;

class AiManager
{
    public function __construct(
        protected AiCostService $costService,
        protected AiImageSecurityService $imageSecurityService,
    ) {}

    /**
     * Resolve provider adapter instance.
     */
    public function resolveProvider(string $providerName): AiProviderInterface
    {
        return match (strtolower($providerName)) {
            'mock' => new MockAiProvider,
            'gemini' => new GeminiAiProvider,
            default => throw new RuntimeException("مزود الذكاء الاصطناعي ({$providerName}) غير معتمد أو غير مدعوم"),
        };
    }

    /**
     * Get or create provider setting for a function type.
     */
    public function getSetting(string $functionType): AiProviderSetting
    {
        return AiProviderSetting::firstOrCreate(
            ['function_type' => $functionType],
            [
                'provider_name' => 'mock',
                'is_enabled' => false,
                'cost_limit_daily_usd' => 0.0000,
                'cost_limit_monthly_usd' => 0.0000,
                'daily_request_limit' => 0,
                'store_daily_quota' => 0,
                'store_monthly_quota' => 0,
                'kill_switch' => false,
            ]
        );
    }

    /**
     * Execute platform analytics text analysis for Admin.
     *
     * @param  array<string, mixed>  $aggregatedSqlStats
     * @return array{insights: string, hypotheses: array<string>}
     */
    public function analyzePlatform(array $aggregatedSqlStats, int $adminUserId): array
    {
        $setting = $this->getSetting('text_analysis');
        $reservation = $this->costService->checkAndReserve($setting, null, 'text_analysis');

        $provider = $this->resolveProvider($setting->provider_name);
        $capabilities = $provider->getCapabilities();

        if (! ($capabilities['text_analysis'] ?? false)) {
            $this->costService->releaseReservation($reservation);
            throw new RuntimeException("المزود المختار ({$provider->getName()}) لا يدعم التحليل النصي");
        }

        $startTime = microtime(true);
        $apiKey = $setting->getDecryptedApiKey();

        try {
            $result = $provider->analyzePlatformData($aggregatedSqlStats, $apiKey);
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

            $this->costService->settleReservation($reservation, 0.0050);

            // Log usage without raw prompts or PII
            AiUsageLog::create([
                'function_type' => 'text_analysis',
                'provider_name' => $provider->getName(),
                'user_id' => $adminUserId,
                'store_id' => null,
                'input_size' => count($aggregatedSqlStats),
                'output_size' => $result['tokens_used'] ?? 100,
                'estimated_cost_usd' => 0.0050,
                'status' => 'success',
                'latency_ms' => $latencyMs,
                'created_at' => Carbon::now('Africa/Cairo'),
            ]);

            return $result;
        } catch (\Throwable $e) {
            $this->costService->releaseReservation($reservation);

            AiUsageLog::create([
                'function_type' => 'text_analysis',
                'provider_name' => $provider->getName(),
                'user_id' => $adminUserId,
                'store_id' => null,
                'input_size' => 0,
                'output_size' => 0,
                'estimated_cost_usd' => 0.0000,
                'status' => 'failed',
                'error_code' => 'PROVIDER_ERROR',
                'latency_ms' => (int) round((microtime(true) - $startTime) * 1000),
                'created_at' => Carbon::now('Africa/Cairo'),
            ]);

            throw $e;
        }
    }

    /**
     * Extract menu draft from sanitized image for Store Owner.
     */
    public function extractMenuDraft(string $sanitizedImagePath, int $storeId, int $userId): array
    {
        $setting = $this->getSetting('image_ocr_menu');
        $reservation = $this->costService->checkAndReserve($setting, $storeId, 'image_ocr_menu');

        $provider = $this->resolveProvider($setting->provider_name);
        $capabilities = $provider->getCapabilities();

        if (! ($capabilities['accepts_images'] ?? false)) {
            $this->costService->releaseReservation($reservation);
            throw new RuntimeException("المزود المختار ({$provider->getName()}) لا يدعم قراءة صور المنيو");
        }

        $startTime = microtime(true);
        $apiKey = $setting->getDecryptedApiKey();

        try {
            $result = $provider->extractMenuFromImage($sanitizedImagePath, $apiKey);
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

            $this->costService->settleReservation($reservation, 0.0150);

            AiUsageLog::create([
                'function_type' => 'image_ocr_menu',
                'provider_name' => $provider->getName(),
                'user_id' => $userId,
                'store_id' => $storeId,
                'input_size' => (int) round(filesize($sanitizedImagePath) / 1024),
                'output_size' => count($result['items'] ?? []),
                'estimated_cost_usd' => 0.0150,
                'status' => 'success',
                'latency_ms' => $latencyMs,
                'created_at' => Carbon::now('Africa/Cairo'),
            ]);

            return $result;
        } catch (\Throwable $e) {
            $this->costService->releaseReservation($reservation);

            AiUsageLog::create([
                'function_type' => 'image_ocr_menu',
                'provider_name' => $provider->getName(),
                'user_id' => $userId,
                'store_id' => $storeId,
                'input_size' => 0,
                'output_size' => 0,
                'estimated_cost_usd' => 0.0000,
                'status' => 'failed',
                'error_code' => 'OCR_ERROR',
                'latency_ms' => (int) round((microtime(true) - $startTime) * 1000),
                'created_at' => Carbon::now('Africa/Cairo'),
            ]);

            throw $e;
        }
    }

    /**
     * Generate product image with name normalization and deduplication cache.
     */
    public function generateProductImage(string $productName, ?string $category, int $storeId, int $userId): array
    {
        $normalizedName = AiTextNormalizer::normalize($productName);

        if (empty($normalizedName)) {
            throw new RuntimeException('اسم المنتج غير صالح للتوليد');
        }

        // Deduplication / Cache check: if this normalized name already has a generated image for this store, reuse it!
        $existing = AiGeneratedImage::where('store_id', $storeId)
            ->where('normalized_name', $normalizedName)
            ->first();

        if ($existing) {
            return [
                'id' => $existing->id,
                'image_url' => $existing->image_url,
                'is_illustrative' => true,
                'cached' => true,
                'status' => $existing->status,
            ];
        }

        $setting = $this->getSetting('image_generation');
        $reservation = $this->costService->checkAndReserve($setting, $storeId, 'image_generation');

        $provider = $this->resolveProvider($setting->provider_name);
        $capabilities = $provider->getCapabilities();

        if (! ($capabilities['generates_images'] ?? false)) {
            $this->costService->releaseReservation($reservation);
            throw new RuntimeException("المزود المختار ({$provider->getName()}) لا يدعم ميزة توليد الصور");
        }

        $startTime = microtime(true);
        $apiKey = $setting->getDecryptedApiKey();

        try {
            $result = $provider->generateProductImage($normalizedName, $category, $apiKey);
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

            $cost = $result['cost_usd'] ?? 0.0250;
            $this->costService->settleReservation($reservation, $cost);

            // Store generated image awaiting human approval
            $record = AiGeneratedImage::create([
                'store_id' => $storeId,
                'product_id' => null,
                'normalized_name' => $normalizedName,
                'image_url' => $result['image_url'],
                'is_illustrative' => true,
                'status' => 'pending_approval',
            ]);

            AiUsageLog::create([
                'function_type' => 'image_generation',
                'provider_name' => $provider->getName(),
                'user_id' => $userId,
                'store_id' => $storeId,
                'input_size' => strlen($normalizedName),
                'output_size' => 1,
                'estimated_cost_usd' => $cost,
                'status' => 'success',
                'latency_ms' => $latencyMs,
                'created_at' => Carbon::now('Africa/Cairo'),
            ]);

            return [
                'id' => $record->id,
                'image_url' => $record->image_url,
                'is_illustrative' => true,
                'cached' => false,
                'status' => $record->status,
            ];
        } catch (\Throwable $e) {
            $this->costService->releaseReservation($reservation);

            AiUsageLog::create([
                'function_type' => 'image_generation',
                'provider_name' => $provider->getName(),
                'user_id' => $userId,
                'store_id' => $storeId,
                'input_size' => 0,
                'output_size' => 0,
                'estimated_cost_usd' => 0.0000,
                'status' => 'failed',
                'error_code' => 'IMAGE_GEN_ERROR',
                'latency_ms' => (int) round((microtime(true) - $startTime) * 1000),
                'created_at' => Carbon::now('Africa/Cairo'),
            ]);

            throw $e;
        }
    }
}
