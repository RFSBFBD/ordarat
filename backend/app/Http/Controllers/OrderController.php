<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrderController extends Controller
{
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
            'data' => $order,
        ]);
    }
}
