<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchDashboardController extends Controller
{
    protected const ALLOWED_TRANSITIONS = [
        'new' => ['accepted', 'rejected'],
        'accepted' => ['preparing', 'cancelled'],
        'preparing' => ['out_for_delivery', 'cancelled'],
        'out_for_delivery' => ['delivered', 'cancelled'],
    ];

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $branch = $user->managedBranch();

        if (! $branch) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NO_BRANCH_ASSIGNED', 'message' => 'لا يوجد فرع مرتبط بهذا الحساب'],
            ], 403);
        }

        $branch->load('store');

        $newOrdersCount = $branch->orders()->where('status', 'new')->count();
        $inProgressCount = $branch->orders()->whereIn('status', ['accepted', 'preparing', 'out_for_delivery'])->count();
        $deliveredCount = $branch->orders()->where('status', 'delivered')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'branch' => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'address' => $branch->address,
                    'phone' => $branch->phone,
                    'is_active' => $branch->is_active,
                    'is_accepting_orders' => $branch->is_accepting_orders,
                    'working_hours' => $branch->working_hours,
                    'store_name' => $branch->store->name,
                    'store_type' => $branch->store->type,
                ],
                'stats' => [
                    'new_orders' => $newOrdersCount,
                    'in_progress_orders' => $inProgressCount,
                    'delivered_orders' => $deliveredCount,
                ],
                'play_audio_alert' => $newOrdersCount > 0,
            ],
        ]);
    }

    public function orders(Request $request): JsonResponse
    {
        $user = $request->user();
        $branch = $user->managedBranch();

        if (! $branch) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NO_BRANCH_ASSIGNED', 'message' => 'لا يوجد فرع مرتبط بهذا الحساب'],
            ], 403);
        }

        $query = $branch->orders()->with(['items', 'customer', 'zone']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $orders = $query->latest()->get();
        $newOrdersCount = $branch->orders()->where('status', 'new')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'orders' => $orders,
                'new_orders_count' => $newOrdersCount,
                'play_audio_alert' => $newOrdersCount > 0,
            ],
        ]);
    }

    public function toggleStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $branch = $user->managedBranch();

        if (! $branch) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NO_BRANCH_ASSIGNED', 'message' => 'لا يوجد فرع مرتبط بهذا الحساب'],
            ], 403);
        }

        $validated = $request->validate([
            'is_accepting_orders' => 'sometimes|boolean',
            'working_hours' => 'nullable|array',
        ]);

        $branch->update($validated);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'BRANCH_MANAGER_UPDATE_STATUS',
            'auditable_type' => Branch::class,
            'auditable_id' => $branch->id,
            'new_values' => $validated,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث حالة الفرع بنجاح',
            'data' => [
                'id' => $branch->id,
                'is_accepting_orders' => $branch->is_accepting_orders,
                'working_hours' => $branch->working_hours,
            ],
        ]);
    }

    public function updateOrderStatus(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();
        $branch = $user->managedBranch();

        if (! $branch) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NO_BRANCH_ASSIGNED', 'message' => 'لا يوجد فرع مرتبط بهذا الحساب'],
            ], 403);
        }

        // Strict Branch Isolation check
        if ($order->branch_id !== $branch->id) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'الطلب ده مش على فرعك',
                ],
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
            'changed_by_user_id' => $user->id,
            'from_status' => $currentStatus,
            'to_status' => $targetStatus,
            'note' => $targetStatus === 'rejected' ? $validated['reason'] : null,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'BRANCH_MANAGER_UPDATE_ORDER_STATUS',
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
