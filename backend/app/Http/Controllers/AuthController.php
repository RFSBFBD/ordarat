<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\FirebaseAuthService;
use Firebase\JWT\JWT;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected FirebaseAuthService $firebaseAuth;

    public function __construct(FirebaseAuthService $firebaseAuth)
    {
        $this->firebaseAuth = $firebaseAuth;
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ], [
            'email.required' => 'أدخل البريد الإلكتروني',
            'email.email' => 'البريد الإلكتروني غير صالح',
            'password.required' => 'أدخل كلمة المرور',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_CREDENTIALS',
                    'message' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                ],
            ], 401);
        }

        if (! $user->isActive()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ACCOUNT_SUSPENDED',
                    'message' => 'حسابك متوقف. اتواصل مع الإدارة',
                ],
            ], 403);
        }

        $key = config('app.key');
        if (str_starts_with((string) $key, 'base64:')) {
            $key = base64_decode(substr((string) $key, 7));
        }

        $payload = [
            'iss' => 'ordarat-api',
            'sub' => (string) $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => time(),
            'exp' => time() + (30 * 24 * 60 * 60),
        ];

        $token = JWT::encode($payload, $key, 'HS256');

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'status' => $user->status,
                ],
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role, // Server-side defined role
                'status' => $user->status,
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
        // Stateless token: frontend drops token, session cleared
        Auth::logout();

        return response()->json([
            'success' => true,
            'message' => 'سجّلت خروجك',
        ]);
    }
}
