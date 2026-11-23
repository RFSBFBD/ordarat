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

        try {
            $claims = $this->firebaseAuth->verifyIdToken($token);
            $firebaseUid = $claims['sub'];
            $email = $claims['email'] ?? null;
            // Roles and account linking may ONLY rely on an email that Google
            // itself verified inside the signed token. A frontend-supplied
            // email or role is never accepted as proof.
            $emailVerified = ($claims['email_verified'] ?? false) === true;
            $trustedEmail = $emailVerified ? $email : null;
            $name = $claims['name'] ?? ($email ? explode('@', $email)[0] : 'عميل قنا');

            // Find or create user. Role is ALWAYS set by database (Decision 3 & Phase 3 rules)
            $user = User::where('firebase_uid', $firebaseUid)->first();

            if (! $user && $trustedEmail) {
                // Link if existing email was registered (admin / branch manager / merchant)
                $user = User::where('email', $trustedEmail)->first();
                if ($user) {
                    $user->update(['firebase_uid' => $firebaseUid]);
                }
            }

            // An unverified Google email must never collide with an existing
            // account: refuse instead of linking or duplicating.
            if (! $user && $email && ! $trustedEmail && User::where('email', $email)->exists()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'EMAIL_NOT_VERIFIED',
                        'message' => 'بريدك في جوجل غير موثّق. وثّق بريدك من حساب Google ثم سجّل دخولك تاني',
                    ],
                ], 401);
            }

            if (! $user) {
                $user = User::create([
                    'firebase_uid' => $firebaseUid,
                    'name' => $name,
                    'email' => $email,
                    'role' => $this->resolveInitialRole($trustedEmail), // strictly server-side
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

    /**
     * Initial role for a brand-new Firebase user. Everyone starts as a
     * customer; only emails explicitly listed in the ADMIN_EMAILS server
     * environment variable bootstrap as platform admins. Merchants gain
     * their role exclusively through an approved join application.
     */
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
