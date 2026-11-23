<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Product;
use App\Models\Store;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class MerchantProductController extends Controller
{
    public function index(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $products = $store->products()->with('category')->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0|max:99999.99',
            'description' => 'nullable|string|max:1000',
            'image_url' => 'nullable|string|max:500',
            'is_available' => 'nullable|boolean',
        ]);

        if (! empty($validated['category_id'])) {
            // Ensure category belongs to store
            $catBelongs = $store->categories()->where('id', $validated['category_id'])->exists();
            if (! $catBelongs) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'INVALID_CATEGORY', 'message' => 'القسم غير تابع لهذا المتجر'],
                ], 422);
            }
        }

        $product = $store->products()->create([
            'category_id' => $validated['category_id'] ?? null,
            'name' => $validated['name'],
            'price' => number_format((float) $validated['price'], 2, '.', ''),
            'description' => $validated['description'] ?? null,
            'image_url' => $validated['image_url'] ?? null,
            'is_available' => $validated['is_available'] ?? true,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'CREATE_PRODUCT',
            'auditable_type' => Product::class,
            'auditable_id' => $product->id,
            'new_values' => $validated,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $product->load('category'),
        ], 201);
    }

    public function update(Request $request, Store $store, Product $product): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($product->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'المنتج غير تابع لهذا المتجر'],
            ], 403);
        }

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0|max:99999.99',
            'description' => 'nullable|string|max:1000',
            'image_url' => 'nullable|string|max:500',
            'is_available' => 'sometimes|boolean',
        ]);

        if (isset($validated['price'])) {
            $validated['price'] = number_format((float) $validated['price'], 2, '.', '');
        }

        $oldValues = $product->only(array_keys($validated));
        $product->update($validated);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UPDATE_PRODUCT',
            'auditable_type' => Product::class,
            'auditable_id' => $product->id,
            'old_values' => $oldValues,
            'new_values' => $validated,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $product->fresh('category'),
        ]);
    }

    public function toggleAvailability(Request $request, Store $store, Product $product): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($product->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'المنتج غير تابع لهذا المتجر'],
            ], 403);
        }

        $newStatus = ! $product->is_available;
        $product->update(['is_available' => $newStatus]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $product->id,
                'name' => $product->name,
                'is_available' => $product->is_available,
                'badge' => $product->is_available ? 'متاح' : 'خلصان',
            ],
        ]);
    }

    public function uploadImage(Request $request, Store $store, Product $product): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($product->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'المنتج غير تابع لهذا المتجر'],
            ], 403);
        }

        $maxMb = (int) SystemSetting::get('max_image_upload_mb', config('ordarat.max_image_upload_mb', 2));
        $maxKb = $maxMb * 1024;

        $request->validate([
            'image' => "required|image|mimes:jpeg,png,jpg,webp|max:{$maxKb}",
        ]);

        $disk = config('ordarat.uploads_disk', 'public');
        $path = $request->file('image')->store('products', $disk);
        $imageUrl = $disk === 'public' ? "/storage/{$path}" : Storage::disk($disk)->url($path);

        $product->update(['image_url' => $imageUrl]);

        return response()->json([
            'success' => true,
            'data' => [
                'image_url' => $imageUrl,
            ],
        ]);
    }
}
