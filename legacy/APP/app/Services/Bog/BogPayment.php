<?php

namespace App\Services\Bog;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BogPayment
{
    public function payment($config)
    {
        $token = data_get($this->auth(), 'access_token');
        $payload = [
            'callback_url' => 'https://mytask.ge/callback',
            'application_type' => 'web',
            'bayer' => [
                'full_name' => auth()->user()->fullname,
            ],
            'external_order_id' => $config['order_id'],
            'purchase_units' => [
                'currency' => 'GEL',
                'total_amount' => config('bog.test_amount') ? 0.01 : number_format($config['amount'], 2, '.', ''),
                'total_discount_amount' => 7,
                'delivery' => [
                    'amount' => 5,
                ],
                'basket' => [
                    [
                        'quantity' => 1,
                        'unit_price' => 1,
                        'product_id' => 'product123',
                    ],
                ],
            ],
            'redirect_urls' => [
                'fail' => config('bog.fail_uri') . '?key=' . $config['order_id'] . '&type=' . data_get($config, 'type', 'order'),
                'success' => config('bog.success_uri') . '?key=' . $config['order_id'] . '&type=' . data_get($config, 'type', 'order'),
            ],
        ];

        $response = Http::withHeaders([
            'Accept-Language' => 'ka',
            'Authorization' => "Bearer $token",
        ])->post(config('bog.uri'), $payload);
        Log::info('BOG Payment Response', [
            'response' => $response->json(),
            'config' => $config
        ]);

        return $response->json();
    }

    /**
     * Process a recurring/offline payment with a saved card
     *
     * @param array $config
     * @return array
     */
    public function offlinePayment(string $parentOrderId, ?float $amount = null)
    {
        $token = data_get($this->auth(), 'access_token');

        $headers = [
            'Authorization' => "Bearer {$token}",
            'Content-Type' => 'application/json',
        ];


        $body = [ 'callback_url' => 'https://mytask.ge/callback'];

        $uri = str_replace(
            ':parent_order_id',
            $parentOrderId,
            config('bog.offline_payment_uri')
        );
        $response = Http::withHeaders($headers)->post($uri, $body);

        Log::info('BOG Offline Payment Response', [
            'response' => $response->json(),
            'parentOrderId' => $parentOrderId
        ]);

        return $response->json();
    }
    /**
     * Get payment details from BOG API
     *
     * @param string $paymentId
     * @return array
     */
    public function getPaymentDetails($paymentId)
    {
        try {
            $token = data_get($this->auth(), 'access_token');
            $uri = str_replace(
                ':order_id',
                $paymentId,
                config('bog.payment_details_uri')
            );
            $response = Http::withHeaders([
                'Accept-Language' => 'ka',
                'Authorization' => "Bearer $token",
            ])->get($uri);
            Log::info('BOG Payment Details Response', [
                'response' => $response->json(),
                'paymentId' => $paymentId
            ]);
        } catch (\Exception $e) {
            return null;
        }

        return $response->json();
    }

    public function saveSubscription(string $orderId): void
    {
        $token = data_get($this->auth(), 'access_token');
        $endpoint = str_replace(':order_id', $orderId, config('bog.save_subscription_uri'));
        Http::withHeaders([
            'Accept-Language' => 'ka',
            'Authorization'   => "Bearer {$token}",
        ])->put($endpoint);
    }

    /**
     * Authenticate with BOG API
     *
     * @return array
     */
    public function auth()
    {
//        TODO
        $response = Http::withBasicAuth(29215, 'PGvu6g9auiIP')
            ->asForm()
            ->post(config('bog.auth_url'), [
                'grant_type' => 'client_credentials',
            ]);

        if ($response->successful()) {
            return $response->json();
        } else {
            return $response->json();
        }
    }
}
