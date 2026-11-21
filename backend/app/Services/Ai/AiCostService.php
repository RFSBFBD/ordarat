<?php

namespace App\Services\Ai;

use App\Models\AiBudgetReservation;
use App\Models\AiProviderSetting;
use App\Models\AiStoreQuota;
use App\Models\AiUsageLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AiCostService
{
    /**
     * Estimated maximum cost per operation (USD) used for atomic budget reservation.
     */
    private const ESTIMATED_COSTS = [
        'text_analysis' => 0.0050,
        'image_ocr_menu' => 0.0150,
        'image_generation' => 0.0250,
    ];

    /**
     * Atomically check limits and reserve budget for an AI operation.
     */
    public function checkAndReserve(AiProviderSetting $setting, ?int $storeId, string $functionType): AiBudgetReservation
    {
        // 1. Check Kill Switch & General Enablement
        if ($setting->kill_switch) {
            throw new RuntimeException('تم إيقاف خدمات الذكاء الاصطناعي لحالة طوارئ من قبل إدارة المنصة');
        }

        if (! $setting->is_enabled) {
            throw new RuntimeException('ميزة الذكاء الاصطناعي معطلة حالياً. بانتظار تفعيلها من الأدمن');
        }

        // 2. Default Zero Budget / Quota Rule (Must be configured by admin)
        if ($setting->cost_limit_daily_usd <= 0.0000 || $setting->daily_request_limit <= 0) {
            throw new RuntimeException('الخدمة دي مش متاحة دلوقتي (بانتظار ضبط ميزانية وسقف الاستخدام من الأدمن)');
        }

        // 3. Store-specific checks (if triggered by a merchant store)
        if ($storeId) {
            $storeQuota = AiStoreQuota::where('store_id', $storeId)->first();
            if ($storeQuota && $storeQuota->is_frozen) {
                $reason = $storeQuota->freeze_reason ? ": {$storeQuota->freeze_reason}" : '';
                throw new RuntimeException("تم إيقاف استخدام ميزات الذكاء الاصطناعي لهذا المتجر{$reason}");
            }

            $dailyQuota = $storeQuota?->custom_daily_quota ?? $setting->store_daily_quota;
            if ($dailyQuota <= 0) {
                throw new RuntimeException('الخدمة دي مش متاحة دلوقتي (حصة المتجر اليومية لم يتم تحديدها بعد)');
            }

            // Check store daily usage
            $today = Carbon::today('Africa/Cairo');
            $storeTodayUsage = AiUsageLog::where('store_id', $storeId)
                ->where('created_at', '>=', $today)
                ->count();

            if ($storeTodayUsage >= $dailyQuota) {
                throw new RuntimeException('تجاوز المتجر الحصة اليومية المخصصة لخدمات الذكاء الاصطناعي');
            }
        }

        $estimatedCost = self::ESTIMATED_COSTS[$functionType] ?? 0.0100;

        // 4. Atomic Budget Reservation inside database transaction
        return DB::transaction(function () use ($setting, $storeId, $functionType, $estimatedCost) {
            $today = Carbon::today('Africa/Cairo');
            $startOfMonth = Carbon::now('Africa/Cairo')->startOfMonth();

            // Calculate today's settled + reserved costs
            $todaySettled = (float) AiUsageLog::where('created_at', '>=', $today)
                ->sum('estimated_cost_usd');
            $todayReserved = (float) AiBudgetReservation::where('created_at', '>=', $today)
                ->where('status', 'reserved')
                ->sum('reserved_cost_usd');

            if (($todaySettled + $todayReserved + $estimatedCost) > $setting->cost_limit_daily_usd) {
                throw new RuntimeException('تم الوصول إلى السقف المالي اليومي المحدد لخدمات الذكاء الاصطناعي');
            }

            // Calculate monthly settled + reserved costs
            if ($setting->cost_limit_monthly_usd > 0) {
                $monthSettled = (float) AiUsageLog::where('created_at', '>=', $startOfMonth)
                    ->sum('estimated_cost_usd');
                $monthReserved = (float) AiBudgetReservation::where('created_at', '>=', $startOfMonth)
                    ->where('status', 'reserved')
                    ->sum('reserved_cost_usd');

                if (($monthSettled + $monthReserved + $estimatedCost) > $setting->cost_limit_monthly_usd) {
                    throw new RuntimeException('تم الوصول إلى السقف المالي الشهري المحدد لخدمات الذكاء الاصطناعي');
                }
            }

            // Check total daily request limit
            $todayRequests = AiUsageLog::where('created_at', '>=', $today)->count() +
                AiBudgetReservation::where('created_at', '>=', $today)->where('status', 'reserved')->count();

            if ($todayRequests >= $setting->daily_request_limit) {
                throw new RuntimeException('تم الوصول إلى الحد الأقصى اليومي لطلبات الذكاء الاصطناعي');
            }

            // Create atomic reservation record
            return AiBudgetReservation::create([
                'function_type' => $functionType,
                'store_id' => $storeId,
                'reserved_cost_usd' => $estimatedCost,
                'status' => 'reserved',
                'created_at' => Carbon::now('Africa/Cairo'),
            ]);
        });
    }

    /**
     * Settle budget reservation after operation completes.
     */
    public function settleReservation(AiBudgetReservation $reservation, float $actualCostUsd): void
    {
        $reservation->update([
            'reserved_cost_usd' => $actualCostUsd,
            'status' => 'settled',
            'settled_at' => Carbon::now('Africa/Cairo'),
        ]);
    }

    /**
     * Release reservation if request fails or was cancelled before invoking provider.
     */
    public function releaseReservation(AiBudgetReservation $reservation): void
    {
        $reservation->update([
            'reserved_cost_usd' => 0.0000,
            'status' => 'released',
            'settled_at' => Carbon::now('Africa/Cairo'),
        ]);
    }
}
