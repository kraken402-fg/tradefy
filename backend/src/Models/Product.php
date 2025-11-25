<?php

namespace Tradefy\Models;

use PDO;
use Tradefy\Utils\Security;
use Exception;

class Product
{
    private $db;
    private $id;
    private $vendorId;
    private $name;
    private $description;
    private $price;
    private $currency;
    private $category;
    private $tags;
    private $images;
    private $stockQuantity;
    private $isActive;
    private $isDigital;
    private $fileUrl;
    private $createdAt;
    private $updatedAt;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Create new product
     */
    public function create(array $productData): array
    {
        // Validate required fields
        $required = ['vendor_id', 'name', 'price'];
        foreach ($required as $field) {
            if (empty($productData[$field])) {
                throw new Exception("Field {$field} is required");
            }
        }

        // Validate price
        $price = (float) $productData['price'];
        $minPrice = \Tradefy\Config\Settings::getMinProductPrice();
        $maxPrice = \Tradefy\Config\Settings::getMaxProductPrice();
        
        if ($price < $minPrice || $price > $maxPrice) {
            throw new Exception("Price must be between {$minPrice} and {$maxPrice}");
        }

        // Prepare product data
        $vendorId = (int) $productData['vendor_id'];
        $name = Security::sanitizeInput($productData['name']);
        $description = Security::sanitizeInput($productData['description'] ?? '');
        $currency = strtoupper($productData['currency'] ?? 'USD');
        $category = Security::sanitizeInput($productData['category'] ?? 'general');
        $tags = $productData['tags'] ?? [];
        $images = $productData['images'] ?? [];
        $stockQuantity = (int) ($productData['stock_quantity'] ?? 0);
        $isDigital = (bool) ($productData['is_digital'] ?? false);
        $fileUrl = Security::sanitizeInput($productData['file_url'] ?? '');

        // Validate digital product
        if ($isDigital && empty($fileUrl)) {
            throw new Exception('Digital products must have a file URL');
        }

        $sql = "INSERT INTO products 
                (vendor_id, name, description, price, currency, category, tags, images, 
                 stock_quantity, is_active, is_digital, file_url, created_at, updated_at) 
                VALUES 
                (:vendor_id, :name, :description, :price, :currency, :category, :tags, :images,
                 :stock_quantity, true, :is_digital, :file_url, NOW(), NOW())
                RETURNING *";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':vendor_id' => $vendorId,
            ':name' => $name,
            ':description' => $description,
            ':price' => $price,
            ':currency' => $currency,
            ':category' => $category,
            ':tags' => json_encode($tags),
            ':images' => json_encode($images),
            ':stock_quantity' => $stockQuantity,
            ':is_digital' => $isDigital,
            ':file_url' => $fileUrl
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->loadFromArray($result);

        return $this->toArray();
    }

    /**
     * Find product by ID
     */
    public function findById(int $productId): ?array
    {
        $sql = "SELECT p.*, u.email as vendor_email, u.profile_data as vendor_profile
                FROM products p
                LEFT JOIN users u ON p.vendor_id = u.id
                WHERE p.id = :id AND p.is_active = true AND u.is_active = true";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $productId]);
        
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            return null;
        }

        $this->loadFromArray($product);
        return $this->toArray();
    }

    /**
     * Find products by vendor
     */
    public function findByVendor(int $vendorId, int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM products 
                     WHERE vendor_id = :vendor_id AND is_active = true";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute([':vendor_id' => $vendorId]);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get products
        $sql = "SELECT p.*, u.email as vendor_email, u.profile_data as vendor_profile
                FROM products p
                LEFT JOIN users u ON p.vendor_id = u.id
                WHERE p.vendor_id = :vendor_id AND p.is_active = true
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':vendor_id', $vendorId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format products
        $formattedProducts = array_map(function($product) {
            $this->loadFromArray($product);
            return $this->toArray();
        }, $products);

        return [
            'products' => $formattedProducts,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }

    /**
     * Search products
     */
    public function search(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;
        $whereConditions = ["p.is_active = true", "u.is_active = true"];
        $params = [];

        // Apply filters
        if (!empty($filters['query'])) {
            $whereConditions[] = "(p.name ILIKE :query OR p.description ILIKE :query OR p.tags::text ILIKE :query)";
            $params[':query'] = '%' . $filters['query'] . '%';
        }

        if (!empty($filters['category'])) {
            $whereConditions[] = "p.category = :category";
            $params[':category'] = $filters['category'];
        }

        if (!empty($filters['vendor_id'])) {
            $whereConditions[] = "p.vendor_id = :vendor_id";
            $params[':vendor_id'] = $filters['vendor_id'];
        }

        if (isset($filters['min_price'])) {
            $whereConditions[] = "p.price >= :min_price";
            $params[':min_price'] = $filters['min_price'];
        }

        if (isset($filters['max_price'])) {
            $whereConditions[] = "p.price <= :max_price";
            $params[':max_price'] = $filters['max_price'];
        }

        if (isset($filters['is_digital'])) {
            $whereConditions[] = "p.is_digital = :is_digital";
            $params[':is_digital'] = $filters['is_digital'];
        }

        $whereClause = implode(' AND ', $whereConditions);

        // Get total count
        $countSql = "SELECT COUNT(*) as total 
                     FROM products p
                     LEFT JOIN users u ON p.vendor_id = u.id
                     WHERE {$whereClause}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get products
        $sql = "SELECT p.*, u.email as vendor_email, u.profile_data as vendor_profile
                FROM products p
                LEFT JOIN users u ON p.vendor_id = u.id
                WHERE {$whereClause}
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format products
        $formattedProducts = array_map(function($product) {
            $this->loadFromArray($product);
            return $this->toArray();
        }, $products);

        return [
            'products' => $formattedProducts,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ],
            'filters' => $filters
        ];
    }

    /**
     * Update product
     */
    public function update(int $productId, int $vendorId, array $updateData): array
    {
        // Verify product exists and belongs to vendor
        $product = $this->findById($productId);
        if (!$product || $product['vendor_id'] !== $vendorId) {
            throw new Exception('Product not found or access denied');
        }

        $allowedFields = ['name', 'description', 'price', 'currency', 'category', 'tags', 'images', 'stock_quantity', 'is_digital', 'file_url'];
        $updates = [];
        $params = [':id' => $productId];

        foreach ($updateData as $field => $value) {
            if (in_array($field, $allowedFields)) {
                if ($field === 'price') {
                    $price = (float) $value;
                    $minPrice = \Tradefy\Config\Settings::getMinProductPrice();
                    $maxPrice = \Tradefy\Config\Settings::getMaxProductPrice();
                    
                    if ($price < $minPrice || $price > $maxPrice) {
                        throw new Exception("Price must be between {$minPrice} and {$maxPrice}");
                    }
                }

                if (in_array($field, ['tags', 'images'])) {
                    $updates[] = "{$field} = :{$field}";
                    $params[":{$field}"] = json_encode($value);
                } else {
                    $updates[] = "{$field} = :{$field}";
                    $params[":{$field}"] = $value;
                }
            }
        }

        if (empty($updates)) {
            throw new Exception('No valid fields to update');
        }

        $updates[] = "updated_at = NOW()";
        $sql = "UPDATE products SET " . implode(', ', $updates) . " WHERE id = :id RETURNING *";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $updatedProduct = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$updatedProduct) {
            throw new Exception('Failed to update product');
        }

        $this->loadFromArray($updatedProduct);
        return $this->toArray();
    }

    /**
     * Delete product (soft delete)
     */
    public function delete(int $productId, int $vendorId): bool
    {
        // Verify product exists and belongs to vendor
        $product = $this->findById($productId);
        if (!$product || $product['vendor_id'] !== $vendorId) {
            throw new Exception('Product not found or access denied');
        }

        $sql = "UPDATE products SET is_active = false, updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $productId]);
    }

    /**
     * Update product stock
     */
    public function updateStock(int $productId, int $newQuantity): bool
    {
        $sql = "UPDATE products SET stock_quantity = :quantity, updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':quantity' => $newQuantity,
            ':id' => $productId
        ]);
    }

    /**
     * Decrement product stock
     */
    public function decrementStock(int $productId, int $quantity = 1): bool
    {
        $sql = "UPDATE products SET stock_quantity = stock_quantity - :quantity, updated_at = NOW() 
                WHERE id = :id AND stock_quantity >= :quantity";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':quantity' => $quantity,
            ':id' => $productId
        ]);
    }

    /**
     * Check if product is in stock
     */
    public function isInStock(int $productId, int $quantity = 1): bool
    {
        $sql = "SELECT stock_quantity FROM products WHERE id = :id AND is_active = true";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $productId]);
        
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        return $product && $product['stock_quantity'] >= $quantity;
    }

    /**
     * Get product categories
     */
    public function getCategories(): array
    {
        $sql = "SELECT DISTINCT category, COUNT(*) as product_count 
                FROM products 
                WHERE is_active = true 
                GROUP BY category 
                ORDER BY product_count DESC";
        
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get popular products
     */
    public function getPopularProducts(int $limit = 10): array
    {
        $sql = "SELECT p.*, u.email as vendor_email, u.profile_data as vendor_profile,
                (SELECT COUNT(*) FROM orders o WHERE o.product_id = p.id) as order_count
                FROM products p
                LEFT JOIN users u ON p.vendor_id = u.id
                WHERE p.is_active = true AND u.is_active = true
                ORDER BY order_count DESC, p.created_at DESC
                LIMIT :limit";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function($product) {
            $this->loadFromArray($product);
            return $this->toArray();
        }, $products);
    }

    /**
     * Get products needing restock (for vendors)
     */
    public function getLowStockProducts(int $vendorId, int $threshold = 5): array
    {
        $sql = "SELECT * FROM products 
                WHERE vendor_id = :vendor_id 
                AND is_active = true 
                AND stock_quantity <= :threshold
                ORDER BY stock_quantity ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':vendor_id' => $vendorId,
            ':threshold' => $threshold
        ]);
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function($product) {
            $this->loadFromArray($product);
            return $this->toArray();
        }, $products);
    }

    /**
     * Load product data from array
     */
    private function loadFromArray(array $product): void
    {
        $this->id = $product['id'];
        $this->vendorId = $product['vendor_id'];
        $this->name = $product['name'];
        $this->description = $product['description'];
        $this->price = (float) $product['price'];
        $this->currency = $product['currency'];
        $this->category = $product['category'];
        $this->tags = json_decode($product['tags'], true) ?? [];
        $this->images = json_decode($product['images'], true) ?? [];
        $this->stockQuantity = (int) $product['stock_quantity'];
        $this->isActive = (bool) $product['is_active'];
        $this->isDigital = (bool) $product['is_digital'];
        $this->fileUrl = $product['file_url'];
        $this->createdAt = $product['created_at'];
        $this->updatedAt = $product['updated_at'];
    }

    /**
     * Convert product to array
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'vendor_id' => $this->vendorId,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'currency' => $this->currency,
            'category' => $this->category,
            'tags' => $this->tags,
            'images' => $this->images,
            'stock_quantity' => $this->stockQuantity,
            'is_active' => $this->isActive,
            'is_digital' => $this->isDigital,
            'file_url' => $this->fileUrl,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt
        ];
    }
}