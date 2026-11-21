<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Store;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MerchantStoreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $stores = Store::with(['branches', 'categories'])->get();
        } else {
            $stores = $user->stores()->with(['branches', 'categories'])->get();
        }

        return response()->json([
            'success' => true,
            'data' => $stores,
        ]);
    }

    public function show(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $store->load(['branches', 'categories.products', 'products']);

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
            'image_url' => 'nullable|string|max:500',
            'is_accepting_orders' => 'sometimes|boolean',
            'working_hours' => 'nullable|array',
        ]);

        $oldValues = $store->only(array_keys($validated));
        $store->update($validated);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'MERCHANT_UPDATE_STORE',
            'auditable_type' => Store::class,
            'auditable_id' => $store->id,
            'old_values' => $oldValues,
            'new_values' => $validated,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $store->fresh(['branches', 'categories']),
        ]);
    }

    public function uploadImage(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $maxMb = (int) SystemSetting::get('max_image_upload_mb', config('ordarat.max_image_upload_mb', 2));
        $maxKb = $maxMb * 1024;

        $request->validate([
            'image' => "required|image|mimes:jpeg,png,jpg,webp|max:{$maxKb}",
        ]);

        $path = $request->file('image')->store('stores', 'public');
        $imageUrl = "/storage/{$path}";

        $store->update(['image_url' => $imageUrl]);

        return response()->json([
            'success' => true,
            'data' => [
                'image_url' => $imageUrl,
            ],
        ]);
    }
}
