<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Controllers\OrderController;
use Tradefy\Models\Order;
use Tradefy\Models\Product;
use Tradefy\Models\User;
use Tradefy\Services\MonerooService;
use PDO;
use PDOStatement;
use Exception;

class OrderControllerTest extends TestCase
{
    private $orderController;
    private $orderModel;
    private $productModel;
    private $userModel;
    private $monerooService;
    private $db;

    protected function setUp(): void
    {
        // Mock de la base de données
        $this->db = $this->createMock(PDO::class);
        
        // Mock des modèles
        $this->orderModel = $this->createMock(Order::class);
        $this->productModel = $this->createMock(Product::class);
        $this->userModel = $this->createMock(User::class);
        $this->monerooService = $this->createMock(MonerooService::class);

        // Créer le contrôleur avec les mocks
        $this->orderController = new OrderController($this->db);
        
        // Injecter les mocks via reflection (pour les tests)
        $this->injectMock('orderModel', $this->orderModel);
        $this->injectMock('productModel', $this->productModel);
        $this->injectMock('userModel', $this->userModel);
        $this->injectMock('monerooService', $this->monerooService);

        // Configuration d'environnement de test
        $_ENV['APP_ENV'] = 'testing';
        $_ENV['JWT_SECRET'] = 'test-secret-key-1234567890';
    }

    private function injectMock(string $property, $mock): void
    {
        $reflection = new \ReflectionClass($this->orderController);
        $property = $reflection->getProperty($property);
        $property->setAccessible(true);
        $property->setValue($this->orderController, $mock);
    }

    public function testCreateOrderSuccess()
    {
        // Données de test
        $userData = [
            'user_id' => 1,
            'email' => 'customer@test.com',
            'role' => 'user'
        ];

        $orderData = [
            'product_id' => 123,
            'quantity' => 2,
            'customer_email' => 'customer@test.com'
        ];

        $productData = [
            'id' => 123,
            'vendor_id' => 456,
            'name' => 'Test Product',
            'price' => 50.00,
            'currency' => 'USD',
            'stock_quantity' => 10,
            'is_digital' => false
        ];

        $expectedOrder = [
            'id' => 1,
            'customer_id' => 1,
            'vendor_id' => 456,
            'product_id' => 123,
            'external_id' => 'ord_test123',
            'status' => 'pending',
            'quantity' => 2,
            'unit_price' => 50.00,
            'total_amount' => 100.00,
            'currency' => 'USD',
            'commission_rate' => 450,
            'platform_fee' => 4.50,
            'vendor_amount' => 95.50
        ];

        // Configurer les mocks
        $this->productModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($productData);

        $this->productModel->expects($this->once())
            ->method('isInStock')
            ->with(123, 2)
            ->willReturn(true);

        $this->orderModel->expects($this->once())
            ->method('create')
            ->willReturn($expectedOrder);

        $this->monerooService->expects($this->once())
            ->method('createProductPayment')
            ->willReturn([
                'success' => true,
                'payment_url' => 'https://payment.moneroo.io/test',
                'payment_id' => 'pay_test123'
            ]);

        // Exécuter la méthode
        $result = $this->orderController->create($userData, $orderData);

        // Vérifications
        $this->assertTrue($result['success']);
        $this->assertEquals(201, $result['status']);
        $this->assertEquals('Order created successfully', $result['data']['message']);
        $this->assertEquals($expectedOrder, $result['data']['order']);
        $this->assertArrayHasKey('payment_url', $result['data']);
    }

    public function testCreateOrderProductNotFound()
    {
        $userData = ['user_id' => 1, 'email' => 'test@test.com'];
        $orderData = ['product_id' => 999, 'quantity' => 1];

        $this->productModel->expects($this->once())
            ->method('findById')
            ->with(999)
            ->willReturn(null);

        $result = $this->orderController->create($userData, $orderData);

        $this->assertFalse($result['success']);
        $this->assertEquals(404, $result['status']);
        $this->assertEquals('Product not found', $result['error']['message']);
    }

    public function testCreateOrderOutOfStock()
    {
        $userData = ['user_id' => 1, 'email' => 'test@test.com'];
        $orderData = ['product_id' => 123, 'quantity' => 5];

        $productData = [
            'id' => 123,
            'vendor_id' => 456,
            'name' => 'Test Product',
            'price' => 50.00,
            'stock_quantity' => 3
        ];

        $this->productModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($productData);

        $this->productModel->expects($this->once())
            ->method('isInStock')
            ->with(123, 5)
            ->willReturn(false);

        $result = $this->orderController->create($userData, $orderData);

        $this->assertFalse($result['success']);
        $this->assertEquals(400, $result['status']);
        $this->assertEquals('Product out of stock', $result['error']['message']);
    }

    public function testGetCustomerOrders()
    {
        $userData = ['user_id' => 1, 'email' => 'customer@test.com'];
        $page = 1;
        $perPage = 20;

        $expectedOrders = [
            'orders' => [
                [
                    'id' => 1,
                    'customer_id' => 1,
                    'product_name' => 'Test Product',
                    'total_amount' => 100.00,
                    'status' => 'completed'
                ]
            ],
            'pagination' => [
                'page' => 1,
                'per_page' => 20,
                'total' => 1,
                'total_pages' => 1
            ]
        ];

        $this->orderModel->expects($this->once())
            ->method('findByCustomer')
            ->with(1, $page, $perPage)
            ->willReturn($expectedOrders);

        $result = $this->orderController->getCustomerOrders($userData, $page, $perPage);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals($expectedOrders, $result['data']);
    }

    public function testGetVendorOrders()
    {
        $userData = ['user_id' => 456, 'email' => 'vendor@test.com', 'role' => 'vendor'];
        $page = 1;
        $perPage = 20;

        $expectedOrders = [
            'orders' => [
                [
                    'id' => 1,
                    'vendor_id' => 456,
                    'product_name' => 'Vendor Product',
                    'total_amount' => 75.00,
                    'status' => 'paid'
                ]
            ],
            'pagination' => [
                'page' => 1,
                'per_page' => 20,
                'total' => 1,
                'total_pages' => 1
            ]
        ];

        $this->orderModel->expects($this->once())
            ->method('findByVendor')
            ->with(456, $page, $perPage)
            ->willReturn($expectedOrders);

        $result = $this->orderController->getVendorOrders($userData, $page, $perPage);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals($expectedOrders, $result['data']);
    }

    public function testGetOrderSuccess()
    {
        $userData = ['user_id' => 1, 'email' => 'customer@test.com'];
        $orderId = 123;

        $orderData = [
            'id' => 123,
            'customer_id' => 1,
            'vendor_id' => 456,
            'product_name' => 'Test Product',
            'total_amount' => 100.00,
            'status' => 'completed'
        ];

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($orderData);

        $result = $this->orderController->getOrder($userData, $orderId);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals($orderData, $result['data']['order']);
    }

    public function testGetOrderNotFound()
    {
        $userData = ['user_id' => 1, 'email' => 'customer@test.com'];
        $orderId = 999;

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(999)
            ->willReturn(null);

        $result = $this->orderController->getOrder($userData, $orderId);

        $this->assertFalse($result['success']);
        $this->assertEquals(404, $result['status']);
        $this->assertEquals('Order not found', $result['error']['message']);
    }

    public function testGetOrderAccessDenied()
    {
        $userData = ['user_id' => 2, 'email' => 'other@test.com']; // Different user
        $orderId = 123;

        $orderData = [
            'id' => 123,
            'customer_id' => 1, // Belongs to user 1
            'vendor_id' => 456
        ];

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($orderData);

        $result = $this->orderController->getOrder($userData, $orderId);

        $this->assertFalse($result['success']);
        $this->assertEquals(403, $result['status']);
        $this->assertEquals('Access denied', $result['error']['message']);
    }

    public function testUpdateOrderStatusSuccess()
    {
        $userData = ['user_id' => 456, 'email' => 'vendor@test.com', 'role' => 'vendor'];
        $orderId = 123;
        $updateData = ['status' => 'completed'];

        $orderData = [
            'id' => 123,
            'vendor_id' => 456, // Same vendor
            'status' => 'processing'
        ];

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($orderData);

        $this->orderModel->expects($this->once())
            ->method('updateStatus')
            ->with(123, 'completed', 'status')
            ->willReturn(true);

        $result = $this->orderController->updateStatus($userData, $orderId, $updateData);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals('Order status updated successfully', $result['data']['message']);
    }

    public function testUpdateOrderStatusInvalid()
    {
        $userData = ['user_id' => 456, 'email' => 'vendor@test.com', 'role' => 'vendor'];
        $orderId = 123;
        $updateData = ['status' => 'invalid_status'];

        $orderData = [
            'id' => 123,
            'vendor_id' => 456
        ];

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($orderData);

        $result = $this->orderController->updateStatus($userData, $orderId, $updateData);

        $this->assertFalse($result['success']);
        $this->assertEquals(400, $result['status']);
        $this->assertStringContainsString('Invalid status', $result['error']['message']);
    }

    public function testAddReviewSuccess()
    {
        $userData = ['user_id' => 1, 'email' => 'customer@test.com'];
        $orderId = 123;
        $reviewData = ['rating' => 5, 'review' => 'Excellent product!'];

        $orderData = [
            'id' => 123,
            'customer_id' => 1,
            'status' => 'completed'
        ];

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($orderData);

        $this->orderModel->expects($this->once())
            ->method('addReview')
            ->with(123, 1, 5, 'Excellent product!')
            ->willReturn([
                'success' => true,
                'order' => array_merge($orderData, ['rating' => 5, 'review' => 'Excellent product!'])
            ]);

        $result = $this->orderController->addReview($userData, $orderId, $reviewData);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals('Review added successfully', $result['data']['message']);
    }

    public function testAddReviewOrderNotCompleted()
    {
        $userData = ['user_id' => 1, 'email' => 'customer@test.com'];
        $orderId = 123;
        $reviewData = ['rating' => 5, 'review' => 'Excellent product!'];

        $orderData = [
            'id' => 123,
            'customer_id' => 1,
            'status' => 'processing' // Not completed
        ];

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($orderData);

        $result = $this->orderController->addReview($userData, $orderId, $reviewData);

        $this->assertFalse($result['success']);
        $this->assertEquals(400, $result['status']);
        $this->assertEquals('Can only review completed orders', $result['error']['message']);
    }

    public function testGetVendorStats()
    {
        $userData = ['user_id' => 456, 'email' => 'vendor@test.com', 'role' => 'vendor'];

        $expectedStats = [
            'total_orders' => 50,
            'completed_orders' => 45,
            'pending_orders' => 5,
            'total_revenue' => 5000.00,
            'average_rating' => 4.8,
            'total_reviews' => 40
        ];

        $this->orderModel->expects($this->once())
            ->method('getVendorStats')
            ->with(456)
            ->willReturn($expectedStats);

        $result = $this->orderController->getVendorStats($userData);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals($expectedStats, $result['data']['stats']);
    }

    public function testProcessPaymentWebhook()
    {
        $externalId = 'ord_test123';

        $orderData = [
            'id' => 123,
            'external_id' => 'ord_test123',
            'vendor_id' => 456,
            'product_id' => 789,
            'quantity' => 1,
            'total_amount' => 100.00
        ];

        $this->orderModel->expects($this->once())
            ->method('findByExternalId')
            ->with('ord_test123')
            ->willReturn($orderData);

        $this->orderModel->expects($this->once())
            ->method('processPayment')
            ->with('ord_test123')
            ->willReturn([
                'success' => true,
                'order' => array_merge($orderData, ['payment_status' => 'paid', 'status' => 'processing']),
                'message' => 'Payment processed successfully'
            ]);

        $result = $this->orderController->processPayment($externalId);

        $this->assertTrue($result['success']);
        $this->assertEquals('Payment processed successfully', $result['message']);
    }

    public function testRefundOrderSuccess()
    {
        $userData = ['user_id' => 1, 'email' => 'customer@test.com', 'role' => 'user'];
        $orderId = 123;
        $refundData = ['reason' => 'Product not as described'];

        $orderData = [
            'id' => 123,
            'customer_id' => 1,
            'status' => 'completed',
            'total_amount' => 100.00
        ];

        $this->orderModel->expects($this->once())
            ->method('findById')
            ->with(123)
            ->willReturn($orderData);

        $this->monerooService->expects($this->once())
            ->method('refundPayment')
            ->willReturn(['success' => true, 'refund_id' => 'ref_test123']);

        $this->orderModel->expects($this->once())
            ->method('updateStatus')
            ->with(123, 'refunded', 'status')
            ->willReturn(true);

        $result = $this->orderController->refundOrder($userData, $orderId, $refundData);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals('Order refunded successfully', $result['data']['message']);
    }

    public function testGetRecentOrdersAdminOnly()
    {
        $userData = ['user_id' => 1, 'email' => 'admin@test.com', 'role' => 'admin'];
        $limit = 10;

        $recentOrders = [
            ['id' => 1, 'customer_email' => 'customer1@test.com', 'total_amount' => 100.00],
            ['id' => 2, 'customer_email' => 'customer2@test.com', 'total_amount' => 75.00]
        ];

        $this->orderModel->expects($this->once())
            ->method('getRecentOrders')
            ->with(10, 0)
            ->willReturn($recentOrders);

        $result = $this->orderController->getRecentOrders($userData, $limit);

        $this->assertTrue($result['success']);
        $this->assertEquals(200, $result['status']);
        $this->assertEquals($recentOrders, $result['data']['orders']);
    }

    public function testGetRecentOrdersNonAdmin()
    {
        $userData = ['user_id' => 1, 'email' => 'user@test.com', 'role' => 'user'];
        $limit = 10;

        $result = $this->orderController->getRecentOrders($userData, $limit);

        $this->assertFalse($result['success']);
        $this->assertEquals(403, $result['status']);
        $this->assertEquals('Access denied. Admin role required.', $result['error']['message']);
    }

    protected function tearDown(): void
    {
        // Nettoyer les variables d'environnement
        unset($_ENV['APP_ENV'], $_ENV['JWT_SECRET']);
    }
}