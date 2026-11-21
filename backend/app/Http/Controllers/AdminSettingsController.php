<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        $settings = [
            'subscription_contact_number' => SystemSetting::get('subscription_contact_number', config('ordarat.subscription_contact_number')),
            'unaccepted_order_alert_minutes' => (int) SystemSetting::get('unaccepted_order_alert_minutes', config('ordarat.unaccepted_order_alert_minutes', 10)),
            'order_rate_limit_per_minute' => (int) SystemSetting::get('order_rate_limit_per_minute', config('ordarat.order_rate_limit_per_minute', 5)),
            'max_image_upload_mb' => (int) SystemSetting::get('max_image_upload_mb', config('ordarat.max_image_upload_mb', 2)),
            'qena_city_only' => true,
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'مش مسموحلك تفتح الصفحة دي'],
            ], 403);
        }

        $validated = $request->validate([
            'subscription_contact_number' => 'nullable|string|max:50',
            'unaccepted_order_alert_minutes' => 'nullable|integer|min:1|max:120',
            'order_rate_limit_per_minute' => 'nullable|integer|min:1|max:60',
            'max_image_upload_mb' => 'nullable|integer|min:1|max:20',
        ]);

        $oldValues = [];
        $newValues = [];

        foreach ($validated as $key => $value) {
            if ($value !== null) {
                $oldValues[$key] = SystemSetting::get($key, config("ordarat.{$key}"));
                SystemSetting::set($key, $value);
                $newValues[$key] = $value;
            }
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UPDATE_SYSTEM_SETTINGS',
            'auditable_type' => SystemSetting::class,
            'auditable_id' => null,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم حفظ الإعدادات بنجاح',
            'data' => $this->index($request)->getData(true)['data'],
        ]);
    }
}
