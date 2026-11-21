<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BranchZoneFee;
use App\Models\Store;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MerchantZoneFeeController extends Controller
{
    /**
     * List all zones in Qena City along with this branch's configured fees and coverage.
     */
    public function index(Request $request, Store $store, Branch $branch): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($branch->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'الفرع غير تابع لهذا المتجر'],
            ], 403);
        }

        $zones = Zone::where('is_active', true)->get();
        $existingFees = $branch->zoneFees()->get()->keyBy('zone_id');

        $result = $zones->map(function ($zone) use ($existingFees) {
            $fee = $existingFees->get($zone->id);

            return [
                'zone_id' => $zone->id,
                'zone_name' => $zone->name,
                'delivery_fee' => $fee ? number_format((float) $fee->delivery_fee, 2, '.', '') : '15.00',
                'is_served' => $fee ? (bool) $fee->is_served : true,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'pricing_policy' => 'STORE_OWNER_PRICED',
                'zones' => $result,
            ],
        ]);
    }

    /**
     * Store owner updates the delivery fees and coverage for each zone of this branch.
     */
    public function update(Request $request, Store $store, Branch $branch): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($branch->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'الفرع غير تابع لهذا المتجر'],
            ], 403);
        }

        $validated = $request->validate([
            'fees' => 'required|array|min:1',
            'fees.*.zone_id' => 'required|integer|exists:zones,id',
            'fees.*.delivery_fee' => 'required|numeric|min:0|max:500',
            'fees.*.is_served' => 'required|boolean',
        ]);

        $updated = [];

        foreach ($validated['fees'] as $item) {
            $record = BranchZoneFee::updateOrCreate(
                [
                    'branch_id' => $branch->id,
                    'zone_id' => $item['zone_id'],
                ],
                [
                    'delivery_fee' => number_format((float) $item['delivery_fee'], 2, '.', ''),
                    'is_served' => $item['is_served'],
                ]
            );

            $updated[] = [
                'zone_id' => $record->zone_id,
                'delivery_fee' => $record->delivery_fee,
                'is_served' => (bool) $record->is_served,
            ];
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'MERCHANT_UPDATE_ZONE_FEES',
            'auditable_type' => Branch::class,
            'auditable_id' => $branch->id,
            'new_values' => ['fees' => $updated],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم حفظ وتحديث أسعار التوصيل للمناطق بنجاح',
            'data' => $updated,
        ]);
    }
}
