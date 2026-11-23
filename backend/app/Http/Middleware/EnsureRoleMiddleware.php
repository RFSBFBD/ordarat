<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-side role isolation for dashboard sections.
 *
 * Usage: ->middleware('role:admin') or ->middleware('role:merchant,branch_manager')
 * Runs after firebase.auth, so $request->user() is always resolved here.
 */
class EnsureRoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'لازم تسجّل دخول للمتابعة',
                ],
            ], 401);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN_ROLE',
                    'message' => 'الحساب ده معندوش صلاحية الوصول للقسم ده',
                ],
            ], 403);
        }

        return $next($request);
    }
}
