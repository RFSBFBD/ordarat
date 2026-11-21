<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MerchantCategoryController extends Controller
{
    public function index(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        return response()->json([
            'success' => true,
            'data' => $store->categories()->orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $category = $store->categories()->create([
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json([
            'success' => true,
            'data' => $category,
        ], 201);
    }

    public function update(Request $request, Store $store, Category $category): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($category->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'القسم غير تابع لهذا المتجر'],
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $category->update($validated);

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    public function destroy(Request $request, Store $store, Category $category): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($category->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'القسم غير تابع لهذا المتجر'],
            ], 403);
        }

        // Dissociate products before deleting category
        $store->products()->where('category_id', $category->id)->update(['category_id' => null]);
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف القسم بنجاح',
        ]);
    }
}
