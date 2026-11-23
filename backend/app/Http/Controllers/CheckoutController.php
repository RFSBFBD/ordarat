<?php

namespace App\Http\Controllers;

use App\Services\CheckoutService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function quote(Request $request, CheckoutService $checkoutService): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'delivery_latitude' => 'required|numeric|between:-90,90',
            'delivery_longitude' => 'required|numeric|between:-180,180',
        ]);

        try {
            $quote = $checkoutService->getQuote(
                (int) $validated['store_id'],
                $validated['items'],
                (float) $validated['delivery_latitude'],
                (float) $validated['delivery_longitude']
            );

            return response()->json([
                'success' => true,
                'data' => $quote,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CHECKOUT_QUOTE_FAILED',
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }

    public function checkout(Request $request, CheckoutService $checkoutService): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'delivery_latitude' => 'required|numeric|between:-90,90',
            'delivery_longitude' => 'required|numeric|between:-180,180',
            'phone' => ['required', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'name' => 'nullable|string|max:100',
            'customer_notes' => 'nullable|string|max:500',
            'idempotency_key' => 'required|string|max:100',
        ]);

        try {
            $order = $checkoutService->placeOrder(
                $request->user(),
                (int) $validated['store_id'],
                $validated['items'],
                (float) $validated['delivery_latitude'],
                (float) $validated['delivery_longitude'],
                $validated['phone'],
                $validated['customer_notes'] ?? null,
                $validated['idempotency_key'],
                $validated['name'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => $order->wasRecentlyCreated ? 'تم استلام طلبك بنجاح وجاري إرساله للمتجر' : 'تم استرجاع طلبك السابق',
                'data' => $order,
            ], $order->wasRecentlyCreated ? 201 : 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CHECKOUT_FAILED',
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }
}
