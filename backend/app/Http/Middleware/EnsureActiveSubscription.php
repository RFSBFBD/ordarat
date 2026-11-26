<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adding products, categories and other menu info needs a running
 * subscription. Admins are not blocked (they set subscriptions up).
 */
class EnsureActiveSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $store = $request->route('store');
        $user = $request->user();

        if ($store instanceof Store && ! ($user && $user->isAdmin()) && ! $store->hasActiveSubscription()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'SUBSCRIPTION_REQUIRED',
                    'message' => 'نشاطك ظاهر في المنصة، بس إضافة الأطباق والمنتجات بتتفتح بعد تفعيل الاشتراك. كلّم الإدارة لتفعيله',
                ],
            ], 403);
        }

        return $next($request);
    }
}
