<?php

namespace Tradefy\Services;

use Tradefy\Config\Settings;
use Exception;

class MonerooService
{
    private $apiKey;
    private $secretKey;
    private $baseUrl;
    private $webhookSecret;

    public function __construct()
    {
        $config = Settings::getMonerooConfig();
        
        $this->apiKey = $config['api_key'];
        $this->secretKey = $config['secret_key'];
        $this->baseUrl = $config['base_url'];
        $this->webhookSecret = $config['webhook_secret'];

        if (empty($this->apiKey) || empty($this->secretKey)) {
            throw new Exception('Moneroo API credentials not configured');
        }
    }

    /**
     * Create a payment request
     */
    public function createPayment(array $paymentData): array
    {
        $requiredFields = ['amount', 'currency', 'email', 'external_id'];
        foreach ($requiredFields as $field) {
            if (empty($paymentData[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }

        $payload = [
            'amount' => $paymentData['amount'],
            'currency' => strtoupper($paymentData['currency']),
            'email' => $paymentData['email'],
            'external_id' => $paymentData['external_id'],
            'description' => $paymentData['description'] ?? 'Payment for goods/services',
            'success_url' => $paymentData['success_url'] ?? Settings::getAppUrl() . '/payment/success',
            'cancel_url' => $paymentData['cancel_url'] ?? Settings::getAppUrl() . '/payment/cancel',
            'webhook_url' => $paymentData['webhook_url'] ?? Settings::getAppUrl() . '/webhook/moneroo',
            'metadata' => $paymentData['metadata'] ?? []
        ];

        return $this->makeRequest('POST', '/payment', $payload);
    }

    /**
     * Get payment status
     */
    public function getPayment(string $paymentId): array
    {
        return $this->makeRequest('GET', "/payment/{$paymentId}");
    }

    /**
     * Get payment by external ID
     */
    public function getPaymentByExternalId(string $externalId): array
    {
        return $this->makeRequest('GET', "/payment/external/{$externalId}");
    }

    /**
     * Refund a payment
     */
    public function refundPayment(string $paymentId, ?float $amount = null): array
    {
        $payload = [];
        if ($amount !== null) {
            $payload['amount'] = $amount;
        }

        return $this->makeRequest('POST', "/payment/{$paymentId}/refund", $payload);
    }

    /**
     * Create a payout to vendor
     */
    public function createPayout(array $payoutData): array
    {
        $requiredFields = ['amount', 'currency', 'recipient_email', 'external_id'];
        foreach ($requiredFields as $field) {
            if (empty($payoutData[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }

        $payload = [
            'amount' => $payoutData['amount'],
            'currency' => strtoupper($payoutData['currency']),
            'recipient_email' => $payoutData['recipient_email'],
            'external_id' => $payoutData['external_id'],
            'description' => $payoutData['description'] ?? 'Vendor payout',
            'metadata' => $payoutData['metadata'] ?? []
        ];

        return $this->makeRequest('POST', '/payout', $payload);
    }

    /**
     * Get payout status
     */
    public function getPayout(string $payoutId): array
    {
        return $this->makeRequest('GET', "/payout/{$payoutId}");
    }

    /**
     * Get account balance
     */
    public function getBalance(): array
    {
        return $this->makeRequest('GET', '/balance');
    }

    /**
     * Verify webhook signature
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if (empty($this->webhookSecret)) {
            throw new Exception('Webhook secret not configured');
        }

        $computedSignature = hash_hmac('sha256', $payload, $this->webhookSecret);
        return hash_equals($computedSignature, $signature);
    }

    /**
     * Process webhook event
     */
    public function processWebhook(array $webhookData): array
    {
        $eventType = $webhookData['event_type'] ?? '';
        $paymentData = $webhookData['data'] ?? [];

        switch ($eventType) {
            case 'payment.succeeded':
                return $this->handlePaymentSucceeded($paymentData);
                
            case 'payment.failed':
                return $this->handlePaymentFailed($paymentData);
                
            case 'payment.refunded':
                return $this->handlePaymentRefunded($paymentData);
                
            case 'payout.succeeded':
                return $this->handlePayoutSucceeded($paymentData);
                
            case 'payout.failed':
                return $this->handlePayoutFailed($paymentData);
                
            default:
                throw new Exception("Unhandled webhook event: {$eventType}");
        }
    }

    /**
     * Handle successful payment
     */
    private function handlePaymentSucceeded(array $paymentData): array
    {
        // Extract relevant data
        $externalId = $paymentData['external_id'] ?? '';
        $amount = $paymentData['amount'] ?? 0;
        $currency = $paymentData['currency'] ?? '';
        $metadata = $paymentData['metadata'] ?? [];

        // Here you would typically:
        // 1. Update order status to 'paid'
        // 2. Release product to customer
        // 3. Calculate vendor commission
        // 4. Schedule vendor payout

        return [
            'success' => true,
            'action' => 'payment_processed',
            'external_id' => $externalId,
            'amount' => $amount,
            'currency' => $currency,
            'metadata' => $metadata
        ];
    }

    /**
     * Handle failed payment
     */
    private function handlePaymentFailed(array $paymentData): array
    {
        $externalId = $paymentData['external_id'] ?? '';
        $failureReason = $paymentData['failure_reason'] ?? 'unknown';

        // Update order status to 'failed'
        // Notify customer about payment failure

        return [
            'success' => true,
            'action' => 'payment_failed',
            'external_id' => $externalId,
            'failure_reason' => $failureReason
        ];
    }

    /**
     * Handle payment refund
     */
    private function handlePaymentRefunded(array $paymentData): array
    {
        $externalId = $paymentData['external_id'] ?? '';
        $refundAmount = $paymentData['refund_amount'] ?? 0;

        // Update order status to 'refunded'
        // Revoke product access if applicable

        return [
            'success' => true,
            'action' => 'payment_refunded',
            'external_id' => $externalId,
            'refund_amount' => $refundAmount
        ];
    }

    /**
     * Handle successful payout
     */
    private function handlePayoutSucceeded(array $payoutData): array
    {
        $externalId = $payoutData['external_id'] ?? '';
        $amount = $payoutData['amount'] ?? 0;

        // Update payout status to 'completed'
        // Notify vendor about successful payout

        return [
            'success' => true,
            'action' => 'payout_completed',
            'external_id' => $externalId,
            'amount' => $amount
        ];
    }

    /**
     * Handle failed payout
     */
    private function handlePayoutFailed(array $payoutData): array
    {
        $externalId = $payoutData['external_id'] ?? '';
        $failureReason = $payoutData['failure_reason'] ?? 'unknown';

        // Update payout status to 'failed'
        // Notify vendor and support team

        return [
            'success' => true,
            'action' => 'payout_failed',
            'external_id' => $externalId,
            'failure_reason' => $failureReason
        ];
    }

    /**
     * Calculate vendor commission and platform fee
     */
    public function calculateCommissionSplit(float $totalAmount, int $commissionRate): array
    {
        // Convert bps to percentage (450 bps = 4.5%)
        $commissionPercentage = $commissionRate / 10000;
        
        $vendorAmount = $totalAmount * (1 - $commissionPercentage);
        $platformFee = $totalAmount * $commissionPercentage;

        // Ensure amounts are positive and vendor gets at least something
        $vendorAmount = max(0, $vendorAmount);
        $platformFee = max(0, $platformFee);

        return [
            'total_amount' => round($totalAmount, 2),
            'commission_rate' => $commissionRate,
            'commission_percentage' => round($commissionPercentage * 100, 2),
            'vendor_amount' => round($vendorAmount, 2),
            'platform_fee' => round($platformFee, 2)
        ];
    }

    /**
     * Create payment for product purchase
     */
    public function createProductPayment(array $orderData, array $userData, array $productData): array
    {
        $externalId = 'order_' . uniqid();
        
        $paymentData = [
            'amount' => $orderData['total_amount'],
            'currency' => $orderData['currency'] ?? 'USD',
            'email' => $userData['email'],
            'external_id' => $externalId,
            'description' => "Purchase: {$productData['name']}",
            'metadata' => [
                'user_id' => $userData['user_id'],
                'product_id' => $productData['id'],
                'product_name' => $productData['name'],
                'vendor_id' => $productData['vendor_id'],
                'order_type' => 'product_purchase'
            ]
        ];

        return $this->createPayment($paymentData);
    }

    /**
     * Create payout for vendor
     */
    public function createVendorPayout(float $amount, string $vendorEmail, string $vendorId, string $orderId): array
    {
        $externalId = 'payout_' . uniqid();
        
        $payoutData = [
            'amount' => $amount,
            'currency' => 'USD',
            'recipient_email' => $vendorEmail,
            'external_id' => $externalId,
            'description' => "Payout for order {$orderId}",
            'metadata' => [
                'vendor_id' => $vendorId,
                'order_id' => $orderId,
                'payout_type' => 'vendor_earnings'
            ]
        ];

        return $this->createPayout($payoutData);
    }

    /**
     * Make API request to Moneroo
     */
    private function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        $url = $this->baseUrl . $endpoint;
        
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
            'X-API-Key: ' . $this->secretKey
        ];

        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        // Add request data based on method
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'GET' && !empty($data)) {
            $url .= '?' . http_build_query($data);
            curl_setopt($ch, CURLOPT_URL, $url);
        }

        // Additional options for PUT, DELETE if needed
        if ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: {$error}");
        }

        $decodedResponse = json_decode($response, true) ?? [];

        if ($httpCode >= 400) {
            $errorMessage = $decodedResponse['message'] ?? 'Unknown error occurred';
            throw new Exception("Moneroo API error ({$httpCode}): {$errorMessage}");
        }

        return $decodedResponse;
    }

    /**
     * Validate payment data before processing
     */
    public function validatePaymentData(array $paymentData): array
    {
        $errors = [];

        // Check amount
        if (!isset($paymentData['amount']) || $paymentData['amount'] <= 0) {
            $errors[] = 'Amount must be greater than 0';
        }

        // Check currency
        $allowedCurrencies = ['USD', 'EUR', 'GBP', 'XOF', 'XAF'];
        if (!isset($paymentData['currency']) || !in_array(strtoupper($paymentData['currency']), $allowedCurrencies)) {
            $errors[] = 'Invalid currency. Allowed: ' . implode(', ', $allowedCurrencies);
        }

        // Check email
        if (!isset($paymentData['email']) || !filter_var($paymentData['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Valid email is required';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Get supported currencies
     */
    public function getSupportedCurrencies(): array
    {
        return [
            'USD' => 'US Dollar',
            'EUR' => 'Euro',
            'GBP' => 'British Pound',
            'XOF' => 'West African CFA Franc',
            'XAF' => 'Central African CFA Franc'
        ];
    }

    /**
     * Format amount for display
     */
    public function formatAmount(float $amount, string $currency): string
    {
        $symbols = [
            'USD' => '$',
            'EUR' => '€',
            'GBP' => '£',
            'XOF' => 'CFA',
            'XAF' => 'CFA'
        ];

        $symbol = $symbols[$currency] ?? $currency;
        
        if (in_array($currency, ['XOF', 'XAF'])) {
            return number_format($amount, 0, '.', ' ') . ' ' . $symbol;
        } else {
            return $symbol . number_format($amount, 2, '.', ',');
        }
    }
}