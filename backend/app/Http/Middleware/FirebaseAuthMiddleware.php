<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\FirebaseAuthService;
use Closure;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class FirebaseAuthMiddleware
{
    protected FirebaseAuthService $firebaseAuth;

    public function __construct(FirebaseAuthService $firebaseAuth)
    {
        $this->firebaseAuth = $firebaseAuth;
    }

    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = $request->header('Authorization');

        // If no Bearer token provided, check if user authenticated via test helper actingAs()
        if ((! $authHeader || ! str_starts_with($authHeader, 'Bearer ')) && (Auth::check() || $request->user())) {
            $user = $request->user()->fresh() ?: $request->user();
            if ($user && ! $user->isActive()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'ACCOUNT_SUSPENDED',
                        'message' => 'حسابك متوقف. اتواصل معنا',
                    ],
                ], 403);
            }

            return $next($request);
        }

        if (! $authHeader || ! str_starts_with($authHeader, 'Bearer ')) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'لازم تسجّل دخول للمتابعة',
                ],
            ], 401);
        }

        $token = substr($authHeader, 7);

        // 1. Check if token is an internal Ordarat token (issued for merchants, branch managers, admins)
        $appKey = config('app.key');
        if (str_starts_with((string) $appKey, 'base64:')) {
            $appKey = base64_decode(substr((string) $appKey, 7));
        }

        try {
            $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($appKey, 'HS256'));
            $claims = (array) $decoded;

            if (($claims['iss'] ?? '') === 'ordarat-api' && ! empty($claims['sub'])) {
                $user = User::find($claims['sub']);
                if (! $user) {
                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'USER_NOT_FOUND',
                            'message' => 'المستخدم غير موجود',
                        ],
                    ], 401);
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

                Auth::setUser($user);
                $request->setUserResolver(fn () => $user);

                return $next($request);
            }
        } catch (\Firebase\JWT\ExpiredException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TOKEN_EXPIRED',
                    'message' => 'انتهت صلاحية الجلسة. سجّل دخولك من جديد',
                ],
            ], 401);
        } catch (Exception $e) {
            // Not an internal HS256 token, proceed to Firebase RS256 token validation
        }

        try {
            $claims = $this->firebaseAuth->verifyIdToken($token);
            $firebaseUid = $claims['sub'];
            $email = $claims['email'] ?? null;
            $name = $claims['name'] ?? ($email ? explode('@', $email)[0] : 'عميل قنا');

            // Find or create user. Role is ALWAYS set by database (Decision 3 & Phase 3 rules)
            $user = User::where('firebase_uid', $firebaseUid)->first();

            if (! $user && $email) {
                // Link if existing email was registered
                $user = User::where('email', $email)->first();
                if ($user) {
                    $user->update(['firebase_uid' => $firebaseUid]);
                }
            }

            if (! $user) {
                $user = User::create([
                    'firebase_uid' => $firebaseUid,
                    'name' => $name,
                    'email' => $email,
                    'role' => 'customer', // strictly server-side default
                    'status' => 'active',
                ]);
            }

            // Strict server-side account suspension check (Phase 3 requirement)
            if (! $user->isActive()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'ACCOUNT_SUSPENDED',
                        'message' => 'حسابك متوقف. اتواصل معنا',
                    ],
                ], 403);
            }

            Auth::setUser($user);
            $request->setUserResolver(fn () => $user);

            return $next($request);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_TOKEN',
                    'message' => 'رمز الدخول غير صالح أو منتهي الصلاحية: '.$e->getMessage(),
                ],
            ], 401);
        }
    }
}
