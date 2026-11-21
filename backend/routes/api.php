<?php

use App\Http\Controllers\AdminAuditLogController;
use App\Http\Controllers\AdminCustomerController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\AdminStoreController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MerchantBranchController;
use App\Http\Controllers\MerchantCategoryController;
use App\Http\Controllers\MerchantOrderController;
use App\Http\Controllers\MerchantProductController;
use App\Http\Controllers\MerchantStoreController;
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
Route::post('/checkout/quote', [CheckoutController::class, 'quote']);

// Protected Endpoints (Firebase ID Token verification)
Route::middleware('firebase.auth')->group(function () {
    // Auth & Profile
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Customer Checkout (Rate limited)
    Route::post('/checkout', [CheckoutController::class, 'checkout'])->middleware('throttle:order_submission');

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

    // Merchant / Store Owner Endpoints
    Route::prefix('merchant')->group(function () {
        Route::get('/stores', [MerchantStoreController::class, 'index']);
        Route::get('/stores/{store}', [MerchantStoreController::class, 'show']);
        Route::put('/stores/{store}', [MerchantStoreController::class, 'update']);
        Route::post('/stores/{store}/upload-image', [MerchantStoreController::class, 'uploadImage']);

        // Branches
        Route::get('/stores/{store}/branches', [MerchantBranchController::class, 'index']);
        Route::post('/stores/{store}/branches', [MerchantBranchController::class, 'store']);
        Route::put('/stores/{store}/branches/{branch}', [MerchantBranchController::class, 'update']);

        // Categories
        Route::get('/stores/{store}/categories', [MerchantCategoryController::class, 'index']);
        Route::post('/stores/{store}/categories', [MerchantCategoryController::class, 'store']);
        Route::put('/stores/{store}/categories/{category}', [MerchantCategoryController::class, 'update']);
        Route::delete('/stores/{store}/categories/{category}', [MerchantCategoryController::class, 'destroy']);

        // Products
        Route::get('/stores/{store}/products', [MerchantProductController::class, 'index']);
        Route::post('/stores/{store}/products', [MerchantProductController::class, 'store']);
        Route::put('/stores/{store}/products/{product}', [MerchantProductController::class, 'update']);
        Route::patch('/stores/{store}/products/{product}/toggle-availability', [MerchantProductController::class, 'toggleAvailability']);
        Route::post('/stores/{store}/products/{product}/upload-image', [MerchantProductController::class, 'uploadImage']);

        // Orders
        Route::get('/stores/{store}/orders', [MerchantOrderController::class, 'index']);
        Route::patch('/stores/{store}/orders/{order}/status', [MerchantOrderController::class, 'updateStatus']);
    });

    Route::put('/stores/{store}', [StoreController::class, 'update']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});
