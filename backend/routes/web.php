<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'Ordarat Platform API',
        'city' => 'Qena',
        'status' => 'operational'
    ]);
});

Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => 'Ordarat API',
        'environment' => config('app.env'),
        'timestamp' => now()->toIso8601String(),
    ]);
});
