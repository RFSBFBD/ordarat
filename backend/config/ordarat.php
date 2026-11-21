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
    'subscription_contact_number' => env('SUBSCRIPTION_CONTACT_NUMBER', ''),
    'subscription_whatsapp_number' => env('SUBSCRIPTION_WHATSAPP_NUMBER', ''),

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
    |--------------------------------------------------------------------------
    | Payment Method
    |--------------------------------------------------------------------------
    | Strictly Cash On Delivery (COD) per Decision 8.
    */
    'payment_method' => 'COD',
];
