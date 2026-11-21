<?php

namespace App\Http\Controllers;

use App\Services\Analytics\AdminAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnalyticsController extends Controller
{
    public function __construct(
        protected AdminAnalyticsService $analyticsService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصفحة مخصصة لمدير المنصة فقط'],
            ], 403);
        }

        $period = $request->query('period', 'all');
        $validPeriods = ['today', 'week', 'month', 'all'];

        if (! in_array($period, $validPeriods, true)) {
            $period = 'all';
        }

        $analytics = $this->analyticsService->getAnalytics($period);

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }
}
