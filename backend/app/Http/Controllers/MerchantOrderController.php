<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MerchantOrderController extends Controller
{
    protected const ALLOWED_TRANSITIONS = [
        'new' => ['accepted', 'rejected'],
        'accepted' => ['preparing', 'cancelled'],
        'preparing' => ['out_for_delivery', 'cancelled'],
        'out_for_delivery' => ['delivered', 'cancelled'],
    ];

    public function index(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $query = $store->orders()->with(['items', 'customer', 'branch']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $newOrdersCount = $store->orders()->where('status', 'new')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'orders' => $query->latest()->get(),
                'new_orders_count' => $newOrdersCount,
                'play_audio_alert' => $newOrdersCount > 0,
            ],
        ]);
    }

    public function updateStatus(Request $request, Store $store, Order $order): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($order->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'الطلب غير تابع لهذا المتجر'],
            ], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:accepted,preparing,out_for_delivery,delivered,cancelled,rejected',
            'reason' => 'required_if:status,rejected|nullable|string|max:500',
        ]);

        $currentStatus = $order->status;
        $targetStatus = $validated['status'];

        $allowed = self::ALLOWED_TRANSITIONS[$currentStatus] ?? [];
        if (! in_array($targetStatus, $allowed, true)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_STATUS_TRANSITION',
                    'message' => "لا يمكن الانتقال من حالة {$currentStatus} إلى {$targetStatus}",
                ],
            ], 422);
        }

        $order->update([
            'status' => $targetStatus,
            'rejection_reason' => $targetStatus === 'rejected' ? $validated['reason'] : $order->rejection_reason,
        ]);

        $order->statusHistory()->create([
            'changed_by_user_id' => $request->user()->id,
            'from_status' => $currentStatus,
            'to_status' => $targetStatus,
            'note' => $targetStatus === 'rejected' ? $validated['reason'] : null,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'MERCHANT_UPDATE_ORDER_STATUS',
            'auditable_type' => Order::class,
            'auditable_id' => $order->id,
            'old_values' => ['status' => $currentStatus],
            'new_values' => ['status' => $targetStatus, 'reason' => $validated['reason'] ?? null],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $order->fresh(['statusHistory', 'items']),
        ]);
    }
}
