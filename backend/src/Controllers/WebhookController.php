<?php

namespace Tradefy\Controllers;

use Tradefy\Services\MonerooService;
use Tradefy\Models\Order;
use Tradefy\Models\User;
use Tradefy\Services\GamificationService;
use PDO;
use Exception;

class WebhookController
{
    private $monerooService;
    private $orderModel;
    private $userModel;
    private $gamificationService;
    private $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->monerooService = new MonerooService();
        $this->orderModel = new Order($db);
        $this->userModel = new User($db);
        $this->gamificationService = new GamificationService($db);
    }

    /**
     * Process Moneroo webhook events
     */
    public function processMonerooWebhook(): array
    {
        try {
            // Get webhook payload
            $payload = file_get_contents('php://input');
            $signature = $_SERVER['HTTP_X_MONEROO_SIGNATURE'] ?? '';

            // Verify webhook signature
            if (!$this->monerooService->verifyWebhookSignature($payload, $signature)) {
                error_log('Invalid webhook signature: ' . $signature);
                return $this->errorResponse('Invalid webhook signature', 401);
            }

            // Parse webhook data
            $webhookData = json_decode($payload, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log('Invalid JSON in webhook payload: ' . $payload);
                return $this->errorResponse('Invalid JSON payload', 400);
            }

            $eventType = $webhookData['event_type'] ?? '';
            $eventData = $webhookData['data'] ?? [];

            error_log("Processing Moneroo webhook: {$eventType}");

            // Process different event types
            switch ($eventType) {
                case 'payment.succeeded':
                    return $this->handlePaymentSucceeded($eventData);
                    
                case 'payment.failed':
                    return $this->handlePaymentFailed($eventData);
                    
                case 'payment.refunded':
                    return $this->handlePaymentRefunded($eventData);
                    
                case 'payout.succeeded':
                    return $this->handlePayoutSucceeded($eventData);
                    
                case 'payout.failed':
                    return $this->handlePayoutFailed($eventData);
                    
                default:
                    error_log("Unhandled webhook event type: {$eventType}");
                    return $this->successResponse([
                        'processed' => false,
                        'message' => 'Unhandled event type'
                    ]);
            }

        } catch (Exception $e) {
            error_log('Webhook processing error: ' . $e->getMessage());
            return $this->errorResponse('Webhook processing failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Handle successful payment
     */
    private function handlePaymentSucceeded(array $paymentData): array
    {
        try {
            $externalId = $paymentData['external_id'] ?? '';
            
            if (empty($externalId)) {
                throw new Exception('Missing external_id in payment webhook');
            }

            // Find order by external ID
            $order = $this->orderModel->findByExternalId($externalId);
            if (!$order) {
                throw new Exception("Order not found for external_id: {$externalId}");
            }

            // Process the payment
            $result = $this->orderModel->processPayment($externalId);

            // Process gamification for vendor
            $this->processVendorGamification($order['vendor_id'], $order['total_amount']);

            // Create vendor payout if applicable
            if ($order['vendor_amount'] > 0) {
                $this->createVendorPayout($order);
            }

            // Log successful processing
            error_log("Payment processed successfully for order: {$externalId}");

            return $this->successResponse([
                'processed' => true,
                'order_id' => $order['id'],
                'external_id' => $externalId,
                'action' => 'payment_processed',
                'message' => 'Payment processed successfully'
            ]);

        } catch (Exception $e) {
            error_log('Error handling payment.succeeded: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle failed payment
     */
    private function handlePaymentFailed(array $paymentData): array
    {
        try {
            $externalId = $paymentData['external_id'] ?? '';
            $failureReason = $paymentData['failure_reason'] ?? 'unknown';

            if (empty($externalId)) {
                throw new Exception('Missing external_id in failed payment webhook');
            }

            // Find order by external ID
            $order = $this->orderModel->findByExternalId($externalId);
            if (!$order) {
                throw new Exception("Order not found for external_id: {$externalId}");
            }

            // Update order status
            $this->orderModel->updateStatus($order['id'], 'failed', 'payment');
            $this->orderModel->updateStatus($order['id'], 'cancelled', 'status');

            // Log payment failure
            error_log("Payment failed for order: {$externalId}, reason: {$failureReason}");

            // TODO: Notify customer about payment failure

            return $this->successResponse([
                'processed' => true,
                'order_id' => $order['id'],
                'external_id' => $externalId,
                'action' => 'payment_failed',
                'failure_reason' => $failureReason,
                'message' => 'Payment failure processed'
            ]);

        } catch (Exception $e) {
            error_log('Error handling payment.failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle payment refund
     */
    private function handlePaymentRefunded(array $paymentData): array
    {
        try {
            $externalId = $paymentData['external_id'] ?? '';
            $refundAmount = $paymentData['refund_amount'] ?? 0;

            if (empty($externalId)) {
                throw new Exception('Missing external_id in refund webhook');
            }

            // Find order by external ID
            $order = $this->orderModel->findByExternalId($externalId);
            if (!$order) {
                throw new Exception("Order not found for external_id: {$externalId}");
            }

            // Update order status
            $this->orderModel->updateStatus($order['id'], 'refunded', 'payment');
            $this->orderModel->updateStatus($order['id'], 'refunded', 'status');

            // Log refund
            error_log("Payment refunded for order: {$externalId}, amount: {$refundAmount}");

            // TODO: Notify customer and vendor about refund
            // TODO: Handle inventory restoration if physical product

            return $this->successResponse([
                'processed' => true,
                'order_id' => $order['id'],
                'external_id' => $externalId,
                'action' => 'payment_refunded',
                'refund_amount' => $refundAmount,
                'message' => 'Payment refund processed'
            ]);

        } catch (Exception $e) {
            error_log('Error handling payment.refunded: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle successful payout
     */
    private function handlePayoutSucceeded(array $payoutData): array
    {
        try {
            $externalId = $payoutData['external_id'] ?? '';
            $payoutAmount = $payoutData['amount'] ?? 0;

            if (empty($externalId)) {
                throw new Exception('Missing external_id in payout webhook');
            }

            // Extract order external ID from payout external ID
            // Format: payout_ord_xxxxx
            $orderExternalId = str_replace('payout_', '', $externalId);

            // Find order by external ID
            $order = $this->orderModel->findByExternalId($orderExternalId);
            if (!$order) {
                throw new Exception("Order not found for payout external_id: {$externalId}");
            }

            // Update payout status
            $this->orderModel->updateStatus($order['id'], 'paid', 'payout');

            // Log successful payout
            error_log("Payout completed for order: {$orderExternalId}, amount: {$payoutAmount}");

            // TODO: Notify vendor about successful payout

            return $this->successResponse([
                'processed' => true,
                'order_id' => $order['id'],
                'external_id' => $externalId,
                'action' => 'payout_completed',
                'payout_amount' => $payoutAmount,
                'message' => 'Payout completed'
            ]);

        } catch (Exception $e) {
            error_log('Error handling payout.succeeded: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle failed payout
     */
    private function handlePayoutFailed(array $payoutData): array
    {
        try {
            $externalId = $payoutData['external_id'] ?? '';
            $failureReason = $payoutData['failure_reason'] ?? 'unknown';

            if (empty($externalId)) {
                throw new Exception('Missing external_id in failed payout webhook');
            }

            // Extract order external ID from payout external ID
            $orderExternalId = str_replace('payout_', '', $externalId);

            // Find order by external ID
            $order = $this->orderModel->findByExternalId($orderExternalId);
            if (!$order) {
                throw new Exception("Order not found for failed payout external_id: {$externalId}");
            }

            // Update payout status
            $this->orderModel->updateStatus($order['id'], 'failed', 'payout');

            // Log payout failure
            error_log("Payout failed for order: {$orderExternalId}, reason: {$failureReason}");

            // TODO: Notify vendor and support team about payout failure

            return $this->successResponse([
                'processed' => true,
                'order_id' => $order['id'],
                'external_id' => $externalId,
                'action' => 'payout_failed',
                'failure_reason' => $failureReason,
                'message' => 'Payout failure processed'
            ]);

        } catch (Exception $e) {
            error_log('Error handling payout.failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process vendor gamification after successful sale
     */
    private function processVendorGamification(int $vendorId, float $saleAmount): void
    {
        try {
            $gamificationResult = $this->gamificationService->processSale($vendorId, $saleAmount);
            
            // Log gamification updates
            if ($gamificationResult['rank_upgrade']['upgraded']) {
                error_log("Vendor {$vendorId} upgraded to {$gamificationResult['rank_upgrade']['new_rank']}");
            }
            
            if (!empty($gamificationResult['new_achievements'])) {
                error_log("Vendor {$vendorId} unlocked new achievements");
            }

        } catch (Exception $e) {
            // Don't fail the whole webhook if gamification fails
            error_log('Gamification processing failed: ' . $e->getMessage());
        }
    }

    /**
     * Create vendor payout
     */
    private function createVendorPayout(array $order): void
    {
        try {
            $vendor = $this->userModel->findById($order['vendor_id']);
            if (!$vendor) {
                throw new Exception('Vendor not found for payout');
            }

            $payoutData = [
                'amount' => $order['vendor_amount'],
                'currency' => $order['currency'],
                'recipient_email' => $vendor['email'],
                'external_id' => 'payout_' . $order['external_id'],
                'description' => "Payout for order {$order['external_id']}",
                'metadata' => [
                    'order_id' => $order['id'],
                    'vendor_id' => $order['vendor_id'],
                    'product_id' => $order['product_id']
                ]
            ];

            $payoutResult = $this->monerooService->createPayout($payoutData);

            // Update order payout status
            $this->orderModel->updateStatus($order['id'], 'processing', 'payout');

            error_log("Payout created for vendor {$order['vendor_id']}, amount: {$order['vendor_amount']}");

        } catch (Exception $e) {
            // Log payout error but don't fail the whole process
            error_log("Payout creation failed for order {$order['id']}: " . $e->getMessage());
            
            // Update payout status to failed
            try {
                $this->orderModel->updateStatus($order['id'], 'failed', 'payout');
            } catch (Exception $updateError) {
                error_log("Failed to update payout status: " . $updateError->getMessage());
            }
        }
    }

    /**
     * Health check endpoint for webhook
     */
    public function healthCheck(): array
    {
        return $this->successResponse([
            'status' => 'healthy',
            'service' => 'webhook',
            'timestamp' => time(),
            'environment' => \Tradefy\Config\Settings::getEnvironment()
        ]);
    }

    /**
     * Test webhook processing (for development)
     */
    public function testWebhook(array $testData): array
    {
        try {
            // This method is for testing webhook processing in development
            if (\Tradefy\Config\Settings::isProduction()) {
                return $this->errorResponse('Test webhook not available in production', 403);
            }

            $eventType = $testData['event_type'] ?? '';
            $eventData = $testData['data'] ?? [];

            if (empty($eventType)) {
                return $this->errorResponse('event_type is required for test webhook', 400);
            }

            // Process test webhook
            switch ($eventType) {
                case 'payment.succeeded':
                    $result = $this->handlePaymentSucceeded($eventData);
                    break;
                    
                case 'payment.failed':
                    $result = $this->handlePaymentFailed($eventData);
                    break;
                    
                case 'payment.refunded':
                    $result = $this->handlePaymentRefunded($eventData);
                    break;
                    
                case 'payout.succeeded':
                    $result = $this->handlePayoutSucceeded($eventData);
                    break;
                    
                case 'payout.failed':
                    $result = $this->handlePayoutFailed($eventData);
                    break;
                    
                default:
                    return $this->errorResponse("Unsupported test event type: {$eventType}", 400);
            }

            $result['data']['test_mode'] = true;
            return $result;

        } catch (Exception $e) {
            return $this->errorResponse('Test webhook failed: ' . $e->getMessage(), 400);
        }
    }

    /**
     * Get webhook logs (admin only)
     */
    public function getWebhookLogs(array $userData, array $filters = []): array
    {
        try {
            // Verify user is admin
            if ($userData['role'] !== 'admin') {
                return $this->errorResponse('Access denied. Admin role required.', 403);
            }

            // In a real implementation, you would query webhook logs from database
            // For now, return mock data or empty array
            $logs = [
                [
                    'id' => 1,
                    'event_type' => 'payment.succeeded',
                    'external_id' => 'ord_12345',
                    'processed' => true,
                    'timestamp' => date('c', time() - 3600),
                    'status' => 'success'
                ],
                [
                    'id' => 2,
                    'event_type' => 'payout.succeeded',
                    'external_id' => 'payout_ord_12345',
                    'processed' => true,
                    'timestamp' => date('c', time() - 1800),
                    'status' => 'success'
                ]
            ];

            // Apply filters
            if (!empty($filters['event_type'])) {
                $logs = array_filter($logs, function($log) use ($filters) {
                    return $log['event_type'] === $filters['event_type'];
                });
            }

            if (!empty($filters['date_from'])) {
                $dateFrom = strtotime($filters['date_from']);
                $logs = array_filter($logs, function($log) use ($dateFrom) {
                    return strtotime($log['timestamp']) >= $dateFrom;
                });
            }

            return $this->successResponse([
                'logs' => array_values($logs),
                'total' => count($logs),
                'filters' => $filters
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Success response formatter
     */
    private function successResponse(array $data, int $statusCode = 200): array
    {
        return [
            'success' => true,
            'status' => $statusCode,
            'data' => $data,
            'timestamp' => time()
        ];
    }

    /**
     * Error response formatter
     */
    private function errorResponse(string $message, int $statusCode = 500): array
    {
        return [
            'success' => false,
            'status' => $statusCode,
            'error' => [
                'message' => $message,
                'code' => $statusCode
            ],
            'timestamp' => time()
        ];
    }

    /**
     * Get raw input data for webhook
     */
    public function getRawInput(): string
    {
        return file_get_contents('php://input');
    }

    /**
     * Get webhook headers
     */
    public function getWebhookHeaders(): array
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $header = str_replace('HTTP_', '', $key);
                $header = str_replace('_', '-', $header);
                $headers[$header] = $value;
            }
        }
        return $headers;
    }
}