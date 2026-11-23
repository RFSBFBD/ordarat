<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isCustomer()) {
            $orders = Order::where('customer_id', $user->id)
                ->with(['store', 'branch', 'items'])
                ->latest()
                ->get();
        } elseif ($user->isMerchant()) {
            $storeIds = $user->stores()->pluck('stores.id');
            $orders = Order::whereIn('store_id', $storeIds)
                ->with(['customer', 'branch', 'items'])
                ->latest()
                ->get();
        } elseif ($user->isBranchManager()) {
            $branchId = $user->managedBranch()?->id;
            $orders = Order::where('branch_id', $branchId)
                ->with(['customer', 'store', 'branch', 'items'])
                ->latest()
                ->get();
        } elseif ($user->isAdmin()) {
            $orders = Order::with(['customer', 'store', 'branch', 'items'])
                ->latest()
                ->get();
        } else {
            // Unknown or missing role must never expose orders.
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN_ROLE',
                    'message' => 'الحساب ده معندوش صلاحية عرض الطلبات',
                ],
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        Gate::authorize('view', $order);

        $order->load(['items', 'store', 'branch', 'statusHistory']);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        Gate::authorize('updateStatus', $order);

        $validated = $request->validate([
            'status' => 'required|in:accepted,preparing,out_for_delivery,delivered,cancelled,rejected',
            'note' => 'nullable|string|max:500',
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $fromStatus = $order->status;

        // Enforce a strict status lifecycle so orders cannot jump backwards
        // or skip stages (e.g. delivered -> new, or new -> delivered).
        $allowedTransitions = [
            'new' => ['accepted', 'rejected', 'cancelled'],
            'accepted' => ['preparing', 'cancelled'],
            'preparing' => ['out_for_delivery', 'cancelled'],
            'out_for_delivery' => ['delivered'],
            'delivered' => [],
            'cancelled' => [],
            'rejected' => [],
        ];

        if (! in_array($validated['status'], $allowedTransitions[$fromStatus] ?? [], true)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_STATUS_TRANSITION',
                    'message' => "لا يمكن نقل الطلب من حالة ({$fromStatus}) إلى ({$validated['status']})",
                ],
            ], 422);
        }

        $order->update([
            'status' => $validated['status'],
            'rejection_reason' => $validated['rejection_reason'] ?? $order->rejection_reason,
        ]);

        $order->statusHistory()->create([
            'changed_by_user_id' => $request->user()->id,
            'from_status' => $fromStatus,
            'to_status' => $validated['status'],
            'note' => $validated['note'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $order->fresh(['statusHistory']),
        ]);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        Gate::authorize('cancel', $order);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $fromStatus = $order->status;
        $order->update([
            'status' => 'cancelled',
            'rejection_reason' => $validated['reason'] ?? 'تم الإلغاء بواسطة العميل قبل قبول المحل',
        ]);

        $order->statusHistory()->create([
            'changed_by_user_id' => $request->user()->id,
            'from_status' => $fromStatus,
            'to_status' => 'cancelled',
            'note' => $validated['reason'] ?? 'إلغاء من العميل قبل قبول الطلب',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إلغاء الطلب بنجاح',
            'data' => $order->fresh(['statusHistory']),
        ]);
    }
}
