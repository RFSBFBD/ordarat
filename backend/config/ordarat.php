<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Platform Scope & Geography
    |--------------------------------------------------------------------------
    |
    | Ordarat is strictly confined to Qena City only.
    |
    */
    'city' => env('ORDARAT_CITY', 'قنا'),
    'city_slug' => env('ORDARAT_CITY_SLUG', 'qena'),

    /*
    |--------------------------------------------------------------------------
    | Merchant Subscription Contact (Decision 15)
    |--------------------------------------------------------------------------
    |
    | Configurable contact number for prospective store owners to subscribe.
    | Must remain empty or use placeholder until explicitly supplied.
    |
    */
    'subscription_contact_number' => env('SUBSCRIPTION_CONTACT_NUMBER', '+201055370118'),
    'subscription_whatsapp_number' => env('SUBSCRIPTION_WHATSAPP_NUMBER', '+201055370118'),

    /*
    |--------------------------------------------------------------------------
    | Order & Delivery Configuration
    |--------------------------------------------------------------------------
    */
    'currency' => env('ORDARAT_CURRENCY', 'EGP'),
    'currency_symbol' => env('ORDARAT_CURRENCY_SYMBOL', 'جنيه'),
    'unaccepted_order_alert_minutes' => (int) env('UNACCEPTED_ORDER_ALERT_MINUTES', 10),
    'order_rate_limit_per_minute' => (int) env('ORDER_RATE_LIMIT_PER_MINUTE', 5),
    'max_image_upload_mb' => (int) env('MAX_IMAGE_UPLOAD_MB', 4),

    /*
     * Filesystem disk used for merchant-uploaded store/product images.
     * Keep "public" for local development; set UPLOADS_DISK=neon after
     * configuring Neon Object Storage (see docs/NEON_SETUP.md).
     */
    'uploads_disk' => env('UPLOADS_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Payment Method
    |--------------------------------------------------------------------------
    | Strictly Cash On Delivery (COD) per Decision 8.
    */
    'payment_method' => 'COD',
];
