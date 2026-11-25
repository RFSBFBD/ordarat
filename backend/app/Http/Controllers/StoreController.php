<?php

namespace App\Http\Controllers;

use App\Models\MerchantApplication;
use App\Models\Store;
use App\Support\BusinessLogo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;

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

    /**
     * Businesses that registered but are not approved yet. Only their name,
     * type and logo are public: no address, phone, menu or ordering.
     */
    public function pending(): JsonResponse
    {
        // Also empty before the logo migration has run, so an unmigrated
        // database degrades to "no teasers" instead of a 500.
        if (! config('ordarat.show_pending_businesses', true)
            || ! Schema::hasColumn('merchant_applications', 'logo_data')) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $items = MerchantApplication::where('status', MerchantApplication::STATUS_PENDING)
            ->whereNotNull('logo_data')
            ->latest('id')
            ->get(['id', 'business_name', 'type'])
            ->map(fn (MerchantApplication $a) => [
                'id' => $a->id,
                'name' => $a->business_name,
                'type' => $a->type,
                'logo_url' => '/api/pending-businesses/'.$a->id.'/logo',
            ]);

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function logo(Store $store)
    {
        abort_unless($store->is_active, 404);

        return $this->imageResponse($store->logo_data);
    }

    public function pendingLogo(MerchantApplication $application)
    {
        abort_unless(
            config('ordarat.show_pending_businesses', true)
                && $application->status === MerchantApplication::STATUS_PENDING,
            404
        );

        return $this->imageResponse($application->logo_data);
    }

    protected function imageResponse(?string $dataUrl)
    {
        $logo = BusinessLogo::decode($dataUrl);
        abort_if($logo === null, 404);

        return response($logo['bytes'], 200, [
            'Content-Type' => $logo['mime'],
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
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
