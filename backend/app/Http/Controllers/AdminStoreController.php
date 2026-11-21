<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AdminStoreController extends Controller
{
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
            'new_values' => ['name' => $store->name, 'type' => $store->type],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $store->load('branches'),
        ], 201);
    }
}
