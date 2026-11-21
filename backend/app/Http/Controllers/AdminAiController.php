<?php

namespace App\Http\Controllers;

use App\Models\AiAnalysisHistory;
use App\Models\AiProviderSetting;
use App\Models\AiStoreQuota;
use App\Models\AiUsageLog;
use App\Models\AuditLog;
use App\Models\Store;
use App\Services\Ai\AiManager;
use App\Services\Ai\GeminiAiProvider;
use App\Services\Ai\MockAiProvider;
use App\Services\Analytics\AdminAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAiController extends Controller
{
    public function __construct(
        protected AiManager $aiManager,
        protected AdminAnalyticsService $analyticsService,
    ) {}

    public function getSettings(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $functions = ['text_analysis', 'image_ocr_menu', 'image_generation'];
        $settings = [];

        foreach ($functions as $fn) {
            $settings[$fn] = $this->aiManager->getSetting($fn);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'settings' => $settings,
                'available_providers' => [
                    [
                        'id' => 'mock',
                        'name' => 'مزود تجريبي محلي (Mock Provider - مجاني وآمن للتطوير)',
                        'capabilities' => (new MockAiProvider)->getCapabilities(),
                    ],
                    [
                        'id' => 'gemini',
                        'name' => 'Google Gemini (Official API)',
                        'capabilities' => (new GeminiAiProvider)->getCapabilities(),
                    ],
                ],
            ],
        ]);
    }

    public function updateSettings(Request $request, string $functionType): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $allowedFunctions = ['text_analysis', 'image_ocr_menu', 'image_generation'];
        if (! in_array($functionType, $allowedFunctions, true)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_FUNCTION', 'message' => 'نوع الوظيفة غير صحيح'],
            ], 400);
        }

        $validated = $request->validate([
            'provider_name' => 'required|in:mock,gemini',
            'api_key' => 'nullable|string',
            'is_enabled' => 'required|boolean',
            'cost_limit_daily_usd' => 'required|numeric|min:0',
            'cost_limit_monthly_usd' => 'required|numeric|min:0',
            'daily_request_limit' => 'required|integer|min:0',
            'store_daily_quota' => 'required|integer|min:0',
            'store_monthly_quota' => 'required|integer|min:0',
            'kill_switch' => 'sometimes|boolean',
        ]);

        $setting = $this->aiManager->getSetting($functionType);
        $oldValues = $setting->only([
            'provider_name', 'is_enabled', 'cost_limit_daily_usd', 'cost_limit_monthly_usd',
            'daily_request_limit', 'store_daily_quota', 'kill_switch',
        ]);

        if (array_key_exists('api_key', $validated)) {
            $setting->setApiKey($validated['api_key']);
        }

        $setting->update([
            'provider_name' => $validated['provider_name'],
            'is_enabled' => $validated['is_enabled'],
            'cost_limit_daily_usd' => $validated['cost_limit_daily_usd'],
            'cost_limit_monthly_usd' => $validated['cost_limit_monthly_usd'],
            'daily_request_limit' => $validated['daily_request_limit'],
            'store_daily_quota' => $validated['store_daily_quota'],
            'store_monthly_quota' => $validated['store_monthly_quota'],
            'kill_switch' => $validated['kill_switch'] ?? $setting->kill_switch,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UPDATE_AI_SETTINGS',
            'auditable_type' => AiProviderSetting::class,
            'auditable_id' => $setting->id,
            'old_values' => $oldValues,
            'new_values' => [
                'provider_name' => $setting->provider_name,
                'is_enabled' => $setting->is_enabled,
                'is_configured' => $setting->is_configured,
                'cost_limit_daily_usd' => $setting->cost_limit_daily_usd,
                'cost_limit_monthly_usd' => $setting->cost_limit_monthly_usd,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم حفظ وتحديث إعدادات الذكاء الاصطناعي بنجاح',
            'data' => $setting->fresh(),
        ]);
    }

    public function testConnection(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $validated = $request->validate([
            'provider_name' => 'required|in:mock,gemini',
            'api_key' => 'nullable|string',
        ]);

        try {
            $provider = $this->aiManager->resolveProvider($validated['provider_name']);
            $key = ! empty($validated['api_key']) ? trim($validated['api_key']) : null;
            $connected = $provider->testConnection($key);

            return response()->json([
                'success' => $connected,
                'message' => $connected ? 'تم الاتصال بالمزود بنجاح' : 'فشل الاتصال بالمزود، تحقق من صحة المفتاح',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'CONNECTION_FAILED', 'message' => $e->getMessage()],
            ], 400);
        }
    }

    public function toggleKillSwitch(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $validated = $request->validate([
            'kill_switch' => 'required|boolean',
        ]);

        AiProviderSetting::query()->update(['kill_switch' => $validated['kill_switch']]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'TOGGLE_AI_KILL_SWITCH',
            'new_values' => ['kill_switch' => $validated['kill_switch']],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $validated['kill_switch'] ? 'تم تفعيل الإيقاف الطارئ لخدمات الذكاء الاصطناعي فوراً' : 'تم إلغاء الإيقاف الطارئ',
            'kill_switch' => $validated['kill_switch'],
        ]);
    }

    public function getUsageLogs(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $logs = AiUsageLog::with(['user:id,name', 'store:id,name'])
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    public function getStoresQuota(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $stores = Store::with('aiQuota')->get()->map(function ($s) {
            return [
                'id' => $s->id,
                'name' => $s->name,
                'is_frozen' => $s->aiQuota?->is_frozen ?? false,
                'freeze_reason' => $s->aiQuota?->freeze_reason,
                'custom_daily_quota' => $s->aiQuota?->custom_daily_quota,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $stores,
        ]);
    }

    public function toggleStoreFreeze(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $validated = $request->validate([
            'is_frozen' => 'required|boolean',
            'reason' => 'nullable|string|max:255',
        ]);

        $quota = AiStoreQuota::firstOrCreate(['store_id' => $store->id]);
        $quota->update([
            'is_frozen' => $validated['is_frozen'],
            'freeze_reason' => $validated['is_frozen'] ? ($validated['reason'] ?? 'إيقاف إداري بواسطة الأدمن') : null,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'TOGGLE_STORE_AI_FREEZE',
            'auditable_type' => Store::class,
            'auditable_id' => $store->id,
            'new_values' => ['is_frozen' => $quota->is_frozen, 'reason' => $quota->freeze_reason],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $quota->is_frozen ? "تم إيقاف الـ AI لمتجر {$store->name}" : "تم تفعيل الـ AI لمتجر {$store->name}",
            'data' => $quota,
        ]);
    }

    public function analyzePlatform(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $period = $request->input('period', 'all');
        $analytics = $this->analyticsService->getAnalytics($period);

        // Sanitize payload strictly: only send aggregated numbers (Zero customer PII)
        $cleanPayload = [
            'period' => $analytics['period'],
            'total_users' => $analytics['users']['total_customers'],
            'active_customers' => $analytics['users']['active_customers_in_period'],
            'total_orders' => $analytics['orders']['total_orders'],
            'delivered_orders' => $analytics['orders']['by_status']['delivered'] ?? 0,
            'unaccepted_orders_count' => $analytics['orders']['unaccepted_delayed_count'] ?? 0,
            'delivered_cash_value_egp' => $analytics['cash_summary']['delivered_cash_total_egp'],
            'active_stores_count' => count($analytics['stores_activity']),
            'locations_summary' => $analytics['locations_aggregated'],
        ];

        try {
            $analysisResult = $this->aiManager->analyzePlatform($cleanPayload, $request->user()->id);

            // Record analysis in history
            $record = AiAnalysisHistory::create([
                'admin_user_id' => $request->user()->id,
                'period' => $period,
                'summary_snapshot' => $cleanPayload,
                'ai_insights' => $analysisResult['insights'],
                'created_at' => now('Africa/Cairo'),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $record->id,
                    'insights' => $analysisResult['insights'],
                    'hypotheses' => $analysisResult['hypotheses'] ?? [],
                    'disclaimer' => 'اقتراحات وافتراضات للاختبار بواسطة الذكاء الاصطناعي، وليست حقائق مؤكدة',
                    'snapshot' => $cleanPayload,
                    'created_at' => $record->created_at->toIso8601String(),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'AI_ANALYSIS_FAILED', 'message' => $e->getMessage()],
            ], 400);
        }
    }

    public function getAnalysisHistory(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $history = AiAnalysisHistory::with('admin:id,name')
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }
}
