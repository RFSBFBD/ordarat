<?php

use App\Http\Controllers\AdminAiController;
use App\Http\Controllers\AdminAnalyticsController;
use App\Http\Controllers\AdminAuditLogController;
use App\Http\Controllers\AdminBranchManagerController;
use App\Http\Controllers\AdminCustomerController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\AdminStoreController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchDashboardController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MerchantAiController;
use App\Http\Controllers\MerchantBranchController;
use App\Http\Controllers\MerchantCategoryController;
use App\Http\Controllers\MerchantOrderController;
use App\Http\Controllers\MerchantProductController;
use App\Http\Controllers\MerchantStoreController;
use App\Http\Controllers\MerchantZoneFeeController;
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

        // Branch Managers Management (Admin Only)
        Route::get('/branch-managers', [AdminBranchManagerController::class, 'index']);
        Route::post('/branch-managers', [AdminBranchManagerController::class, 'store']);
        Route::patch('/branch-managers/{user}/status', [AdminBranchManagerController::class, 'toggleStatus']);

        // Platform Analytics (Admin Only - Reliable SQL)
        Route::get('/analytics', [AdminAnalyticsController::class, 'index']);

        // AI Provider Settings & Operations (Admin Only)
        Route::get('/ai/settings', [AdminAiController::class, 'getSettings']);
        Route::put('/ai/settings/{functionType}', [AdminAiController::class, 'updateSettings']);
        Route::post('/ai/test-connection', [AdminAiController::class, 'testConnection']);
        Route::patch('/ai/kill-switch', [AdminAiController::class, 'toggleKillSwitch']);
        Route::get('/ai/usage-logs', [AdminAiController::class, 'getUsageLogs']);
        Route::get('/ai/stores', [AdminAiController::class, 'getStoresQuota']);
        Route::patch('/ai/stores/{store}/freeze', [AdminAiController::class, 'toggleStoreFreeze']);
        Route::post('/ai/analyze-platform', [AdminAiController::class, 'analyzePlatform']);
        Route::get('/ai/analysis-history', [AdminAiController::class, 'getAnalysisHistory']);
    });

    // Branch Manager Endpoints (Branch Dashboard)
    Route::prefix('branch')->group(function () {
        Route::get('/dashboard', [BranchDashboardController::class, 'dashboard']);
        Route::get('/orders', [BranchDashboardController::class, 'orders']);
        Route::patch('/status', [BranchDashboardController::class, 'toggleStatus']);
        Route::patch('/orders/{order}/status', [BranchDashboardController::class, 'updateOrderStatus']);
    });

    // Merchant / Store Owner Endpoints
    Route::prefix('merchant')->group(function () {
        Route::get('/stores', [MerchantStoreController::class, 'index']);
        Route::get('/stores/{store}', [MerchantStoreController::class, 'show']);
        Route::put('/stores/{store}', [MerchantStoreController::class, 'update']);
        Route::post('/stores/{store}/upload-image', [MerchantStoreController::class, 'uploadImage']);

        // Branches & Zone Pricing (Store Owner Priced)
        Route::get('/stores/{store}/branches', [MerchantBranchController::class, 'index']);
        Route::post('/stores/{store}/branches', [MerchantBranchController::class, 'store']);
        Route::put('/stores/{store}/branches/{branch}', [MerchantBranchController::class, 'update']);
        Route::get('/stores/{store}/branches/{branch}/zones', [MerchantZoneFeeController::class, 'index']);
        Route::put('/stores/{store}/branches/{branch}/zones', [MerchantZoneFeeController::class, 'update']);

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

        // Store Owner AI Tools (Menu OCR Draft & Illustrative Images)
        Route::post('/stores/{store}/ai/ocr-menu', [MerchantAiController::class, 'extractMenu']);
        Route::get('/stores/{store}/ai/menu-drafts', [MerchantAiController::class, 'listMenuDrafts']);
        Route::patch('/stores/{store}/ai/menu-draft-items/{item}', [MerchantAiController::class, 'updateDraftItem']);
        Route::post('/stores/{store}/ai/menu-drafts/{draft}/import', [MerchantAiController::class, 'importDraft']);
        Route::post('/stores/{store}/ai/generate-product-image', [MerchantAiController::class, 'generateProductImage']);
        Route::post('/stores/{store}/ai/images/{image}/approve', [MerchantAiController::class, 'approveImage']);
    });

    Route::put('/stores/{store}', [StoreController::class, 'update']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});
