<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        $query = User::where('role', 'customer')
            ->withCount('orders')
            ->select(['id', 'name', 'email', 'phone', 'role', 'status', 'created_at', 'profile_completed_at']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->get(),
        ]);
    }

    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        if ($user->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'CANNOT_SUSPEND_ADMIN', 'message' => 'لا يمكن إيقاف حساب الأدمن'],
            ], 422);
        }

        $validated = $request->validate([
            'status' => 'required|in:active,suspended',
            'reason' => 'required|string|max:500',
        ]);

        $oldStatus = $user->status;
        $user->update(['status' => $validated['status']]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $validated['status'] === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['status' => $validated['status'], 'reason' => $validated['reason']],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $user->fresh(),
        ]);
    }
}
