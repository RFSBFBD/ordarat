<?php

namespace App\Services\Ai;

class MockAiProvider implements AiProviderInterface
{
    public function getName(): string
    {
        return 'mock';
    }

    public function getCapabilities(): array
    {
        return [
            'accepts_images' => true,
            'generates_images' => true,
            'structured_json' => true,
            'text_analysis' => true,
            'max_image_mb' => 4,
            'supported_languages' => ['ar', 'en'],
        ];
    }

    public function analyzePlatformData(array $aggregatedData, ?string $apiKey): array
    {
        $ordersCount = $aggregatedData['total_orders'] ?? 0;
        $activeStores = $aggregatedData['active_stores_count'] ?? 0;
        $unacceptedOrders = $aggregatedData['unaccepted_orders_count'] ?? 0;

        $insights = "تحليل تجريبي لبيانات منصة أوردرات في مدينة قنا:\n";
        $insights .= "- إجمالي الطلبات المسجلة: {$ordersCount} طلبًا عبر {$activeStores} متجرًا نشطًا.\n";
        if ($unacceptedOrders > 0) {
            $insights .= "- تم رصد {$unacceptedOrders} طلبات لم يتم قبولها في الوقت المحدد؛ يوصى بمتابعة سرعة استجابة المتاجر في فترات الذروة.\n";
        } else {
            $insights .= "- معدل استجابة المتاجر ممتاز ولا توجد طلبات متأخرة.\n";
        }
        $insights .= '- ملاحظة: هذه مخرجات افتراضية مبنية على أرقام قاعدة البيانات كفرضيات للتحسين وليست حقائق مؤكدة.';

        return [
            'insights' => $insights,
            'hypotheses' => [
                'فرضية: زيادة التغطية في منطقة المعنا والجامعة قد يرفع حجم الطلبات.',
                'فرضية: تحفيز المطاعم على تحديث حالة الأصناف يقلل الاعتذارات.',
            ],
            'tokens_used' => 120,
        ];
    }

    public function extractMenuFromImage(string $imagePath, ?string $apiKey): array
    {
        // Realistic simulated OCR menu extraction adhering strictly to prompt requirements
        return [
            'items' => [
                [
                    'category_name' => 'مشويات',
                    'name' => 'كباب ضاني بلدي مشوي',
                    'price' => 160.00,
                    'description' => 'ربع كيلو كباب ضاني مع طحينة وعيش',
                    'needs_review' => true,
                    'is_ambiguous' => false,
                    'ambiguity_reason' => null,
                ],
                [
                    'category_name' => 'مشويات',
                    'name' => 'كفتة مشوية على الفحم',
                    'price' => 90.00,
                    'description' => 'كفتة لحم بلدي مع بهارات قناوية',
                    'needs_review' => true,
                    'is_ambiguous' => false,
                    'ambiguity_reason' => null,
                ],
                [
                    'category_name' => 'طواجن',
                    'name' => 'طاجن تورلي صعيدي',
                    'price' => null, // Ambiguous price in menu image
                    'description' => 'خضار مشكل باللحم البلدي',
                    'needs_review' => true,
                    'is_ambiguous' => true,
                    'ambiguity_reason' => 'السعر غير واضح في صورة المنيو ويجب كتابته يدويًا',
                ],
            ],
            'tokens_used' => 250,
        ];
    }

    public function generateProductImage(string $normalizedName, ?string $category, ?string $apiKey): array
    {
        return [
            'image_url' => '/storage/products/ai_sample_'.md5($normalizedName).'.webp',
            'is_illustrative' => true,
            'cost_usd' => 0.0000,
        ];
    }

    public function testConnection(?string $apiKey): bool
    {
        if ($apiKey === 'invalid_test_key') {
            return false;
        }

        return true;
    }
}
