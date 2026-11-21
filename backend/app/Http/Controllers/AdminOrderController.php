<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        $query = Order::with(['store', 'customer', 'branch', 'items']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->query('store_id'));
        }

        $alertTimeout = config('ordarat.unaccepted_order_alert_minutes', 10);
        $unacceptedCount = Order::where('status', 'new')
            ->where('created_at', '<=', Carbon::now()->subMinutes($alertTimeout))
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'orders' => $query->latest()->get(),
                'unaccepted_alert_count' => $unacceptedCount,
                'alert_timeout_minutes' => $alertTimeout,
            ],
        ]);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:new,accepted,preparing,out_for_delivery,delivered,cancelled,rejected',
            'reason' => 'required|string|max:500', // Mandatory reason for manual admin override
        ]);

        $oldStatus = $order->status;
        $order->update([
            'status' => $validated['status'],
            'rejection_reason' => $validated['status'] === 'rejected' ? $validated['reason'] : $order->rejection_reason,
        ]);

        $order->statusHistory()->create([
            'changed_by_user_id' => $request->user()->id,
            'from_status' => $oldStatus,
            'to_status' => $validated['status'],
            'note' => 'تعديل يدوي من الأدمن: '.$validated['reason'],
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'MANUAL_ORDER_STATUS_UPDATE',
            'auditable_type' => Order::class,
            'auditable_id' => $order->id,
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['status' => $validated['status'], 'reason' => $validated['reason']],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $order->fresh(['statusHistory']),
        ]);
    }
}
