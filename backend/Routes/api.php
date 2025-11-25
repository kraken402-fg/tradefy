<?php

namespace Tradefy\Routes;

use Tradefy\Controllers\AuthController;
use Tradefy\Controllers\ProductController;
use Tradefy\Controllers\OrderController;
use Tradefy\Controllers\WebhookController;
use Tradefy\Utils\Security;
use Tradefy\Config\Settings;
use PDO;
use Exception;

class ApiRouter
{
    private $db;
    private $authController;
    private $productController;
    private $orderController;
    private $webhookController;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->authController = new AuthController($db);
        $this->productController = new ProductController($db);
        $this->orderController = new OrderController($db);
        $this->webhookController = new WebhookController($db);
    }

    /**
     * Main API router
     */
    public function route(): void
    {
        // Set CORS headers
        $this->setCorsHeaders();

        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        // Get request path and method
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $method = $_SERVER['REQUEST_METHOD'];

        // Remove base path if exists
        $basePath = '/api';
        if (strpos($path, $basePath) === 0) {
            $path = substr($path, strlen($basePath));
        }

        // Split path into segments
        $segments = explode('/', trim($path, '/'));
        $resource = $segments[0] ?? '';
        $id = $segments[1] ?? null;
        $subresource = $segments[2] ?? null;

        try {
            // Route the request
            $response = $this->routeRequest($method, $resource, $id, $subresource, $segments);
            
            // Send response
            $this->sendJsonResponse($response);

        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Route request to appropriate handler
     */
    private function routeRequest(string $method, string $resource, ?string $id, ?string $subresource, array $segments): array
    {
        switch ($resource) {
            case 'auth':
                return $this->routeAuth($method, $segments);
                
            case 'products':
                return $this->routeProducts($method, $id, $subresource, $segments);
                
            case 'orders':
                return $this->routeOrders($method, $id, $subresource, $segments);
                
            case 'webhooks':
                return $this->routeWebhooks($method, $segments);
                
            case 'health':
                return $this->healthCheck();
                
            default:
                return $this->errorResponse('Endpoint not found', 404);
        }
    }

    /**
     * Auth routes
     */
    private function routeAuth(string $method, array $segments): array
    {
        $action = $segments[1] ?? '';

        switch ("$method:$action") {
            case 'POST:register':
                $data = $this->authController->getInputData();
                return $this->authController->register($data);
                
            case 'POST:login':
                $data = $this->authController->getInputData();
                return $this->authController->login($data);
                
            case 'POST:refresh':
                $userData = $this->getAuthenticatedUser();
                return $this->authController->refreshToken($userData);
                
            case 'GET:profile':
                $userData = $this->getAuthenticatedUser();
                return $this->authController->getProfile($userData);
                
            case 'PUT:profile':
                $userData = $this->getAuthenticatedUser();
                $data = $this->authController->getInputData();
                return $this->authController->updateProfile($userData, $data);
                
            case 'PUT:password':
                $userData = $this->getAuthenticatedUser();
                $data = $this->authController->getInputData();
                return $this->authController->changePassword($userData, $data);
                
            case 'GET:commission':
                $userData = $this->getAuthenticatedUser();
                return $this->authController->getCommissionInfo($userData);
                
            case 'GET:rank-upgrade':
                $userData = $this->getAuthenticatedUser();
                return $this->authController->checkRankUpgrade($userData);
                
            case 'GET:users':
                $userData = $this->getAuthenticatedUser();
                $filters = $_GET;
                return $this->authController->getUsers($userData, $filters);
                
            case 'DELETE:users':
                $userData = $this->getAuthenticatedUser();
                $targetUserId = $segments[2] ?? null;
                if (!$targetUserId) {
                    return $this->errorResponse('User ID required', 400);
                }
                return $this->authController->deactivateUser($userData, (int)$targetUserId);
                
            default:
                return $this->errorResponse('Auth endpoint not found', 404);
        }
    }

    /**
     * Product routes
     */
    private function routeProducts(string $method, ?string $id, ?string $subresource, array $segments): array
    {
        switch ($method) {
            case 'GET':
                if ($id === null) {
                    // GET /products - Search products
                    $filters = $_GET;
                    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                    $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
                    return $this->productController->searchProducts($filters, $page, $perPage);
                } elseif ($subresource === 'vendor') {
                    // GET /products/{id}/vendor - Get vendor's products
                    $userData = $this->getAuthenticatedUser();
                    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                    $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
                    return $this->productController->getVendorProducts($userData, $page, $perPage);
                } elseif ($subresource === 'low-stock') {
                    // GET /products/{id}/low-stock - Get low stock products
                    $userData = $this->getAuthenticatedUser();
                    $threshold = isset($_GET['threshold']) ? (int)$_GET['threshold'] : 5;
                    return $this->productController->getLowStockProducts($userData, $threshold);
                } else {
                    // GET /products/{id} - Get product by ID
                    return $this->productController->getProduct((int)$id);
                }
                
            case 'POST':
                if ($subresource === 'images') {
                    // POST /products/{id}/images - Upload product image
                    $userData = $this->getAuthenticatedUser();
                    $files = $this->productController->handleFileUploads();
                    $data = array_merge($_POST, ['product_id' => $id, 'image' => $files['image'] ?? null]);
                    return $this->productController->uploadImage($userData, $data);
                } else {
                    // POST /products - Create product
                    $userData = $this->getAuthenticatedUser();
                    $data = $this->productController->getInputData();
                    return $this->productController->create($userData, $data);
                }
                
            case 'PUT':
                if ($id && $subresource === 'stock') {
                    // PUT /products/{id}/stock - Update product stock
                    $userData = $this->getAuthenticatedUser();
                    $data = $this->productController->getInputData();
                    return $this->productController->updateStock($userData, (int)$id, $data);
                } elseif ($id) {
                    // PUT /products/{id} - Update product
                    $userData = $this->getAuthenticatedUser();
                    $data = $this->productController->getInputData();
                    return $this->productController->updateProduct($userData, (int)$id, $data);
                }
                break;
                
            case 'DELETE':
                if ($id && $subresource === 'images') {
                    // DELETE /products/{id}/images - Delete product image
                    $userData = $this->getAuthenticatedUser();
                    $imageUrl = $_GET['url'] ?? '';
                    return $this->productController->deleteImage($userData, (int)$id, $imageUrl);
                } elseif ($id) {
                    // DELETE /products/{id} - Delete product
                    $userData = $this->getAuthenticatedUser();
                    return $this->productController->deleteProduct($userData, (int)$id);
                }
                break;
        }

        // Additional product endpoints
        if ($method === 'GET') {
            if ($segments[1] === 'categories') {
                // GET /products/categories - Get product categories
                return $this->productController->getCategories();
            } elseif ($segments[1] === 'popular') {
                // GET /products/popular - Get popular products
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                return $this->productController->getPopularProducts($limit);
            }
        }

        return $this->errorResponse('Product endpoint not found', 404);
    }

    /**
     * Order routes
     */
    private function routeOrders(string $method, ?string $id, ?string $subresource, array $segments): array
    {
        $userData = $this->getAuthenticatedUser();

        switch ($method) {
            case 'GET':
                if ($id === null) {
                    if ($segments[1] === 'vendor') {
                        // GET /orders/vendor - Get vendor's orders
                        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
                        return $this->orderController->getVendorOrders($userData, $page, $perPage);
                    } elseif ($segments[1] === 'recent' && $userData['role'] === 'admin') {
                        // GET /orders/recent - Get recent orders (admin only)
                        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
                        return $this->orderController->getRecentOrders($userData, $limit);
                    } else {
                        // GET /orders - Get customer's orders
                        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
                        return $this->orderController->getCustomerOrders($userData, $page, $perPage);
                    }
                } else {
                    // GET /orders/{id} - Get order by ID
                    return $this->orderController->getOrder($userData, (int)$id);
                }
                
            case 'POST':
                if ($id === null) {
                    // POST /orders - Create order
                    $data = $this->orderController->getInputData();
                    return $this->orderController->create($userData, $data);
                } elseif ($id && $subresource === 'review') {
                    // POST /orders/{id}/review - Add review to order
                    $data = $this->orderController->getInputData();
                    return $this->orderController->addReview($userData, (int)$id, $data);
                }
                break;
                
            case 'PUT':
                if ($id && $subresource === 'status') {
                    // PUT /orders/{id}/status - Update order status
                    $data = $this->orderController->getInputData();
                    return $this->orderController->updateStatus($userData, (int)$id, $data);
                }
                break;
                
            case 'POST':
                if ($id && $subresource === 'refund') {
                    // POST /orders/{id}/refund - Refund order
                    $data = $this->orderController->getInputData();
                    return $this->orderController->refundOrder($userData, (int)$id, $data);
                }
                break;
        }

        // Additional order endpoints
        if ($method === 'GET' && $segments[1] === 'stats' && $segments[2] === 'vendor') {
            // GET /orders/stats/vendor - Get vendor statistics
            return $this->orderController->getVendorStats($userData);
        }

        return $this->errorResponse('Order endpoint not found', 404);
    }

    /**
     * Webhook routes
     */
    private function routeWebhooks(string $method, array $segments): array
    {
        $action = $segments[1] ?? '';

        if ($method !== 'POST') {
            return $this->errorResponse('Method not allowed for webhooks', 405);
        }

        switch ($action) {
            case 'moneroo':
                // POST /webhooks/moneroo - Moneroo payment webhook
                return $this->webhookController->processMonerooWebhook();
                
            case 'test':
                // POST /webhooks/test - Test webhook (development only)
                if (Settings::isProduction()) {
                    return $this->errorResponse('Test webhook not available in production', 403);
                }
                $data = $this->webhookController->getInputData();
                return $this->webhookController->testWebhook($data);
                
            case 'health':
                // POST /webhooks/health - Webhook health check
                return $this->webhookController->healthCheck();
                
            case 'logs':
                // POST /webhooks/logs - Get webhook logs (admin only)
                $userData = $this->getAuthenticatedUser();
                $filters = $this->webhookController->getInputData();
                return $this->webhookController->getWebhookLogs($userData, $filters);
                
            default:
                return $this->errorResponse('Webhook endpoint not found', 404);
        }
    }

    /**
     * Health check endpoint
     */
    private function healthCheck(): array
    {
        return [
            'success' => true,
            'status' => 200,
            'data' => [
                'message' => 'Tradefy API is running',
                'version' => Settings::getAppVersion(),
                'environment' => Settings::getEnvironment(),
                'timestamp' => time()
            ],
            'timestamp' => time()
        ];
    }

    /**
     * Get authenticated user from JWT token
     */
    private function getAuthenticatedUser(): array
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($authHeader)) {
            throw new Exception('Authorization header required', 401);
        }

        // Extract token from "Bearer {token}" format
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        } else {
            throw new Exception('Invalid authorization format', 401);
        }

        try {
            $userData = Security::validateToken($token);
            
            // Verify user is still active in database
            $userModel = new \Tradefy\Models\User($this->db);
            $user = $userModel->findById($userData['user_id']);
            
            if (!$user) {
                throw new Exception('User not found or inactive', 401);
            }

            return $userData;

        } catch (Exception $e) {
            throw new Exception('Invalid token: ' . $e->getMessage(), 401);
        }
    }

    /**
     * Set CORS headers
     */
    private function setCorsHeaders(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = Settings::getAllowedOrigins();

        if ($origin && in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: {$origin}");
        } else {
            header("Access-Control-Allow-Origin: " . Settings::getAppUrl());
        }

        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Content-Type: application/json');
    }

    /**
     * Send JSON response
     */
    private function sendJsonResponse(array $response): void
    {
        http_response_code($response['status']);
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Send error response
     */
    private function sendErrorResponse(string $message, int $statusCode): void
    {
        $response = [
            'success' => false,
            'status' => $statusCode,
            'error' => [
                'message' => $message,
                'code' => $statusCode
            ],
            'timestamp' => time()
        ];

        http_response_code($statusCode);
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Error response helper
     */
    private function errorResponse(string $message, int $statusCode): array
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
     * Get database connection for migrations
     */
    public function getDatabase(): PDO
    {
        return $this->db;
    }
}

/**
 * Bootstrap the application
 */
function bootstrapApplication(): ApiRouter
{
    // Load configuration
    \Tradefy\Config\Settings::initialize();
    
    // Apply environment settings
    \Tradefy\Config\Settings::applyEnvironmentSettings();

    // Initialize database connection
    $dbConfig = \Tradefy\Config\Settings::getDatabaseConfig();
    $dsn = \Tradefy\Config\Settings::getDatabaseDSN();
    
    try {
        $db = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        
        // Set timezone for database connection
        $db->exec("SET timezone = 'UTC'");
        
        return new ApiRouter($db);
        
    } catch (Exception $e) {
        error_log('Database connection failed: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection failed',
            'message' => Settings::isDevelopment() ? $e->getMessage() : 'Internal server error'
        ]);
        exit(1);
    }
}

// Start the application
try {
    $router = bootstrapApplication();
    $router->route();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Application bootstrap failed',
        'message' => \Tradefy\Config\Settings::isDevelopment() ? $e->getMessage() : 'Internal server error',
        'timestamp' => time()
    ]);
}