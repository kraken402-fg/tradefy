<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Controllers\OrderController;
use Tradefy\Models\Order;
use Tradefy\Models\Product;
use Tradefy\Models\User;
use PDO;

class OrderControllerTest extends TestCase
{
    private $db;
    private $orderController;
    private $orderModel;
    private $productModel;
    private $userModel;

    protected function setUp(): void
    {
        // Create in-memory SQLite database for testing
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Create tables
        $this->createUsersTable();
        $this->createProductsTable();
        $this->createOrdersTable();

        $this->orderController = new OrderController($this->db);
        $this->orderModel = new Order($this->db);
        $this->productModel = new Product($this->db);
        $this->userModel = new User($this->db);
    }

    private function createUsersTable(): void
    {
        $sql = "
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                vendor_id INTEGER,
                sales_count INTEGER DEFAULT 0,
                total_revenue DECIMAL(10,2) DEFAULT 0.00,
                profile_data TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        ";
        $this->db->exec($sql);
    }

    private function createProductsTable(): void
    {
        $sql = "
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                category VARCHAR(100) DEFAULT 'general',
                tags TEXT DEFAULT '[]',
                images TEXT DEFAULT '[]',
                stock_quantity INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                is_digital BOOLEAN DEFAULT false,
                file_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES users(id)
            )
        ";
        $this->db->exec($sql);
    }

    private function createOrdersTable(): void
    {
        $sql = "
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                vendor_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                external_id VARCHAR(100) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                commission_rate INTEGER DEFAULT 0,
                platform_fee DECIMAL(10,2) DEFAULT 0.00,
                vendor_amount DECIMAL(10,2) DEFAULT 0.00,
                customer_email VARCHAR(255),
                customer_data TEXT DEFAULT '{}',
                product_data TEXT DEFAULT '{}',
                payment_method VARCHAR(50) DEFAULT 'moneroo',
                payment_status VARCHAR(50) DEFAULT 'pending',
                payout_status VARCHAR(50) DEFAULT 'pending',
                rating INTEGER,
                review TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES users(id),
                FOREIGN KEY (vendor_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ";
        $this->db->exec($sql);
    }

    private function createTestVendor(): array
    {
        $userData = [
            'email' => 'vendor@tradefy.com',
            'password' => 'SecurePass123!',
            'role' => 'vendor'
        ];
        return $this->userModel->create($userData);
    }

    private function createTestCustomer(): array
    {
        $userData = [
            'email' => 'customer@tradefy.com',
            'password' => 'SecurePass123!',
            'role' => 'user'
        ];
        return $this->userModel->create($userData);
    }

    private function createTestProduct(int $vendorId, int $stock = 10): array
    {
        return $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Test Product',
            'price' => 100.00,
            'stock_quantity' => $stock
        ]);
    }

    public function testCreateOrder()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $orderData = [
            'product_id' => $product['id'],
            'quantity' => 2
        ];

        $response = $this->orderController->create($userData, $orderData);

        $this->assertTrue($response['success']);
        $this->assertEquals(201, $response['status']);
        $this->assertArrayHasKey('order', $response['data']);
        $this->assertArrayHasKey('payment', $response['data']);
        $this->assertEquals($customer['id'], $response['data']['order']['customer_id']);
        $this->assertEquals($vendor['id'], $response['data']['order']['vendor_id']);
        $this->assertEquals($product['id'], $response['data']['order']['product_id']);
        $this->assertEquals(2, $response['data']['order']['quantity']);
        $this->assertEquals(200.00, $response['data']['order']['total_amount']);
    }

    public function testCreateOrderWithOutOfStockProduct()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id'], 1); // Only 1 in stock

        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $orderData = [
            'product_id' => $product['id'],
            'quantity' => 2 // More than available
        ];

        $response = $this->orderController->create($userData, $orderData);

        $this->assertFalse($response['success']);
        $this->assertEquals(400, $response['status']);
        $this->assertEquals('Product out of stock', $response['error']['message']);
    }

    public function testCreateOrderWithMissingFields()
    {
        $customer = $this->createTestCustomer();
        
        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $orderData = [
            // Missing product_id and quantity
        ];

        $response = $this->orderController->create($userData, $orderData);

        $this->assertFalse($response['success']);
        $this->assertEquals(400, $response['status']);
        $this->assertStringContainsString('is required', $response['error']['message']);
    }

    public function testGetOrderAsCustomer()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        $order = $this->orderModel->create([
            'customer_id' => $customer['id'],
            'vendor_id' => $vendor['id'],
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $response = $this->orderController->getOrder($userData, $order['id']);

        $this->assertTrue($response['success']);
        $this->assertEquals($order['id'], $response['data']['order']['id']);
        $this->assertEquals($customer['id'], $response['data']['order']['customer_id']);
    }

    public function testGetOrderAsVendor()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        $order = $this->orderModel->create([
            'customer_id' => $customer['id'],
            'vendor_id' => $vendor['id'],
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $response = $this->orderController->getOrder($userData, $order['id']);

        $this->assertTrue($response['success']);
        $this->assertEquals($order['id'], $response['data']['order']['id']);
        $this->assertEquals($vendor['id'], $response['data']['order']['vendor_id']);
    }

    public function testGetOrderAccessDenied()
    {
        $customer1 = $this->createTestCustomer();
        $customer2 = $this->createTestCustomer('customer2@tradefy.com');
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        $order = $this->orderModel->create([
            'customer_id' => $customer1['id'],
            'vendor_id' => $vendor['id'],
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        $userData = [
            'user_id' => $customer2['id'], // Different customer
            'email' => $customer2['email'],
            'role' => 'user'
        ];

        $response = $this->orderController->getOrder($userData, $order['id']);

        $this->assertFalse($response['success']);
        $this->assertEquals(403, $response['status']);
        $this->assertEquals('Access denied', $response['error']['message']);
    }

    public function testGetCustomerOrders()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        // Create multiple orders for the customer
        for ($i = 1; $i <= 3; $i++) {
            $this->orderModel->create([
                'customer_id' => $customer['id'],
                'vendor_id' => $vendor['id'],
                'product_id' => $product['id'],
                'quantity' => $i,
                'unit_price' => 50.00,
                'total_amount' => 50.00 * $i
            ]);
        }

        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $response = $this->orderController->getCustomerOrders($userData, 1, 10);

        $this->assertTrue($response['success']);
        $this->assertCount(3, $response['data']['orders']);
        $this->assertEquals(3, $response['data']['pagination']['total']);
    }

    public function testGetVendorOrders()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        // Create multiple orders for the vendor
        for ($i = 1; $i <= 3; $i++) {
            $this->orderModel->create([
                'customer_id' => $customer['id'],
                'vendor_id' => $vendor['id'],
                'product_id' => $product['id'],
                'quantity' => 1,
                'unit_price' => 25.00,
                'total_amount' => 25.00
            ]);
        }

        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $response = $this->orderController->getVendorOrders($userData, 1, 10);

        $this->assertTrue($response['success']);
        $this->assertCount(3, $response['data']['orders']);
        $this->assertEquals(3, $response['data']['pagination']['total']);
    }

    public function testGetVendorOrdersAsCustomer()
    {
        $customer = $this->createTestCustomer();
        
        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $response = $this->orderController->getVendorOrders($userData);

        $this->assertFalse($response['success']);
        $this->assertEquals(403, $response['status']);
        $this->assertEquals('Only vendors can access their orders', $response['error']['message']);
    }

    public function testUpdateOrderStatusAsVendor()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        $order = $this->orderModel->create([
            'customer_id' => $customer['id'],
            'vendor_id' => $vendor['id'],
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $statusData = [
            'status' => 'completed',
            'type' => 'status'
        ];

        $response = $this->orderController->updateStatus($userData, $order['id'], $statusData);

        $this->assertTrue($response['success']);
        $this->assertEquals('completed', $response['data']['order']['status']);
        $this->assertEquals('Order status updated successfully', $response['data']['message']);
    }

    public function testAddReview()
    {
        $customer = $this->createTestCustomer();
        $vendor = $this->createTestVendor();
        $product = $this->createTestProduct($vendor['id']);

        $order = $this->orderModel->create([
            'customer_id' => $customer['id'],
            'vendor_id' => $vendor['id'],
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        // Complete the order first
        $this->orderModel->updateStatus($order['id'], 'completed');

        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $reviewData = [
            'rating' => 5,
            'review' => 'Excellent product!'
        ];

        $response = $this->orderController->addReview($userData, $order['id'], $reviewData);

        $this->assertTrue($response['success']);
        $this->assertEquals(5, $response['data']['order']['rating']);
        $this->assertEquals('Excellent product!', $response['data']['order']['review']);
        $this->assertEquals('Review added successfully', $response['data']['message']);
    }

    public function testGetVendorStats()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $response = $this->orderController->getVendorStats($userData);

        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('order_stats', $response['data']);
        $this->assertArrayHasKey('gamification', $response['data']);
        $this->assertArrayHasKey('total_orders', $response['data']['order_stats']);
        $this->assertArrayHasKey('total_revenue', $response['data']['order_stats']);
    }

    public function testResponseFormatting()
    {
        $successResponse = $this->orderController->successResponse(['test' => 'data'], 201);
        
        $this->assertTrue($successResponse['success']);
        $this->assertEquals(201, $successResponse['status']);
        $this->assertEquals('data', $successResponse['data']['test']);
        $this->assertArrayHasKey('timestamp', $successResponse);

        $errorResponse = $this->orderController->errorResponse('Test error', 400);
        
        $this->assertFalse($errorResponse['success']);
        $this->assertEquals(400, $errorResponse['status']);
        $this->assertEquals('Test error', $errorResponse['error']['message']);
        $this->assertEquals(400, $errorResponse['error']['code']);
    }
}