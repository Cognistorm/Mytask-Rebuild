<?php

return [
    'token' => '',
    'uri' => 'https://api.bog.ge/payments/v1/ecommerce/orders',
    'auth_url' => 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
    'success_uri' => env('BOG_SUCCESS_URI', 'https://mytask.ge/success'),
    'fail_uri' => env('BOG_FAIL_URI', 'https://mytask.ge/fail'),
    'test_amount' => env('BOG_TEST_AMOUNT', false),

    'payment_details_uri' => 'https://api.bog.ge/payments/v1/receipt/:order_id',
    'save_subscription_uri' => 'https://api.bog.ge/payments/v1/orders/:order_id/subscriptions',
    'offline_payment_uri' => 'https://api.bog.ge/payments/v1/ecommerce/orders/:parent_order_id/subscribe',
];
