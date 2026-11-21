<?php

use App\Http\Middleware\FirebaseAuthMiddleware;
use App\Http\Middleware\SecurityHeadersMiddleware;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeadersMiddleware::class);
        $middleware->alias([
            'firebase.auth' => FirebaseAuthMiddleware::class,
            'throttle' => ThrottleRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = 500;
                $code = 'INTERNAL_ERROR';

                if ($e instanceof ValidationException) {
                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'VALIDATION_ERROR',
                            'message' => 'البيانات المدخلة غير صحيحة',
                            'details' => $e->errors(),
                        ],
                    ], 422);
                }

                if ($e instanceof AuthenticationException) {
                    $status = 401;
                    $code = 'UNAUTHENTICATED';
                } elseif ($e instanceof AccessDeniedHttpException || $e instanceof AuthorizationException) {
                    $status = 403;
                    $code = 'FORBIDDEN';
                } elseif ($e instanceof NotFoundHttpException || $e instanceof ModelNotFoundException) {
                    $status = 404;
                    $code = 'NOT_FOUND';
                } elseif ($e instanceof TooManyRequestsHttpException) {
                    $status = 429;
                    $code = 'RATE_LIMITED';
                } elseif ($e instanceof HttpExceptionInterface) {
                    $status = $e->getStatusCode();
                }

                $message = $e->getMessage();
                if ($status === 500 && ! config('app.debug')) {
                    $message = 'حصلت مشكلة من عندنا. جرّب كمان شوية';
                }

                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => $code,
                        'message' => $message ?: 'حدث خطأ في معالجة الطلب',
                    ],
                ], $status);
            }
        });
    })->create();
