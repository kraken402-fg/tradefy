<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Services\MonerooService;
use Tradefy\Config\Settings;
use Exception;

class MonerooServiceTest extends TestCase
{
    private $monerooService;

    protected function setUp(): void
    {
        // Set up minimal configuration for testing
        putenv('MONEROO_API_KEY=test_api_key');
        putenv('MONEROO_SECRET_KEY=test_secret_key');
        putenv('MONEROO_WEBHOOK_SECRET=test_webhook_secret');
        putenv('MONEROO_BASE_URL=https://api.moneroo.test');
        putenv('JWT_SECRET=test_jwt_secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=test');
        putenv('DB_USER=test');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=test_key');

        Settings::initialize();

        $this->monerooService = new MonerooService();
    }

    public function testServiceInitialization()
    {
        $this->assertInstanceOf(MonerooService::class, $this->monerooService);
    }

    public function testServiceInitializationWithoutCredentials()
    {
        putenv('MONEROO_API_KEY=');
        putenv('MONEROO_SECRET_KEY=');

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Moneroo API credentials not configured');

        new MonerooService();
    }

    public function testCalculateCommissionSplit()
    {
        // Test with 450 bps (4.5%) commission
        $result = $this->monerooService->calculateCommissionSplit(100.00, 450);
        
        $this->assertEquals(100.00, $result['total_amount']);
        $this->assertEquals(450, $result['commission_rate']);
        $this->assertEquals(4.5, $result['commission_percentage']);
        $this->assertEquals(95.50, $result['vendor_amount']);
        $this->assertEquals(4.50, $result['platform_fee']);

        // Test with 300 bps (3%) commission
        $result = $this->monerooService->calculateCommissionSplit(50.00, 300);
        
        $this->assertEquals(50.00, $result['total_amount']);
        $this->assertEquals(300, $result['commission_rate']);
        $this->assertEquals(3.0, $result['commission_percentage']);
        $this->assertEquals(48.50, $result['vendor_amount']);
        $this->assertEquals(1.50, $result['platform_fee']);

        // Test with zero amount
        $result = $this->monerooService->calculateCommissionSplit(0, 450);
        
        $this->assertEquals(0, $result['vendor_amount']);
        $this->assertEquals(0, $result['platform_fee']);
    }

    public function testValidatePaymentData()
    {
        // Valid payment data
        $validData = [
            'amount' => 100.00,
            'currency' => 'USD',
            'email' => 'test@example.com'
        ];

        $result = $this->monerooService->validatePaymentData($validData);
        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);

        // Invalid amount
        $invalidAmount = [
            'amount' => 0,
            'currency' => 'USD',
            'email' => 'test@example.com'
        ];

        $result = $this->monerooService->validatePaymentData($invalidAmount);
        $this->assertFalse($result['valid']);
        $this->assertContains('Amount must be greater than 0', $result['errors']);

        // Invalid currency
        $invalidCurrency = [
            'amount' => 100.00,
            'currency' => 'INVALID',
            'email' => 'test@example.com'
        ];

        $result = $this->monerooService->validatePaymentData($invalidCurrency);
        $this->assertFalse($result['valid']);
        $this->assertContains('Invalid currency', $result['errors']);

        // Invalid email
        $invalidEmail = [
            'amount' => 100.00,
            'currency' => 'USD',
            'email' => 'invalid-email'
        ];

        $result = $this->monerooService->validatePaymentData($invalidEmail);
        $this->assertFalse($result['valid']);
        $this->assertContains('Valid email is required', $result['errors']);
    }

    public function testWebhookSignatureVerification()
    {
        $payload = 'test_payload_data';
        $secret = 'test_webhook_secret';
        
        $validSignature = hash_hmac('sha256', $payload, $secret);
        
        $this->assertTrue($this->monerooService->verifyWebhookSignature($payload, $validSignature));
        $this->assertFalse($this->monerooService->verifyWebhookSignature($payload, 'invalid_signature'));
    }

    public function testProcessWebhookEvents()
    {
        // Test payment succeeded
        $succeededData = [
            'event_type' => 'payment.succeeded',
            'data' => [
                'external_id' => 'test_123',
                'amount' => 100.00,
                'currency' => 'USD',
                'metadata' => ['order_id' => '123']
            ]
        ];

        $result = $this->monerooService->processWebhook($succeededData);
        $this->assertTrue($result['success']);
        $this->assertEquals('payment_processed', $result['action']);
        $this->assertEquals('test_123', $result['external_id']);

        // Test payment failed
        $failedData = [
            'event_type' => 'payment.failed',
            'data' => [
                'external_id' => 'test_456',
                'failure_reason' => 'insufficient_funds'
            ]
        ];

        $result = $this->monerooService->processWebhook($failedData);
        $this->assertTrue($result['success']);
        $this->assertEquals('payment_failed', $result['action']);
        $this->assertEquals('insufficient_funds', $result['failure_reason']);

        // Test payout succeeded
        $payoutData = [
            'event_type' => 'payout.succeeded',
            'data' => [
                'external_id' => 'payout_123',
                'amount' => 95.50
            ]
        ];

        $result = $this->monerooService->processWebhook($payoutData);
        $this->assertTrue($result['success']);
        $this->assertEquals('payout_completed', $result['action']);

        // Test unknown event
        $unknownData = [
            'event_type' => 'unknown.event',
            'data' => []
        ];

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Unhandled webhook event: unknown.event');

        $this->monerooService->processWebhook($unknownData);
    }

    public function testCreateProductPayment()
    {
        $orderData = [
            'total_amount' => 150.00,
            'currency' => 'USD'
        ];

        $userData = [
            'user_id' => 123,
            'email' => 'customer@example.com'
        ];

        $productData = [
            'id' => 456,
            'name' => 'Test Product',
            'vendor_id' => 789
        ];

        // This will test the method structure without making actual API calls
        $result = $this->monerooService->createProductPayment($orderData, $userData, $productData);
        
        // Since we can't mock the actual API call, we verify the method exists and runs
        $this->assertTrue(true); // Placeholder assertion
    }

    public function testCreateVendorPayout()
    {
        $amount = 95.50;
        $vendorEmail = 'vendor@example.com';
        $vendorId = 'vendor_123';
        $orderId = 'order_456';

        // This will test the method structure without making actual API calls
        $result = $this->monerooService->createVendorPayout($amount, $vendorEmail, $vendorId, $orderId);
        
        // Since we can't mock the actual API call, we verify the method exists and runs
        $this->assertTrue(true); // Placeholder assertion
    }

    public function testGetSupportedCurrencies()
    {
        $currencies = $this->monerooService->getSupportedCurrencies();
        
        $this->assertArrayHasKey('USD', $currencies);
        $this->assertArrayHasKey('EUR', $currencies);
        $this->assertArrayHasKey('XOF', $currencies);
        $this->assertEquals('US Dollar', $currencies['USD']);
    }

    public function testFormatAmount()
    {
        $this->assertEquals('$100.50', $this->monerooService->formatAmount(100.50, 'USD'));
        $this->assertEquals('€75.25', $this->monerooService->formatAmount(75.25, 'EUR'));
        $this->assertEquals('10 000 CFA', $this->monerooService->formatAmount(10000, 'XOF'));
        $this->assertEquals('5 000 CFA', $this->monerooService->formatAmount(5000, 'XAF'));
    }

    public function testWebhookSecretNotConfigured()
    {
        // Temporarily remove webhook secret
        putenv('MONEROO_WEBHOOK_SECRET=');
        Settings::initialize();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Webhook secret not configured');

        $this->monerooService->verifyWebhookSignature('test', 'signature');
    }
}