<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MerchantBranchController extends Controller
{
    public function index(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        return response()->json([
            'success' => true,
            'data' => $store->branches,
        ]);
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'is_active' => 'nullable|boolean',
        ]);

        $branch = $store->branches()->create([
            'name' => $validated['name'],
            'address' => $validated['address'],
            'phone' => $validated['phone'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'data' => $branch,
        ], 201);
    }

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
            'name' => 'sometimes|string|max:255',
            'address' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'is_active' => 'sometimes|boolean',
        ]);

        $branch->update($validated);

        return response()->json([
            'success' => true,
            'data' => $branch,
        ]);
    }
}
