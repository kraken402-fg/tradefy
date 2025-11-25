<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Models\Order;
use Tradefy\Models\Product;
use Tradefy\Models\User;
use PDO;

class OrderTest extends TestCase
{
    private $db;
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

    private function createTestUser(string $email, string $role = 'user'): int
    {
        $sql = "INSERT INTO users (email, password_hash, role) 
                VALUES (:email, :password_hash, :role)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':email' => $email,
            ':password_hash' => password_hash('password', PASSWORD_BCRYPT),
            ':role' => $role
        ]);
        return $this->db->lastInsertId();
    }

    private function createTestProduct(int $vendorId): array
    {
        return $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Test Product',
            'price' => 100.00,
            'stock_quantity' => 10
        ]);
    }

    public function testOrderCreation()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $orderData = [
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 2,
            'unit_price' => 100.00,
            'total_amount' => 200.00,
            'commission_rate' => 450,
            'platform_fee' => 9.00,
            'vendor_amount' => 191.00,
            'customer_email' => 'customer@tradefy.com',
            'customer_data' => ['name' => 'John Doe'],
            'product_data' => ['name' => 'Test Product']
        ];

        $order = $this->orderModel->create($orderData);

        $this->assertIsArray($order);
        $this->assertEquals($customerId, $order['customer_id']);
        $this->assertEquals($vendorId, $order['vendor_id']);
        $this->assertEquals($product['id'], $order['product_id']);
        $this->assertEquals(2, $order['quantity']);
        $this->assertEquals(200.00, $order['total_amount']);
        $this->assertEquals('pending', $order['status']);
        $this->assertEquals('pending', $order['payment_status']);
        $this->assertStringStartsWith('ord_', $order['external_id']);
    }

    public function testOrderCreationWithMissingRequiredFields()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Field customer_id is required');

        $this->orderModel->create([
            'vendor_id' => 1,
            'product_id' => 1,
            'quantity' => 1,
            'unit_price' => 10.00,
            'total_amount' => 10.00
        ]);
    }

    public function testFindOrderById()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $orderData = [
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ];

        $createdOrder = $this->orderModel->create($orderData);
        $foundOrder = $this->orderModel->findById($createdOrder['id']);

        $this->assertIsArray($foundOrder);
        $this->assertEquals($createdOrder['id'], $foundOrder['id']);
        $this->assertEquals($customerId, $foundOrder['customer_id']);
    }

    public function testFindOrderByExternalId()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $orderData = [
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ];

        $createdOrder = $this->orderModel->create($orderData);
        $foundOrder = $this->orderModel->findByExternalId($createdOrder['external_id']);

        $this->assertIsArray($foundOrder);
        $this->assertEquals($createdOrder['id'], $foundOrder['id']);
        $this->assertEquals($createdOrder['external_id'], $foundOrder['external_id']);
    }

    public function testFindOrdersByCustomer()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        // Create multiple orders for the same customer
        for ($i = 1; $i <= 3; $i++) {
            $this->orderModel->create([
                'customer_id' => $customerId,
                'vendor_id' => $vendorId,
                'product_id' => $product['id'],
                'quantity' => $i,
                'unit_price' => 50.00,
                'total_amount' => 50.00 * $i
            ]);
        }

        $result = $this->orderModel->findByCustomer($customerId, 1, 10);

        $this->assertCount(3, $result['orders']);
        $this->assertEquals(3, $result['pagination']['total']);
    }

    public function testFindOrdersByVendor()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        // Create multiple orders for the same vendor
        for ($i = 1; $i <= 3; $i++) {
            $this->orderModel->create([
                'customer_id' => $customerId,
                'vendor_id' => $vendorId,
                'product_id' => $product['id'],
                'quantity' => 1,
                'unit_price' => 25.00,
                'total_amount' => 25.00
            ]);
        }

        $result = $this->orderModel->findByVendor($vendorId, 1, 10);

        $this->assertCount(3, $result['orders']);
        $this->assertEquals(3, $result['pagination']['total']);
    }

    public function testUpdateOrderStatus()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $order = $this->orderModel->create([
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        // Update main status
        $result = $this->orderModel->updateStatus($order['id'], 'completed');
        $this->assertTrue($result);

        $updatedOrder = $this->orderModel->findById($order['id']);
        $this->assertEquals('completed', $updatedOrder['status']);

        // Update payment status
        $result = $this->orderModel->updateStatus($order['id'], 'paid', 'payment');
        $this->assertTrue($result);

        $updatedOrder = $this->orderModel->findById($order['id']);
        $this->assertEquals('paid', $updatedOrder['payment_status']);
    }

    public function testUpdateOrderStatusWithInvalidStatus()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $order = $this->orderModel->create([
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid status: invalid_status');

        $this->orderModel->updateStatus($order['id'], 'invalid_status');
    }

    public function testProcessPayment()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $order = $this->orderModel->create([
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 2,
            'unit_price' => 50.00,
            'total_amount' => 100.00
        ]);

        $result = $this->orderModel->processPayment($order['external_id']);

        $this->assertTrue($result['success']);
        $this->assertEquals('Payment processed successfully', $result['message']);
        
        $updatedOrder = $result['order'];
        $this->assertEquals('paid', $updatedOrder['payment_status']);
        $this->assertEquals('processing', $updatedOrder['status']);

        // Check if stock was decremented
        $updatedProduct = $this->productModel->findById($product['id']);
        $this->assertEquals(8, $updatedProduct['stock_quantity']); // Was 10, bought 2

        // Check if vendor sales were recorded
        $vendor = $this->userModel->findById($vendorId);
        $this->assertEquals(1, $vendor['sales_count']);
        $this->assertEquals(100.00, $vendor['total_revenue']);
    }

    public function testAddReview()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $order = $this->orderModel->create([
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        // Complete the order first
        $this->orderModel->updateStatus($order['id'], 'completed');

        $result = $this->orderModel->addReview($order['id'], $customerId, 5, 'Excellent product!');

        $this->assertTrue($result['success']);
        $this->assertEquals('Review added successfully', $result['message']);
        
        $updatedOrder = $result['order'];
        $this->assertEquals(5, $updatedOrder['rating']);
        $this->assertEquals('Excellent product!', $updatedOrder['review']);
    }

    public function testAddReviewWithInvalidRating()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        $order = $this->orderModel->create([
            'customer_id' => $customerId,
            'vendor_id' => $vendorId,
            'product_id' => $product['id'],
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_amount' => 100.00
        ]);

        $this->orderModel->updateStatus($order['id'], 'completed');

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Rating must be between 1 and 5');

        $this->orderModel->addReview($order['id'], $customerId, 6, 'Too high rating');
    }

    public function testGetVendorStats()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        // Create orders with different statuses and ratings
        $orders = [
            ['status' => 'completed', 'total_amount' => 100.00, 'rating' => 5],
            ['status' => 'completed', 'total_amount' => 150.00, 'rating' => 4],
            ['status' => 'pending', 'total_amount' => 200.00, 'rating' => null],
            ['status' => 'completed', 'total_amount' => 75.00, 'rating' => null]
        ];

        foreach ($orders as $orderData) {
            $order = $this->orderModel->create([
                'customer_id' => $customerId,
                'vendor_id' => $vendorId,
                'product_id' => $product['id'],
                'quantity' => 1,
                'unit_price' => $orderData['total_amount'],
                'total_amount' => $orderData['total_amount']
            ]);

            $this->orderModel->updateStatus($order['id'], $orderData['status']);

            if ($orderData['rating']) {
                $this->orderModel->addReview($order['id'], $customerId, $orderData['rating'], 'Test review');
            }
        }

        $stats = $this->orderModel->getVendorStats($vendorId);

        $this->assertEquals(4, $stats['total_orders']);
        $this->assertEquals(3, $stats['completed_orders']);
        $this->assertEquals(1, $stats['pending_orders']);
        $this->assertEquals(525.00, $stats['total_revenue']);
        $this->assertEquals(4.5, $stats['average_rating']); // (5 + 4) / 2
        $this->assertEquals(2, $stats['total_reviews']);
    }

    public function testGetRecentOrders()
    {
        $customerId = $this->createTestUser('customer@tradefy.com');
        $vendorId = $this->createTestUser('vendor@tradefy.com', 'vendor');
        $product = $this->createTestProduct($vendorId);

        // Create multiple orders
        for ($i = 1; $i <= 5; $i++) {
            $this->orderModel->create([
                'customer_id' => $customerId,
                'vendor_id' => $vendorId,
                'product_id' => $product['id'],
                'quantity' => 1,
                'unit_price' => 10.00 * $i,
                'total_amount' => 10.00 * $i
            ]);
        }

        $recentOrders = $this->orderModel->getRecentOrders(3, 0);
        $this->assertCount(3, $recentOrders);
    }
}