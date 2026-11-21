<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class StoreController extends Controller
{
    public function index(): JsonResponse
    {
        $stores = Store::where('is_active', true)
            ->with(['branches' => fn ($q) => $q->where('is_active', true)])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $stores,
        ]);
    }

    public function show(Store $store): JsonResponse
    {
        Gate::authorize('view', $store);

        $store->load([
            'branches' => fn ($q) => $q->where('is_active', true),
            'categories.products' => fn ($q) => $q->where('is_available', true),
            'products',
        ]);

        return response()->json([
            'success' => true,
            'data' => $store,
        ]);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_accepting_orders' => 'sometimes|boolean',
            'working_hours' => 'sometimes|array',
        ]);

        $store->update($validated);

        return response()->json([
            'success' => true,
            'data' => $store,
        ]);
    }
}
