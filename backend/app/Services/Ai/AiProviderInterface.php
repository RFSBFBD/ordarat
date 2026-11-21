<?php

namespace App\Services\Ai;

interface AiProviderInterface
{
    public function getName(): string;

    /**
     * @return array{
     *     accepts_images: bool,
     *     generates_images: bool,
     *     structured_json: bool,
     *     text_analysis: bool,
     *     max_image_mb: int,
     *     supported_languages: array<string>
     * }
     */
    public function getCapabilities(): array;

    /**
     * Analyze platform aggregated metrics (SQL stats only, no customer PII).
     *
     * @param  array<string, mixed>  $aggregatedData
     * @return array{insights: string, hypotheses: array<string>, tokens_used: int}
     */
    public function analyzePlatformData(array $aggregatedData, ?string $apiKey): array;

    /**
     * Extract menu draft from sanitized image.
     *
     * @return array{items: array<array<string, mixed>>, tokens_used: int}
     */
    public function extractMenuFromImage(string $imagePath, ?string $apiKey): array;

    /**
     * Generate product image from normalized name.
     *
     * @return array{image_url: string, is_illustrative: bool, cost_usd: float}
     */
    public function generateProductImage(string $normalizedName, ?string $category, ?string $apiKey): array;

    /**
     * Test connection with a micro request.
     */
    public function testConnection(?string $apiKey): bool;
}
