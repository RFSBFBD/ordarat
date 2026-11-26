<?php

namespace App\Http\Controllers;

use App\Models\MerchantApplication;
use App\Services\CheckoutService;
use App\Support\BusinessLogo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Unified Google sign-in onboarding. One login for everyone; the browser
 * only records what the user WANTS to be. Actual privileges are granted
 * exclusively server-side: customers complete their profile (now or at
 * first order), business owners submit a join application that an admin
 * must approve before any merchant role exists.
 */
class OnboardingController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $application = $user->latestMerchantApplication();

        return response()->json([
            'success' => true,
            'data' => [
                'profile_complete' => $user->hasCompleteProfile(),
                'onboarding_state' => $user->onboarding_state,
                'name' => $user->name,
                'phone' => $user->phone,
                'address' => $user->address,
                'merchant_application' => $application ? [
                    'id' => $application->id,
                    'business_name' => $application->business_name,
                    'status' => $application->status,
                    'admin_note' => $application->status === MerchantApplication::STATUS_REJECTED
                        ? $application->admin_note
                        : null,
                ] : null,
            ],
        ]);
    }

    public function completeCustomerProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'phone' => ['required', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'address' => 'nullable|string|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ], [
            'name.required' => 'اكتب اسمك',
            'phone.regex' => 'الرقم لازم يكون مصري (يبدأ بـ01 ويتكوّن من ١١ رقم)',
        ]);

        if (! CheckoutService::isWithinQenaBounds((float) $validated['latitude'], (float) $validated['longitude'])) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'OUT_OF_COVERAGE',
                    'message' => 'للأسف لسه مش بنوصّل للمنطقة دي. الخدمة داخل مدينة قنا بس',
                ],
            ], 422);
        }

        $user = $request->user();
        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'address' => $validated['address'] ?? null,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'profile_completed_at' => now(),
            'onboarding_state' => 'customer',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'profile_complete' => true,
                'onboarding_state' => $user->onboarding_state,
            ],
        ]);
    }

    /**
     * Completing the first-time form is mandatory for every account, whichever
     * sign-in method was used, so there is no way to defer it.
     */
    public function skip(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'PROFILE_REQUIRED',
                'message' => 'لازم تكمّل بياناتك أول مرة قبل ما تكمل',
            ],
        ], 422);
    }

    public function submitMerchantApplication(Request $request): JsonResponse
    {
        $user = $request->user();

        $pending = $user->merchantApplications()->where('status', MerchantApplication::STATUS_PENDING)->first();
        if ($pending) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'APPLICATION_ALREADY_PENDING',
                    'message' => 'طلبك مسجل عندنا وبيتمراجع دلوقتي. هنرد عليك قريب',
                ],
            ], 422);
        }

        if ($user->isMerchant()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ALREADY_MERCHANT',
                    'message' => 'حسابك متفعل كصاحب نشاط بالفعل',
                ],
            ], 422);
        }

        $validated = $request->validate([
            'business_name' => 'required|string|max:120',
            'type' => 'required|string|in:restaurant,grocery',
            'phone' => ['required', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'address' => 'required|string|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'has_branches' => 'required|boolean',
            'area_name' => 'required|string|max:120',
            'logo' => 'required|string',
            'opens_at' => ['required', 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9]$/'],
            'closes_at' => ['required', 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9]$/'],
            'commercial_register' => 'nullable|string|max:60',
            'branches' => 'nullable|array|max:10',
            'branches.*.name' => 'required|string|max:120',
            'branches.*.address' => 'required|string|max:255',
            'branches.*.phone' => ['nullable', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'branches.*.latitude' => 'required|numeric|between:-90,90',
            'branches.*.longitude' => 'required|numeric|between:-180,180',
        ], [
            'branches.*.name.required' => 'اكتب اسم كل فرع',
            'branches.*.address.required' => 'اكتب عنوان كل فرع',
            'branches.*.phone.regex' => 'رقم الفرع لازم يكون مصري (يبدأ بـ01 ويتكوّن من ١١ رقم)',
            'branches.*.latitude.required' => 'حدد موقع كل فرع',

            'business_name.required' => 'اكتب اسم النشاط',
            'type.in' => 'اختار نوع النشاط: مطعم أو بقالة',
            'phone.regex' => 'الرقم لازم يكون مصري (يبدأ بـ01 ويتكوّن من ١١ رقم)',
            'address.required' => 'اكتب عنوان النشاط',
            'area_name.required' => 'اكتب المنطقة اللي نشاطك فيها داخل قنا',
            'logo.required' => 'ارفع لوجو النشاط',
            'opens_at.required' => 'اكتب ميعاد الفتح',
            'opens_at.regex' => 'ميعاد الفتح غير صحيح',
            'closes_at.required' => 'اكتب ميعاد الإغلاق',
            'closes_at.regex' => 'ميعاد الإغلاق غير صحيح',
        ]);

        $extraBranches = $validated['branches'] ?? [];
        if ($validated['has_branches'] && count($extraBranches) === 0) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BRANCHES_REQUIRED',
                    'message' => 'ضيف فرع واحد على الأقل أو اختار إن عندك فرع واحد بس',
                ],
            ], 422);
        }
        foreach ($extraBranches as $b) {
            if (! CheckoutService::isWithinQenaBounds((float) $b['latitude'], (float) $b['longitude'])) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'OUT_OF_COVERAGE',
                        'message' => 'كل الفروع لازم تكون داخل مدينة قنا',
                    ],
                ], 422);
            }
        }

        $logo = BusinessLogo::decode($validated['logo']);
        if ($logo === null) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_LOGO',
                    'message' => 'اللوجو لازم يكون صورة PNG أو JPG أو WebP، مقاس بين ٣٢ و١٠٢٤ بكسل، وحجمها أقل من ١٥٠ كيلوبايت',
                ],
            ], 422);
        }

        if (! CheckoutService::isWithinQenaBounds((float) $validated['latitude'], (float) $validated['longitude'])) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'OUT_OF_COVERAGE',
                    'message' => 'النشاط لازم يكون داخل مدينة قنا. شارك موقع الفرع الرئيسي',
                ],
            ], 422);
        }

        $application = DB::transaction(function () use ($user, $validated, $extraBranches) {
            $application = $user->merchantApplications()->create([
            'business_name' => $validated['business_name'],
            'type' => $validated['type'],
            'phone' => $validated['phone'],
            'address' => $validated['address'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'has_branches' => $validated['has_branches'],
            'area_name' => $validated['area_name'],
            'logo_data' => $validated['logo'],
            'opens_at' => $validated['opens_at'],
            'closes_at' => $validated['closes_at'],
            'commercial_register' => $validated['commercial_register'] ?? null,
            'status' => MerchantApplication::STATUS_PENDING,
            ]);

            if ($validated['has_branches']) {
                foreach ($extraBranches as $b) {
                    $application->branches()->create([
                        'name' => $b['name'],
                        'address' => $b['address'],
                        'phone' => $b['phone'] ?? null,
                        'latitude' => $b['latitude'],
                        'longitude' => $b['longitude'],
                    ]);
                }
            }

            return $application;
        });

        $user->update(['onboarding_state' => 'merchant_applied']);

        return response()->json([
            'success' => true,
            'message' => 'طلبك وصل للإدارة وهيتراجع. هتلاقي حالة الطلب في حسابك',
            'data' => [
                'id' => $application->id,
                'status' => $application->status,
            ],
        ], 201);
    }
}
