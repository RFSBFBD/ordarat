<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBranchManagerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        $managers = User::where('role', 'branch_manager')
            ->with(['managedBranches.store'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $managers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'إنشاء حسابات مسؤولي الفروع متاح للأدمن فقط'],
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => ['nullable', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'branch_id' => 'required|exists:branches,id',
        ], [
            'branch_id.required' => 'اختار فرعًا',
            'branch_id.exists' => 'اختار فرعًا صالحًا',
        ]);

        $branch = Branch::with('store')->findOrFail($validated['branch_id']);

        $existingUser = User::where('email', $validated['email'])->first();
        if ($existingUser) {
            if ($existingUser->role === 'branch_manager' && $existingUser->managedBranches()->where('branches.id', $branch->id)->exists()) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'ACCOUNT_EXISTS', 'message' => 'الحساب ده موجود قبل كده لهذا الفرع'],
                ], 422);
            }

            // Upgrade role if existing user was customer
            $existingUser->update([
                'role' => 'branch_manager',
                'name' => $validated['name'],
                'phone' => $validated['phone'] ?? $existingUser->phone,
            ]);
            $user = $existingUser;
        } else {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => 'branch_manager',
                'status' => 'active',
            ]);
        }

        $branch->managers()->syncWithoutDetaching([$user->id]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'CREATE_BRANCH_MANAGER',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'new_values' => [
                'user_id' => $user->id,
                'email' => $user->email,
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'store_name' => $branch->store->name,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "اتعمل حساب مسؤول فرع [{$branch->name}] بنجاح",
            'data' => $user->load('managedBranches.store'),
        ], 201);
    }

    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        if ($user->role !== 'branch_manager') {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_USER_ROLE', 'message' => 'المستخدم ليس مسؤول فرع'],
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
            'action' => $validated['status'] === 'suspended' ? 'SUSPEND_BRANCH_MANAGER' : 'ACTIVATE_BRANCH_MANAGER',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['status' => $validated['status'], 'reason' => $validated['reason']],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $validated['status'] === 'suspended' ? 'تم تعطيل حساب مسؤول الفرع' : 'تم تفعيل حساب مسؤول الفرع',
            'data' => $user->fresh(['managedBranches']),
        ]);
    }
}
