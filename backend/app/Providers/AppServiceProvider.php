<?php

namespace App\Providers;

use App\Models\SystemSetting;
use App\Services\FirebaseAuthService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(FirebaseAuthService::class, function () {
            return new FirebaseAuthService;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Global API Rate Limiter (60 requests per minute)
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Checkout / Order Submission Rate Limiter
        RateLimiter::for('order_submission', function (Request $request) {
            $limitPerMinute = (int) SystemSetting::get(
                'order_rate_limit_per_minute',
                config('ordarat.order_rate_limit_per_minute', 5)
            );

            $identifier = $request->bearerToken() ?: ($request->user()?->id ?: $request->ip());

            return Limit::perMinute($limitPerMinute)->by($identifier);
        });
    }
}
