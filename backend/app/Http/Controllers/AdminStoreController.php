<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Store;
use App\Models\User;
use App\Support\BusinessLogo;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AdminStoreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('create', Store::class); // Admin check

        $query = Store::with(['branches', 'users']);

        if ($request->has('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Store::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:restaurant,grocery',
            'owner_id' => 'required_without:owner_email|nullable|exists:users,id',
            'owner_email' => 'required_without:owner_id|nullable|email|exists:users,email',
            'branch_name' => 'required|string|max:255',
            'branch_address' => 'required|string|max:255',
            'branch_phone' => ['nullable', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'area_name' => 'nullable|string|max:120',
            'logo' => 'nullable|string',
        ], [
            'owner_email.exists' => 'مفيش حساب مسجل بالإيميل ده. صاحب النشاط لازم يسجّل الأول',
            'branch_phone.regex' => 'الرقم لازم يكون مصري (يبدأ بـ01 ويتكوّن من ١١ رقم)',
        ]);

        $owner = isset($validated['owner_id'])
            ? User::findOrFail($validated['owner_id'])
            : User::where('email', $validated['owner_email'])->firstOrFail();

        $logoData = null;
        if (! empty($validated['logo'])) {
            if (BusinessLogo::decode($validated['logo']) === null) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'INVALID_LOGO',
                        'message' => 'اللوجو لازم يكون صورة PNG أو JPG أو WebP، مقاس بين ٣٢ و١٠٢٤ بكسل، وحجمها أقل من ١٥٠ كيلوبايت',
                    ],
                ], 422);
            }
            $logoData = $validated['logo'];
        }

        $address = ! empty($validated['area_name'])
            ? $validated['area_name'].' - '.$validated['branch_address']
            : $validated['branch_address'];

        $store = DB::transaction(function () use ($validated, $owner, $logoData, $address) {
            $store = Store::create([
                'name' => $validated['name'],
                'type' => $validated['type'],
                'is_active' => true,
                'is_accepting_orders' => true,
                'logo_data' => $logoData,
            ]);

            $store->users()->syncWithoutDetaching([$owner->id]);

            $store->branches()->create([
                'name' => $validated['branch_name'],
                'address' => $address,
                'phone' => $validated['branch_phone'] ?? null,
                'is_active' => true,
            ]);

            if ($owner->role === 'customer') {
                $owner->update(['role' => 'merchant', 'onboarding_state' => 'merchant_approved']);
            }

            return $store;
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'OPEN_STORE_ACCOUNT',
            'auditable_type' => Store::class,
            'auditable_id' => $store->id,
            'new_values' => ['name' => $store->name, 'type' => $store->type, 'owner_id' => $owner->id],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $store->load(['branches', 'users']),
        ], 201);
    }

    public function toggleStatus(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('create', Store::class);

        $validated = $request->validate([
            'is_active' => 'required|boolean',
            'reason' => 'required|string|max:500',
        ]);

        $oldStatus = $store->is_active;
        $store->update(['is_active' => $validated['is_active']]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $validated['is_active'] ? 'ACTIVATE_STORE' : 'SUSPEND_STORE',
            'auditable_type' => Store::class,
            'auditable_id' => $store->id,
            'old_values' => ['is_active' => $oldStatus],
            'new_values' => ['is_active' => $validated['is_active'], 'reason' => $validated['reason']],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $store,
        ]);
    }
}
