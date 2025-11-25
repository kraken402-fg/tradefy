<?php

namespace Tradefy\Controllers;

use Tradefy\Models\Product;
use Tradefy\Services\SupabaseService;
use Tradefy\Utils\Security;
use PDO;
use Exception;

class ProductController
{
    private $productModel;
    private $supabaseService;
    private $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->productModel = new Product($db);
        $this->supabaseService = new SupabaseService();
    }

    /**
     * Create new product
     */
    public function create(array $userData, array $productData): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can create products', 403);
            }

            // Set vendor_id from authenticated user
            $productData['vendor_id'] = $userData['user_id'];

            // Handle image upload if provided
            if (!empty($productData['images']) && is_array($productData['images'])) {
                $uploadedImages = [];
                
                foreach ($productData['images'] as $index => $imageData) {
                    if (is_string($imageData) && strpos($imageData, 'data:image') === 0) {
                        // Base64 image data
                        $imagePath = "products/{$productData['vendor_id']}/" . uniqid() . "_image_{$index}.jpg";
                        $uploadResult = $this->supabaseService->uploadFromBase64($imageData, $imagePath);
                        $uploadedImages[] = $uploadResult['public_url'];
                    }
                }
                
                $productData['images'] = $uploadedImages;
            }

            // Create product
            $product = $this->productModel->create($productData);

            return $this->successResponse([
                'product' => $this->formatProductResponse($product),
                'message' => 'Product created successfully'
            ], 201);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get product by ID
     */
    public function getProduct(int $productId): array
    {
        try {
            $product = $this->productModel->findById($productId);

            if (!$product) {
                return $this->errorResponse('Product not found', 404);
            }

            return $this->successResponse([
                'product' => $this->formatProductResponse($product)
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get vendor's products
     */
    public function getVendorProducts(array $userData, int $page = 1, int $perPage = 20): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can access their products', 403);
            }

            $result = $this->productModel->findByVendor($userData['user_id'], $page, $perPage);

            // Format products for response
            $result['products'] = array_map(function($product) {
                return $this->formatProductResponse($product);
            }, $result['products']);

            return $this->successResponse($result);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Search products
     */
    public function searchProducts(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        try {
            // Sanitize search filters
            $sanitizedFilters = [];
            
            if (!empty($filters['query'])) {
                $sanitizedFilters['query'] = Security::sanitizeInput($filters['query']);
            }
            
            if (!empty($filters['category'])) {
                $sanitizedFilters['category'] = Security::sanitizeInput($filters['category']);
            }
            
            if (!empty($filters['vendor_id'])) {
                $sanitizedFilters['vendor_id'] = (int) $filters['vendor_id'];
            }
            
            if (isset($filters['min_price'])) {
                $sanitizedFilters['min_price'] = (float) $filters['min_price'];
            }
            
            if (isset($filters['max_price'])) {
                $sanitizedFilters['max_price'] = (float) $filters['max_price'];
            }
            
            if (isset($filters['is_digital'])) {
                $sanitizedFilters['is_digital'] = (bool) $filters['is_digital'];
            }

            $result = $this->productModel->search($sanitizedFilters, $page, $perPage);

            // Format products for response
            $result['products'] = array_map(function($product) {
                return $this->formatProductResponse($product);
            }, $result['products']);

            return $this->successResponse($result);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Update product
     */
    public function updateProduct(array $userData, int $productId, array $updateData): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can update products', 403);
            }

            // Handle image upload if provided
            if (!empty($updateData['images']) && is_array($updateData['images'])) {
                $uploadedImages = [];
                
                foreach ($updateData['images'] as $index => $imageData) {
                    if (is_string($imageData) && strpos($imageData, 'data:image') === 0) {
                        // Base64 image data
                        $imagePath = "products/{$userData['user_id']}/" . uniqid() . "_image_{$index}.jpg";
                        $uploadResult = $this->supabaseService->uploadFromBase64($imageData, $imagePath);
                        $uploadedImages[] = $uploadResult['public_url'];
                    } elseif (is_string($imageData)) {
                        // Existing image URL
                        $uploadedImages[] = $imageData;
                    }
                }
                
                $updateData['images'] = $uploadedImages;
            }

            $updatedProduct = $this->productModel->update($productId, $userData['user_id'], $updateData);

            return $this->successResponse([
                'product' => $this->formatProductResponse($updatedProduct),
                'message' => 'Product updated successfully'
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Delete product
     */
    public function deleteProduct(array $userData, int $productId): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can delete products', 403);
            }

            $success = $this->productModel->delete($productId, $userData['user_id']);

            if ($success) {
                return $this->successResponse(['message' => 'Product deleted successfully']);
            } else {
                return $this->errorResponse('Failed to delete product', 500);
            }

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Update product stock
     */
    public function updateStock(array $userData, int $productId, array $stockData): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can update product stock', 403);
            }

            if (!isset($stockData['quantity'])) {
                return $this->errorResponse('Quantity is required', 400);
            }

            $quantity = (int) $stockData['quantity'];
            
            if ($quantity < 0) {
                return $this->errorResponse('Quantity cannot be negative', 400);
            }

            $success = $this->productModel->updateStock($productId, $quantity);

            if ($success) {
                $updatedProduct = $this->productModel->findById($productId);
                return $this->successResponse([
                    'product' => $this->formatProductResponse($updatedProduct),
                    'message' => 'Stock updated successfully'
                ]);
            } else {
                return $this->errorResponse('Failed to update stock', 500);
            }

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get product categories
     */
    public function getCategories(): array
    {
        try {
            $categories = $this->productModel->getCategories();

            return $this->successResponse(['categories' => $categories]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get popular products
     */
    public function getPopularProducts(int $limit = 10): array
    {
        try {
            $products = $this->productModel->getPopularProducts($limit);

            $formattedProducts = array_map(function($product) {
                return $this->formatProductResponse($product);
            }, $products);

            return $this->successResponse(['products' => $formattedProducts]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get low stock products (for vendors)
     */
    public function getLowStockProducts(array $userData, int $threshold = 5): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can access low stock products', 403);
            }

            $products = $this->productModel->getLowStockProducts($userData['user_id'], $threshold);

            $formattedProducts = array_map(function($product) {
                return $this->formatProductResponse($product);
            }, $products);

            return $this->successResponse([
                'products' => $formattedProducts,
                'threshold' => $threshold
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Upload product image
     */
    public function uploadImage(array $userData, array $fileData): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can upload product images', 403);
            }

            if (empty($fileData['image']) || empty($fileData['product_id'])) {
                return $this->errorResponse('Image and product_id are required', 400);
            }

            $productId = (int) $fileData['product_id'];
            
            // Verify product belongs to vendor
            $product = $this->productModel->findById($productId);
            if (!$product || $product['vendor_id'] !== $userData['user_id']) {
                return $this->errorResponse('Product not found or access denied', 404);
            }

            $uploadResult = $this->supabaseService->uploadProductImage(
                $fileData['image'],
                $productId,
                $fileData['image_type'] ?? 'main'
            );

            // Add image to product's images array
            $currentImages = $product['images'] ?? [];
            $currentImages[] = $uploadResult['public_url'];

            $this->productModel->update($productId, $userData['user_id'], [
                'images' => $currentImages
            ]);

            return $this->successResponse([
                'image_url' => $uploadResult['public_url'],
                'message' => 'Image uploaded successfully'
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Delete product image
     */
    public function deleteImage(array $userData, int $productId, string $imageUrl): array
    {
        try {
            // Verify user is a vendor
            if ($userData['role'] !== 'vendor') {
                return $this->errorResponse('Only vendors can delete product images', 403);
            }

            // Verify product belongs to vendor
            $product = $this->productModel->findById($productId);
            if (!$product || $product['vendor_id'] !== $userData['user_id']) {
                return $this->errorResponse('Product not found or access denied', 404);
            }

            // Remove image from product's images array
            $currentImages = $product['images'] ?? [];
            $updatedImages = array_filter($currentImages, function($image) use ($imageUrl) {
                return $image !== $imageUrl;
            });

            $this->productModel->update($productId, $userData['user_id'], [
                'images' => array_values($updatedImages)
            ]);

            // Extract file path from URL and delete from Supabase
            $pathParts = explode('/', parse_url($imageUrl, PHP_URL_PATH));
            $filePath = end($pathParts);
            
            if (!empty($filePath)) {
                $this->supabaseService->deleteFile("products/{$productId}/{$filePath}");
            }

            return $this->successResponse(['message' => 'Image deleted successfully']);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Format product response
     */
    private function formatProductResponse(array $product): array
    {
        return [
            'id' => $product['id'],
            'vendor_id' => $product['vendor_id'],
            'name' => $product['name'],
            'description' => $product['description'],
            'price' => (float) $product['price'],
            'currency' => $product['currency'],
            'category' => $product['category'],
            'tags' => $product['tags'],
            'images' => $product['images'],
            'stock_quantity' => $product['stock_quantity'],
            'is_active' => $product['is_active'],
            'is_digital' => $product['is_digital'],
            'file_url' => $product['file_url'],
            'created_at' => $product['created_at'],
            'updated_at' => $product['updated_at']
        ];
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
     * Get input data from request
     */
    public function getInputData(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (strpos($contentType, 'application/json') !== false) {
            $input = file_get_contents('php://input');
            return json_decode($input, true) ?? [];
        }

        return $_POST;
    }

    /**
     * Handle file uploads
     */
    public function handleFileUploads(): array
    {
        $files = [];

        if (!empty($_FILES)) {
            foreach ($_FILES as $key => $file) {
                if ($file['error'] === UPLOAD_ERR_OK) {
                    $files[$key] = $file;
                }
            }
        }

        return $files;
    }
}