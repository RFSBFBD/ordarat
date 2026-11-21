<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AdminStoreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('create', Store::class); // Admin check

        $query = Store::with(['branches', 'users']);

        if ($request->has('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Store::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:restaurant,grocery',
            'owner_id' => 'required|exists:users,id',
            'branch_name' => 'required|string|max:255',
            'branch_address' => 'required|string|max:255',
            'branch_phone' => 'nullable|string|max:20',
        ]);

        $store = Store::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'is_active' => true,
            'is_accepting_orders' => true,
        ]);

        $store->users()->attach($validated['owner_id']);

        $store->branches()->create([
            'name' => $validated['branch_name'],
            'address' => $validated['branch_address'],
            'phone' => $validated['branch_phone'] ?? null,
            'is_active' => true,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'OPEN_STORE_ACCOUNT',
            'auditable_type' => Store::class,
            'auditable_id' => $store->id,
            'new_values' => ['name' => $store->name, 'type' => $store->type, 'owner_id' => $validated['owner_id']],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $store->load(['branches', 'users']),
        ], 201);
    }

    public function toggleStatus(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('create', Store::class);

        $validated = $request->validate([
            'is_active' => 'required|boolean',
            'reason' => 'required|string|max:500',
        ]);

        $oldStatus = $store->is_active;
        $store->update(['is_active' => $validated['is_active']]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $validated['is_active'] ? 'ACTIVATE_STORE' : 'SUSPEND_STORE',
            'auditable_type' => Store::class,
            'auditable_id' => $store->id,
            'old_values' => ['is_active' => $oldStatus],
            'new_values' => ['is_active' => $validated['is_active'], 'reason' => $validated['reason']],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $store,
        ]);
    }
}
