<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Models\Product;
use PDO;

class ProductTest extends TestCase
{
    private $db;
    private $productModel;

    protected function setUp(): void
    {
        // Create in-memory SQLite database for testing
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Create tables
        $this->createUsersTable();
        $this->createProductsTable();

        $this->productModel = new Product($this->db);
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

    private function createTestVendor(): int
    {
        $sql = "INSERT INTO users (email, password_hash, role) 
                VALUES (:email, :password_hash, 'vendor')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':email' => 'vendor@tradefy.com',
            ':password_hash' => password_hash('password', PASSWORD_BCRYPT)
        ]);
        return $this->db->lastInsertId();
    }

    public function testProductCreation()
    {
        $vendorId = $this->createTestVendor();
        
        $productData = [
            'vendor_id' => $vendorId,
            'name' => 'Test Product',
            'description' => 'Test Description',
            'price' => 99.99,
            'currency' => 'USD',
            'category' => 'electronics',
            'tags' => ['new', 'featured'],
            'images' => ['image1.jpg', 'image2.jpg'],
            'stock_quantity' => 10,
            'is_digital' => false
        ];

        $product = $this->productModel->create($productData);

        $this->assertIsArray($product);
        $this->assertEquals('Test Product', $product['name']);
        $this->assertEquals('Test Description', $product['description']);
        $this->assertEquals(99.99, $product['price']);
        $this->assertEquals('USD', $product['currency']);
        $this->assertEquals('electronics', $product['category']);
        $this->assertEquals(['new', 'featured'], $product['tags']);
        $this->assertEquals(['image1.jpg', 'image2.jpg'], $product['images']);
        $this->assertEquals(10, $product['stock_quantity']);
        $this->assertFalse($product['is_digital']);
        $this->assertTrue($product['is_active']);
    }

    public function testProductCreationWithMissingRequiredFields()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Field vendor_id is required');

        $this->productModel->create([
            'name' => 'Test Product',
            'price' => 99.99
        ]);
    }

    public function testProductCreationWithInvalidPrice()
    {
        $vendorId = $this->createTestVendor();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Price must be between');

        $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Test Product',
            'price' => 0 // Invalid price
        ]);
    }

    public function testFindProductById()
    {
        $vendorId = $this->createTestVendor();
        
        $productData = [
            'vendor_id' => $vendorId,
            'name' => 'Findable Product',
            'price' => 50.00
        ];

        $createdProduct = $this->productModel->create($productData);
        $foundProduct = $this->productModel->findById($createdProduct['id']);

        $this->assertIsArray($foundProduct);
        $this->assertEquals($createdProduct['id'], $foundProduct['id']);
        $this->assertEquals('Findable Product', $foundProduct['name']);
    }

    public function testFindNonExistentProduct()
    {
        $product = $this->productModel->findById(9999);
        $this->assertNull($product);
    }

    public function testFindProductsByVendor()
    {
        $vendorId = $this->createTestVendor();
        
        // Create multiple products for the same vendor
        for ($i = 1; $i <= 3; $i++) {
            $this->productModel->create([
                'vendor_id' => $vendorId,
                'name' => "Product {$i}",
                'price' => 10.00 * $i
            ]);
        }

        $result = $this->productModel->findByVendor($vendorId, 1, 10);

        $this->assertCount(3, $result['products']);
        $this->assertEquals(3, $result['pagination']['total']);
        $this->assertEquals(1, $result['pagination']['page']);
    }

    public function testProductSearch()
    {
        $vendorId = $this->createTestVendor();
        
        $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Apple iPhone',
            'description' => 'Latest smartphone',
            'price' => 999.99,
            'category' => 'electronics',
            'tags' => ['apple', 'mobile']
        ]);

        $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Samsung Galaxy',
            'description' => 'Android phone',
            'price' => 799.99,
            'category' => 'electronics'
        ]);

        // Search by query
        $result = $this->productModel->search(['query' => 'iPhone']);
        $this->assertCount(1, $result['products']);
        $this->assertEquals('Apple iPhone', $result['products'][0]['name']);

        // Search by category
        $result = $this->productModel->search(['category' => 'electronics']);
        $this->assertCount(2, $result['products']);

        // Search by price range
        $result = $this->productModel->search(['min_price' => 800, 'max_price' => 1000]);
        $this->assertCount(1, $result['products']);
        $this->assertEquals(999.99, $result['products'][0]['price']);
    }

    public function testUpdateProduct()
    {
        $vendorId = $this->createTestVendor();
        
        $product = $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Original Product',
            'price' => 100.00
        ]);

        $updatedProduct = $this->productModel->update($product['id'], $vendorId, [
            'name' => 'Updated Product',
            'price' => 150.00,
            'description' => 'Updated description'
        ]);

        $this->assertEquals('Updated Product', $updatedProduct['name']);
        $this->assertEquals(150.00, $updatedProduct['price']);
        $this->assertEquals('Updated description', $updatedProduct['description']);
    }

    public function testUpdateProductWithInvalidVendor()
    {
        $vendorId = $this->createTestVendor();
        
        $product = $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Test Product',
            'price' => 100.00
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Product not found or access denied');

        $this->productModel->update($product['id'], 9999, ['name' => 'Hacked Product']);
    }

    public function testDeleteProduct()
    {
        $vendorId = $this->createTestVendor();
        
        $product = $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Product to Delete',
            'price' => 100.00
        ]);

        $result = $this->productModel->delete($product['id'], $vendorId);
        $this->assertTrue($result);

        $deletedProduct = $this->productModel->findById($product['id']);
        $this->assertNull($deletedProduct);
    }

    public function testStockManagement()
    {
        $vendorId = $this->createTestVendor();
        
        $product = $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Stock Product',
            'price' => 50.00,
            'stock_quantity' => 10
        ]);

        // Test stock check
        $inStock = $this->productModel->isInStock($product['id'], 5);
        $this->assertTrue($inStock);

        $inStock = $this->productModel->isInStock($product['id'], 15);
        $this->assertFalse($inStock);

        // Test decrement stock
        $result = $this->productModel->decrementStock($product['id'], 3);
        $this->assertTrue($result);

        $updatedProduct = $this->productModel->findById($product['id']);
        $this->assertEquals(7, $updatedProduct['stock_quantity']);

        // Test update stock
        $this->productModel->updateStock($product['id'], 20);
        $updatedProduct = $this->productModel->findById($product['id']);
        $this->assertEquals(20, $updatedProduct['stock_quantity']);
    }

    public function testGetCategories()
    {
        $vendorId = $this->createTestVendor();
        
        $categories = ['electronics', 'clothing', 'electronics', 'books'];
        
        foreach ($categories as $category) {
            $this->productModel->create([
                'vendor_id' => $vendorId,
                'name' => "Product in {$category}",
                'price' => 10.00,
                'category' => $category
            ]);
        }

        $categoryList = $this->productModel->getCategories();

        $this->assertIsArray($categoryList);
        $this->assertGreaterThan(0, count($categoryList));
        
        // Should have electronics (2), clothing (1), books (1)
        $electronics = array_filter($categoryList, function($cat) {
            return $cat['category'] === 'electronics';
        });
        $this->assertEquals(2, array_values($electronics)[0]['product_count']);
    }

    public function testGetPopularProducts()
    {
        $vendorId = $this->createTestVendor();
        
        for ($i = 1; $i <= 5; $i++) {
            $this->productModel->create([
                'vendor_id' => $vendorId,
                'name' => "Product {$i}",
                'price' => 10.00 * $i
            ]);
        }

        $popularProducts = $this->productModel->getPopularProducts(3);
        $this->assertCount(3, $popularProducts);
    }

    public function testGetLowStockProducts()
    {
        $vendorId = $this->createTestVendor();
        
        $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Low Stock Product',
            'price' => 10.00,
            'stock_quantity' => 2
        ]);

        $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Well Stocked Product',
            'price' => 20.00,
            'stock_quantity' => 50
        ]);

        $lowStockProducts = $this->productModel->getLowStockProducts($vendorId, 5);
        $this->assertCount(1, $lowStockProducts);
        $this->assertEquals('Low Stock Product', $lowStockProducts[0]['name']);
    }

    public function testDigitalProductValidation()
    {
        $vendorId = $this->createTestVendor();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Digital products must have a file URL');

        $this->productModel->create([
            'vendor_id' => $vendorId,
            'name' => 'Digital Product',
            'price' => 29.99,
            'is_digital' => true
            // Missing file_url
        ]);
    }
}