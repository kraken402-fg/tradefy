<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Controllers\ProductController;
use Tradefy\Models\Product;
use Tradefy\Models\User;
use PDO;

class ProductControllerTest extends TestCase
{
    private $db;
    private $productController;
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

        $this->productController = new ProductController($this->db);
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

    public function testCreateProductAsVendor()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $productData = [
            'name' => 'Test Product',
            'description' => 'Test Description',
            'price' => 99.99,
            'category' => 'electronics',
            'tags' => ['new', 'featured'],
            'stock_quantity' => 10
        ];

        $response = $this->productController->create($userData, $productData);

        $this->assertTrue($response['success']);
        $this->assertEquals(201, $response['status']);
        $this->assertArrayHasKey('product', $response['data']);
        $this->assertEquals('Test Product', $response['data']['product']['name']);
        $this->assertEquals('Test Description', $response['data']['product']['description']);
        $this->assertEquals(99.99, $response['data']['product']['price']);
        $this->assertEquals('electronics', $response['data']['product']['category']);
    }

    public function testCreateProductAsCustomer()
    {
        $customer = $this->createTestCustomer();
        
        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $productData = [
            'name' => 'Test Product',
            'price' => 99.99
        ];

        $response = $this->productController->create($userData, $productData);

        $this->assertFalse($response['success']);
        $this->assertEquals(403, $response['status']);
        $this->assertEquals('Only vendors can create products', $response['error']['message']);
    }

    public function testGetProduct()
    {
        $vendor = $this->createTestVendor();
        
        $product = $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Findable Product',
            'price' => 50.00
        ]);

        $response = $this->productController->getProduct($product['id']);

        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('product', $response['data']);
        $this->assertEquals('Findable Product', $response['data']['product']['name']);
        $this->assertEquals(50.00, $response['data']['product']['price']);
    }

    public function testGetNonExistentProduct()
    {
        $response = $this->productController->getProduct(9999);

        $this->assertFalse($response['success']);
        $this->assertEquals(404, $response['status']);
        $this->assertEquals('Product not found', $response['error']['message']);
    }

    public function testGetVendorProducts()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        // Create multiple products for the vendor
        for ($i = 1; $i <= 3; $i++) {
            $this->productModel->create([
                'vendor_id' => $vendor['id'],
                'name' => "Product {$i}",
                'price' => 10.00 * $i
            ]);
        }

        $response = $this->productController->getVendorProducts($userData, 1, 10);

        $this->assertTrue($response['success']);
        $this->assertCount(3, $response['data']['products']);
        $this->assertEquals(3, $response['data']['pagination']['total']);
    }

    public function testGetVendorProductsAsCustomer()
    {
        $customer = $this->createTestCustomer();
        
        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $response = $this->productController->getVendorProducts($userData);

        $this->assertFalse($response['success']);
        $this->assertEquals(403, $response['status']);
        $this->assertEquals('Only vendors can access their products', $response['error']['message']);
    }

    public function testSearchProducts()
    {
        $vendor = $this->createTestVendor();
        
        $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Apple iPhone',
            'description' => 'Latest smartphone',
            'price' => 999.99,
            'category' => 'electronics'
        ]);

        $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Samsung Galaxy',
            'description' => 'Android phone',
            'price' => 799.99,
            'category' => 'electronics'
        ]);

        // Search by query
        $response = $this->productController->searchProducts(['query' => 'iPhone']);
        $this->assertTrue($response['success']);
        $this->assertCount(1, $response['data']['products']);
        $this->assertEquals('Apple iPhone', $response['data']['products'][0]['name']);

        // Search by category
        $response = $this->productController->searchProducts(['category' => 'electronics']);
        $this->assertCount(2, $response['data']['products']);

        // Search by price range
        $response = $this->productController->searchProducts([
            'min_price' => 800,
            'max_price' => 1000
        ]);
        $this->assertCount(1, $response['data']['products']);
        $this->assertEquals(999.99, $response['data']['products'][0]['price']);
    }

    public function testUpdateProduct()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $product = $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Original Product',
            'price' => 100.00
        ]);

        $updateData = [
            'name' => 'Updated Product',
            'price' => 150.00,
            'description' => 'Updated description'
        ];

        $response = $this->productController->updateProduct($userData, $product['id'], $updateData);

        $this->assertTrue($response['success']);
        $this->assertEquals('Updated Product', $response['data']['product']['name']);
        $this->assertEquals(150.00, $response['data']['product']['price']);
        $this->assertEquals('Updated description', $response['data']['product']['description']);
        $this->assertEquals('Product updated successfully', $response['data']['message']);
    }

    public function testUpdateProductAsCustomer()
    {
        $vendor = $this->createTestVendor();
        $customer = $this->createTestCustomer();
        
        $product = $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Vendor Product',
            'price' => 100.00
        ]);

        $userData = [
            'user_id' => $customer['id'],
            'email' => $customer['email'],
            'role' => 'user'
        ];

        $response = $this->productController->updateProduct($userData, $product['id'], ['name' => 'Hacked Product']);

        $this->assertFalse($response['success']);
        $this->assertEquals(403, $response['status']);
    }

    public function testDeleteProduct()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $product = $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Product to Delete',
            'price' => 100.00
        ]);

        $response = $this->productController->deleteProduct($userData, $product['id']);

        $this->assertTrue($response['success']);
        $this->assertEquals('Product deleted successfully', $response['data']['message']);

        // Verify product is deleted (soft delete)
        $deletedProduct = $this->productModel->findById($product['id']);
        $this->assertNull($deletedProduct);
    }

    public function testUpdateStock()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $product = $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Stock Product',
            'price' => 50.00,
            'stock_quantity' => 10
        ]);

        $response = $this->productController->updateStock($userData, $product['id'], ['quantity' => 25]);

        $this->assertTrue($response['success']);
        $this->assertEquals(25, $response['data']['product']['stock_quantity']);
        $this->assertEquals('Stock updated successfully', $response['data']['message']);
    }

    public function testUpdateStockWithInvalidQuantity()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $product = $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Stock Product',
            'price' => 50.00
        ]);

        $response = $this->productController->updateStock($userData, $product['id'], ['quantity' => -5]);

        $this->assertFalse($response['success']);
        $this->assertEquals(400, $response['status']);
        $this->assertEquals('Quantity cannot be negative', $response['error']['message']);
    }

    public function testGetCategories()
    {
        $vendor = $this->createTestVendor();
        
        $categories = ['electronics', 'clothing', 'electronics', 'books'];
        
        foreach ($categories as $category) {
            $this->productModel->create([
                'vendor_id' => $vendor['id'],
                'name' => "Product in {$category}",
                'price' => 10.00,
                'category' => $category
            ]);
        }

        $response = $this->productController->getCategories();

        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('categories', $response['data']);
        $this->assertGreaterThan(0, count($response['data']['categories']));
    }

    public function testGetPopularProducts()
    {
        $vendor = $this->createTestVendor();
        
        for ($i = 1; $i <= 5; $i++) {
            $this->productModel->create([
                'vendor_id' => $vendor['id'],
                'name' => "Product {$i}",
                'price' => 10.00 * $i
            ]);
        }

        $response = $this->productController->getPopularProducts(3);

        $this->assertTrue($response['success']);
        $this->assertCount(3, $response['data']['products']);
    }

    public function testGetLowStockProducts()
    {
        $vendor = $this->createTestVendor();
        
        $userData = [
            'user_id' => $vendor['id'],
            'email' => $vendor['email'],
            'role' => 'vendor'
        ];

        $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Low Stock Product',
            'price' => 10.00,
            'stock_quantity' => 2
        ]);

        $this->productModel->create([
            'vendor_id' => $vendor['id'],
            'name' => 'Well Stocked Product',
            'price' => 20.00,
            'stock_quantity' => 50
        ]);

        $response = $this->productController->getLowStockProducts($userData, 5);

        $this->assertTrue($response['success']);
        $this->assertCount(1, $response['data']['products']);
        $this->assertEquals('Low Stock Product', $response['data']['products'][0]['name']);
        $this->assertEquals(5, $response['data']['threshold']);
    }

    public function testResponseFormatting()
    {
        $successResponse = $this->productController->successResponse(['test' => 'data'], 201);
        
        $this->assertTrue($successResponse['success']);
        $this->assertEquals(201, $successResponse['status']);
        $this->assertEquals('data', $successResponse['data']['test']);
        $this->assertArrayHasKey('timestamp', $successResponse);

        $errorResponse = $this->productController->errorResponse('Test error', 400);
        
        $this->assertFalse($errorResponse['success']);
        $this->assertEquals(400, $errorResponse['status']);
        $this->assertEquals('Test error', $errorResponse['error']['message']);
        $this->assertEquals(400, $errorResponse['error']['code']);
    }
}