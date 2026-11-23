<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AppSessionService;
use App\Services\FirebaseAuthService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    protected FirebaseAuthService $firebaseAuth;
    protected AppSessionService $sessionService;

    public function __construct(FirebaseAuthService $firebaseAuth, AppSessionService $sessionService)
    {
        $this->firebaseAuth = $firebaseAuth;
        $this->sessionService = $sessionService;
    }

    /**
     * Exchange a verified Firebase Google ID Token for an application session token.
     */
    public function session(Request $request): JsonResponse
    {
        $firebaseToken = $request->input('firebase_token') ?: $request->bearerToken();
        if (! $firebaseToken) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'رمز Firebase مطلوب لإنشاء الجلسة',
                ],
            ], 401);
        }

        try {
            $claims = $this->firebaseAuth->verifyIdToken($firebaseToken);
            $firebaseUid = $claims['sub'];
            $email = $claims['email'] ?? null;
            $emailVerified = ($claims['email_verified'] ?? false) === true;
            $trustedEmail = $emailVerified ? $email : null;
            $name = $claims['name'] ?? ($email ? explode('@', $email)[0] : 'عميل قنا');

            $user = User::where('firebase_uid', $firebaseUid)->first();

            if (! $user && $trustedEmail) {
                $existing = User::where('email', $trustedEmail)->first();
                if ($existing && $existing->firebase_uid === null) {
                    $existing->update(['firebase_uid' => $firebaseUid]);
                    $user = $existing;
                }
            }

            if (! $user) {
                $user = User::create([
                    'firebase_uid' => $firebaseUid,
                    'name' => $name,
                    'email' => $email,
                    'role' => $this->resolveInitialRole($trustedEmail),
                    'status' => 'active',
                ]);
            }

            if (! $user->isActive()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'ACCOUNT_SUSPENDED',
                        'message' => 'حسابك متوقف. اتواصل معنا',
                    ],
                ], 403);
            }

            $appToken = $this->sessionService->createSession($user, $firebaseUid);

            return response()->json([
                'success' => true,
                'token' => $appToken,
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'status' => $user->status,
                    'profile_complete' => $user->hasCompleteProfile(),
                    'onboarding_state' => $user->onboarding_state,
                ],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_TOKEN',
                    'message' => 'رمز الدخول غير صالح: '.$e->getMessage(),
                ],
            ], 401);
        }
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $application = $user->latestMerchantApplication();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role, // Server-side defined role
                'status' => $user->status,
                'profile_complete' => $user->hasCompleteProfile(),
                'onboarding_state' => $user->onboarding_state,
                'merchant_application_status' => $application?->status,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        // Egyptian phone validation rule (Decision 14 & Phase 3 rules)
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'phone' => ['required', 'string', 'regex:/^01[0125][0-9]{8}$/'],
        ], [
            'phone.regex' => 'الرقم لازم يكون مصري (يبدأ بـ01 ويتكوّن من ١١ رقم)',
            'name.required' => 'اكتب اسمك',
        ]);

        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        if ($token) {
            if (str_starts_with($token, AppSessionService::TOKEN_PREFIX)) {
                $this->sessionService->revokeSession($token);
            } else {
                // If client passed a raw Firebase JWT, blacklist it
                $this->sessionService->revokeFirebaseToken($token, time() + 3600);
            }
        }

        Auth::logout();

        return response()->json([
            'success' => true,
            'message' => 'سجّلت خروجك',
        ]);
    }

    protected function resolveInitialRole(?string $email): string
    {
        if ($email) {
            $adminEmails = array_map(
                fn ($e) => mb_strtolower(trim($e)),
                config('ordarat.admin_emails', [])
            );
            if (in_array(mb_strtolower($email), $adminEmails, true)) {
                return 'admin';
            }
        }

        return 'customer';
    }
}
