<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        $query = AuditLog::with('user');

        if ($request->has('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->limit(100)->get(),
        ]);
    }
}
