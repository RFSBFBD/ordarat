<?php

use App\Http\Controllers\AdminStoreController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\StoreController;
use Illuminate\Support\Facades\Route;

// Public Routes
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

// Authenticated Routes
Route::middleware('auth')->group(function () {
    // Store Management
    Route::put('/stores/{store}', [StoreController::class, 'update']);

    // Admin Store Account Opening (Decision 3)
    Route::post('/admin/stores', [AdminStoreController::class, 'store']);

    // Orders
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});
