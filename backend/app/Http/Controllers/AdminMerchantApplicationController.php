<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\MerchantApplication;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin review of business join applications. Approving is the ONLY path
 * that turns a user into a merchant: it creates the store and its main
 * branch from the application's verified data and flips the role in the
 * database. The browser can never grant this itself.
 */
class AdminMerchantApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $applications = MerchantApplication::with(['user:id,name,email,phone,status', 'branches'])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest('id')
            ->get()
            ->map(fn (MerchantApplication $a) => [
                'id' => $a->id,
                'business_name' => $a->business_name,
                'type' => $a->type,
                'phone' => $a->phone,
                'address' => $a->address,
                'has_branches' => $a->has_branches,
                'area_name' => $a->area_name,
                'opens_at' => $a->opens_at,
                'closes_at' => $a->closes_at,
                'commercial_register' => $a->commercial_register,
                'extra_branches' => $a->branches->map(fn ($b) => ['name' => $b->name, 'address' => $b->address, 'phone' => $b->phone])->values(),
                'logo_url' => $a->logo_data ? '/api/pending-businesses/'.$a->id.'/logo' : null,
                'status' => $a->status,
                'admin_note' => $a->admin_note,
                'created_at' => $a->created_at?->toIso8601String(),
                'owner' => $a->user ? [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                    'email' => $a->user->email,
                    'phone' => $a->user->phone,
                ] : null,
            ]);

        return response()->json([
            'success' => true,
            'data' => $applications,
        ]);
    }

    public function approve(Request $request, MerchantApplication $application): JsonResponse
    {
        if (! $application->isPending()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ALREADY_REVIEWED',
                    'message' => 'الطلب ده اتراجع قبل كده',
                ],
            ], 422);
        }

        $admin = $request->user();
        $owner = $application->user;
        $ip = $request->ip();

        $store = DB::transaction(function () use ($application, $admin, $owner, $ip) {
            $store = Store::create([
                'type' => $application->type,
                'name' => $application->business_name,
                'is_active' => true,
                'is_accepting_orders' => true,
                'logo_data' => $application->logo_data,
                'working_hours' => $application->opens_at && $application->closes_at
                    ? ['from' => $application->opens_at, 'to' => $application->closes_at]
                    : null,
                'commercial_register' => $application->commercial_register,
            ]);

            Branch::create([
                'store_id' => $store->id,
                'name' => 'الفرع الرئيسي',
                'address' => $application->address,
                'latitude' => $application->latitude,
                'longitude' => $application->longitude,
                'phone' => $application->phone,
                'is_active' => true,
            ]);

            foreach ($application->branches as $extra) {
                Branch::create([
                    'store_id' => $store->id,
                    'name' => $extra->name,
                    'address' => $extra->address,
                    'latitude' => $extra->latitude,
                    'longitude' => $extra->longitude,
                    'phone' => $extra->phone,
                    'is_active' => true,
                ]);
            }

            $store->users()->syncWithoutDetaching([$owner->id]);
            $owner->update(['role' => 'merchant', 'onboarding_state' => 'merchant_approved']);

            $application->update([
                'status' => MerchantApplication::STATUS_APPROVED,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            AuditLog::create([
                'user_id' => $admin->id,
                'action' => 'APPROVE_MERCHANT_APPLICATION',
                'auditable_type' => MerchantApplication::class,
                'auditable_id' => $application->id,
                'new_values' => [
                    'business_name' => $application->business_name,
                    'owner_id' => $owner->id,
                    'store_id' => $store->id,
                ],
                'ip_address' => $ip,
            ]);

            return $store;
        });

        return response()->json([
            'success' => true,
            'message' => "اتفعل حساب {$application->business_name} وصاحبه بقى صاحب نشاط",
            'data' => ['store_id' => $store->id],
        ]);
    }

    public function reject(Request $request, MerchantApplication $application): JsonResponse
    {
        if (! $application->isPending()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ALREADY_REVIEWED',
                    'message' => 'الطلب ده اتراجع قبل كده',
                ],
            ], 422);
        }

        $validated = $request->validate([
            'note' => 'required|string|max:500',
        ], [
            'note.required' => 'اكتب سبب الرفض عشان يظهر لصاحب الطلب',
        ]);

        $admin = $request->user();

        $application->update([
            'status' => MerchantApplication::STATUS_REJECTED,
            'admin_note' => $validated['note'],
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $application->user?->update(['onboarding_state' => 'merchant_rejected']);

        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'REJECT_MERCHANT_APPLICATION',
            'auditable_type' => MerchantApplication::class,
            'auditable_id' => $application->id,
            'new_values' => [
                'business_name' => $application->business_name,
                'note' => $validated['note'],
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'اترفض الطلب واتسجل السبب',
        ]);
    }
}
