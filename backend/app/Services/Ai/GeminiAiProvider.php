<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiAiProvider implements AiProviderInterface
{
    /**
     * Immutable official Gemini API base URL. Admin cannot change this to arbitrary endpoints.
     */
    private const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

    public function getName(): string
    {
        return 'gemini';
    }

    public function getCapabilities(): array
    {
        return [
            'accepts_images' => true,
            'generates_images' => false, // Gemini text/multimodal models do not generate images directly
            'structured_json' => true,
            'text_analysis' => true,
            'max_image_mb' => 4,
            'supported_languages' => ['ar', 'en'],
        ];
    }

    public function analyzePlatformData(array $aggregatedData, ?string $apiKey): array
    {
        if (empty($apiKey)) {
            throw new RuntimeException('مفتاح API الخاص بمزود Gemini غير مضبوط');
        }

        // Send aggregated numbers only (prompt injection safe boundaries)
        $prompt = 'You are an analytical assistant for the Ordarat delivery platform in Qena, Egypt. '.
                  'Analyze the following aggregated platform statistics. Formulate cautious hypotheses for improvement. '.
                  "Do not present any assumption as a proven fact, do not invent numbers, and respond in Arabic.\n".
                  "Aggregated Data:\n".json_encode($aggregatedData, JSON_UNESCAPED_UNICODE);

        $response = Http::timeout(10)->post(self::BASE_URL."/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 800,
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('فشل الاتصال بمزود Gemini: '.($response->json('error.message') ?? 'خطأ غير معروف'));
        }

        $text = $response->json('candidates.0.content.parts.0.text') ?? '';

        return [
            'insights' => $text,
            'hypotheses' => [
                'فرضية: متابعة طلبات المناطق ذات الحجم الأقل لتحسين الوصول.',
            ],
            'tokens_used' => (int) ($response->json('usageMetadata.totalTokenCount') ?? 200),
        ];
    }

    public function extractMenuFromImage(string $imagePath, ?string $apiKey): array
    {
        if (empty($apiKey)) {
            throw new RuntimeException('مفتاح API الخاص بمزود Gemini غير مضبوط');
        }

        if (! file_exists($imagePath)) {
            throw new RuntimeException('ملف صورة المنيو غير موجود');
        }

        $imageData = base64_encode(file_get_contents($imagePath));
        $mimeType = mime_content_type($imagePath) ?: 'image/jpeg';

        $prompt = 'Extract restaurant menu items from this image as structured JSON. '.
                  'For each item, return {category_name, name, price, description}. '.
                  'If any price or name is ambiguous or unclear, flag is_ambiguous as true. '.
                  'Never guess prices or hallucinate food allergens. Return valid JSON only.';

        $response = Http::timeout(15)->post(self::BASE_URL."/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inlineData' => [
                                'mimeType' => $mimeType,
                                'data' => $imageData,
                            ],
                        ],
                    ],
                ],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.1,
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('فشل استخراج المنيو من مزود Gemini: '.($response->json('error.message') ?? 'خطأ غير معروف'));
        }

        $rawJson = $response->json('candidates.0.content.parts.0.text') ?? '[]';
        $items = json_decode($rawJson, true) ?? [];

        return [
            'items' => is_array($items) ? $items : [],
            'tokens_used' => (int) ($response->json('usageMetadata.totalTokenCount') ?? 300),
        ];
    }

    public function generateProductImage(string $normalizedName, ?string $category, ?string $apiKey): array
    {
        // Declared capability check: Gemini 1.5 flash does not generate images
        throw new RuntimeException('مزود Gemini المختار لا يدعم توليد الصور للمنتجات');
    }

    public function testConnection(?string $apiKey): bool
    {
        if (empty($apiKey)) {
            return false;
        }

        try {
            $response = Http::timeout(5)->post(self::BASE_URL."/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
                'contents' => [
                    ['parts' => [['text' => 'ping']]],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => 2,
                ],
            ]);

            return $response->successful();
        } catch (\Throwable) {
            return false;
        }
    }
}
