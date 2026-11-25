<?php

namespace App\Http\Middleware;

use App\Services\AuthFailure;
use App\Services\AppSessionService;
use App\Services\FirebaseAuthService;
use Closure;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class FirebaseAuthMiddleware
{
    protected FirebaseAuthService $firebaseAuth;
    protected AppSessionService $sessionService;

    public function __construct(FirebaseAuthService $firebaseAuth, AppSessionService $sessionService)
    {
        $this->firebaseAuth = $firebaseAuth;
        $this->sessionService = $sessionService;
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

        // 1. Application session token cycle (ordarat_sess_*)
        if (str_starts_with($token, AppSessionService::TOKEN_PREFIX)) {
            $user = $this->sessionService->validateSession($token);
            if (! $user) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'UNAUTHENTICATED',
                        'message' => 'انتهت الجلسة أو تم تسجيل الخروج. سجّل دخولك تاني',
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

        // 2. Check if Firebase token was explicitly revoked on logout
        if ($this->sessionService->isFirebaseTokenRevoked($token)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'تم تسجيل الخروج من هذه الجلسة. سجّل دخولك تاني',
                ],
            ], 401);
        }

        // 3. Verify Firebase ID Token
        try {
            $claims = $this->firebaseAuth->verifyIdToken($token);
            $user = $this->firebaseAuth->resolveUser($claims);

            Auth::setUser($user);
            $request->setUserResolver(fn () => $user);

            return $next($request);
        } catch (AuthFailure $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => $e->errorCode, 'message' => $e->getMessage()],
            ], $e->status);
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
