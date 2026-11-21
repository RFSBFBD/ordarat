<?php

namespace App\Services\Analytics;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsService
{
    /**
     * Threshold below which individual zone order counts are collapsed into 'أخرى' for privacy.
     */
    public const PRIVACY_ZONE_THRESHOLD = 3;

    /**
     * Compute comprehensive, reliable SQL-derived analytics for Admin.
     *
     * @param  string  $period  'today' | 'week' | 'month' | 'all'
     * @return array<string, mixed>
     */
    public function getAnalytics(string $period = 'all'): array
    {
        $now = Carbon::now('Africa/Cairo');

        $startDate = match ($period) {
            'today' => $now->copy()->startOfDay(),
            'week' => $now->copy()->subDays(7)->startOfDay(),
            'month' => $now->copy()->subDays(30)->startOfDay(),
            default => null,
        };

        // 1. Users Metrics (Pure SQL)
        $totalRegisteredCustomers = User::where('role', 'customer')->count();
        $totalMerchants = User::where('role', 'merchant')->count();
        $totalBranchManagers = User::where('role', 'branch_manager')->count();

        $activeCustomersQuery = Order::query();
        if ($startDate) {
            $activeCustomersQuery->where('created_at', '>=', $startDate);
        }
        $activeCustomersInPeriod = $activeCustomersQuery->distinct('customer_id')->count('customer_id');

        // 2. Orders Metrics by Status (Pure SQL)
        $ordersBase = Order::query();
        if ($startDate) {
            $ordersBase->where('created_at', '>=', $startDate);
        }

        $totalOrdersInPeriod = (clone $ordersBase)->count();

        $statusCounts = (clone $ordersBase)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $allStatuses = ['new', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'];
        $formattedStatuses = [];
        foreach ($allStatuses as $st) {
            $formattedStatuses[$st] = (int) ($statusCounts[$st] ?? 0);
        }

        // 3. Delivered Cash Amount (Accurate terminology: Cash On Delivery only)
        $deliveredCashTotal = (float) (clone $ordersBase)
            ->where('status', 'delivered')
            ->sum('grand_total');

        // 4. Orders Grouped by Delivery Zones (with Privacy Protection - K-Anonymity)
        $zoneOrders = (clone $ordersBase)
            ->leftJoin('zones', 'orders.zone_id', '=', 'zones.id')
            ->select(
                DB::raw("COALESCE(zones.name, 'وسط البلد') as zone_name"),
                DB::raw('count(orders.id) as order_count')
            )
            ->groupBy('zone_name')
            ->orderByDesc('order_count')
            ->get();

        $aggregatedZones = [];
        $otherCount = 0;

        foreach ($zoneOrders as $zo) {
            if ($zo->order_count < self::PRIVACY_ZONE_THRESHOLD) {
                $otherCount += (int) $zo->order_count;
            } else {
                $aggregatedZones[] = [
                    'zone' => $zo->zone_name,
                    'count' => (int) $zo->order_count,
                ];
            }
        }

        if ($otherCount > 0) {
            $aggregatedZones[] = [
                'zone' => 'أخرى (مناطق متفرقة داخل قنا)',
                'count' => $otherCount,
            ];
        }

        // 5. Orders by Store and by Branch (Distinct dimensions)
        $ordersByStore = (clone $ordersBase)
            ->join('stores', 'orders.store_id', '=', 'stores.id')
            ->select('stores.id as store_id', 'stores.name as store_name', DB::raw('count(orders.id) as count'))
            ->groupBy('stores.id', 'stores.name')
            ->get()
            ->map(fn ($row) => [
                'store_id' => $row->store_id,
                'store_name' => $row->store_name,
                'orders_count' => (int) $row->count,
            ])
            ->toArray();

        $ordersByBranch = (clone $ordersBase)
            ->leftJoin('branches', 'orders.branch_id', '=', 'branches.id')
            ->select(
                DB::raw("COALESCE(branches.name, 'فرع غير محدد') as branch_name"),
                DB::raw('count(orders.id) as count')
            )
            ->groupBy('branch_name')
            ->get()
            ->map(fn ($row) => [
                'branch_name' => $row->branch_name,
                'orders_count' => (int) $row->count,
            ])
            ->toArray();

        // 6. Platform Responsiveness & Delays
        $unacceptedOrdersCount = (clone $ordersBase)
            ->where('status', 'new')
            ->where('created_at', '<=', Carbon::now('Africa/Cairo')->subMinutes(10))
            ->count();

        return [
            'period' => $period,
            'timezone' => 'Africa/Cairo',
            'generated_at' => $now->toIso8601String(),
            'definitions' => [
                'customers_registered' => 'إجمالي المستخدمين المسجلين كعملاء بالمنصة',
                'customers_active' => 'العملاء الذين قاموا بإرسال طلب واحد على الأقل خلال الفترة المحددة',
                'delivered_cash_value' => 'قيمة الطلبات المسلّمة (كاش عند الاستلام، غير محصّلة إلكترونيًا) — لا تمثل أرباح المنصة',
                'zones_privacy_rule' => 'المناطق التي يقل عدد طلباتها عن '.self::PRIVACY_ZONE_THRESHOLD.' تُدمج تلقائياً في (أخرى) لحماية خصوصية العملاء وعدم كشف إحداثياتهم',
            ],
            'users' => [
                'total_customers' => $totalRegisteredCustomers,
                'active_customers_in_period' => $activeCustomersInPeriod,
                'total_merchants' => $totalMerchants,
                'total_branch_managers' => $totalBranchManagers,
            ],
            'orders' => [
                'total_orders' => $totalOrdersInPeriod,
                'by_status' => $formattedStatuses,
                'unaccepted_delayed_count' => $unacceptedOrdersCount,
            ],
            'cash_summary' => [
                'delivered_cash_total_egp' => $deliveredCashTotal,
                'currency' => 'EGP',
                'label' => 'قيمة الطلبات المسلّمة (كاش عند الاستلام، غير محصّلة إلكترونيًا)',
            ],
            'locations_aggregated' => $aggregatedZones,
            'stores_activity' => $ordersByStore,
            'branches_activity' => $ordersByBranch,
        ];
    }
}
