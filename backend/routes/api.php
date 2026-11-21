<?php

use App\Http\Controllers\AdminAuditLogController;
use App\Http\Controllers\AdminCustomerController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\AdminStoreController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\StoreController;
use Illuminate\Support\Facades\Route;

// Public Endpoints
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => 'Ordarat API',
        'environment' => config('app.env'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/stores', [StoreController::class, 'index']);
Route::get('/stores/{store}', [StoreController::class, 'show']);

// Protected Endpoints (Firebase ID Token verification)
Route::middleware('firebase.auth')->group(function () {
    // Auth & Profile
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Admin Endpoints
    Route::prefix('admin')->group(function () {
        Route::get('/stores', [AdminStoreController::class, 'index']);
        Route::post('/stores', [AdminStoreController::class, 'store']);
        Route::patch('/stores/{store}/status', [AdminStoreController::class, 'toggleStatus']);

        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus']);

        Route::get('/customers', [AdminCustomerController::class, 'index']);
        Route::patch('/customers/{user}/status', [AdminCustomerController::class, 'toggleStatus']);

        Route::get('/settings', [AdminSettingsController::class, 'index']);
        Route::put('/settings', [AdminSettingsController::class, 'update']);

        Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);
    });

    // Stores (Management & Updates by owners)
    Route::put('/stores/{store}', [StoreController::class, 'update']);

    // Orders
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});
