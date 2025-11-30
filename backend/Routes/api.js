const AuthController = require('../controllers/AuthController');
const ProductController = require('../controllers/ProductController');
const OrderController = require('../controllers/OrderController');
const WebhookController = require('../controllers/WebhookController');
const Security = require('../utils/Security');
const Settings = require('../config/Settings');
const User = require('../models/User');
const Joi = require('joi');

// Schémas de validation
const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    username: Joi.string().min(3).required(),
    full_name: Joi.string().optional(),
    phone: Joi.string().optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const productSchema = Joi.object({
    name: Joi.string().min(3).required(),
    description: Joi.string().optional(),
    price: Joi.number().positive().required(),
    category: Joi.string().default('general'),
    stock_quantity: Joi.number().integer().min(0).default(0),
    is_digital: Joi.boolean().default(false)
});

class ApiRouter {
    constructor(db) {
        this.db = db;
        this.authController = new AuthController(db);
        this.productController = new ProductController(db);
        this.orderController = new OrderController(db);
        this.webhookController = new WebhookController(db);
    }

    /**
     * Main API router
     */
    async route(req, res) {
        try {
            // Set CORS headers
            this.setCorsHeaders(req, res);

            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.status(200).end();
                return;
            }

            // Get request path and method
            const path = req.path;
            const method = req.method;

            // Remove base path if exists
            const basePath = '/api';
            let processedPath = path;
            if (path.startsWith(basePath)) {
                processedPath = path.substring(basePath.length);
            }

            // Split path into segments
            const segments = processedPath.split('/').filter(segment => segment !== '');
            const resource = segments[0] || '';
            const id = segments[1] || null;
            const subresource = segments[2] || null;

            // Route the request
            const response = await this.routeRequest(method, resource, id, subresource, segments, req);
            
            // Send response
            this.sendJsonResponse(res, response);

        } catch (error) {
            console.error('Routing error:', error);
            this.sendErrorResponse(res, error.message, 500);
        }
    }

    /**
     * Route request to appropriate handler
     */
    async routeRequest(method, resource, id, subresource, segments, req) {
        switch (resource) {
            case 'auth':
                return await this.routeAuth(method, segments, req);
                
            case 'products':
                return await this.routeProducts(method, id, subresource, segments, req);
                
            case 'orders':
                return await this.routeOrders(method, id, subresource, segments, req);
                
            case 'webhooks':
                return await this.routeWebhooks(method, segments, req);
                
            case 'health':
                return this.healthCheck();
                
            default:
                return this.errorResponse('Endpoint not found', 404);
        }
    }

    /**
     * Auth routes
     */
    async routeAuth(method, segments, req) {
        const action = segments[1] || '';

        switch (`${method}:${action}`) {
            case 'POST:register':
                const registerData = this.getInputData(req);
                const { error: registerError } = userSchema.validate(registerData);
                if (registerError) {
                    return this.errorResponse(`Validation error: ${registerError.details[0].message}`, 400);
                }
                return await this.authController.register(registerData);
                
            case 'POST:login':
                const loginData = this.getInputData(req);
                const { error: loginError } = loginSchema.validate(loginData);
                if (loginError) {
                    return this.errorResponse(`Validation error: ${loginError.details[0].message}`, 400);
                }
                return await this.authController.login(loginData);
                
            case 'POST:refresh':
                const refreshUserData = await this.getAuthenticatedUser(req);
                return await this.authController.refreshToken(refreshUserData);
                
            case 'GET:profile':
                const profileUserData = await this.getAuthenticatedUser(req);
                return await this.authController.getProfile(profileUserData);
                
            case 'PUT:profile':
                const updateProfileUserData = await this.getAuthenticatedUser(req);
                const updateProfileData = this.getInputData(req);
                return await this.authController.updateProfile(updateProfileUserData, updateProfileData);
                
            case 'PUT:password':
                const passwordUserData = await this.getAuthenticatedUser(req);
                const passwordData = this.getInputData(req);
                return await this.authController.changePassword(passwordUserData, passwordData);
                
            case 'GET:commission':
                const commissionUserData = await this.getAuthenticatedUser(req);
                return await this.authController.getCommissionInfo(commissionUserData);
                
            case 'GET:rank-upgrade':
                const rankUserData = await this.getAuthenticatedUser(req);
                return await this.authController.checkRankUpgrade(rankUserData);
                
            case 'GET:users':
                const usersUserData = await this.getAuthenticatedUser(req);
                const filters = req.query;
                return await this.authController.getUsers(usersUserData, filters);
                
            case 'DELETE:users':
                const deleteUserData = await this.getAuthenticatedUser(req);
                const targetUserId = segments[2] || null;
                if (!targetUserId) {
                    return this.errorResponse('User ID required', 400);
                }
                return await this.authController.deactivateUser(deleteUserData, parseInt(targetUserId));
                
            default:
                return this.errorResponse('Auth endpoint not found', 404);
        }
    }

    /**
     * Product routes
     */
    async routeProducts(method, id, subresource, segments, req) {
        switch (method) {
            case 'GET':
                if (id === null) {
                    // GET /products - Search products
                    const filters = req.query;
                    const page = parseInt(req.query.page) || 1;
                    const perPage = parseInt(req.query.per_page) || 20;
                    return await this.productController.searchProducts(filters, page, perPage);
                } else if (subresource === 'vendor') {
                    // GET /products/{id}/vendor - Get vendor's products
                    const vendorUserData = await this.getAuthenticatedUser(req);
                    const vendorPage = parseInt(req.query.page) || 1;
                    const vendorPerPage = parseInt(req.query.per_page) || 20;
                    return await this.productController.getVendorProducts(vendorUserData, vendorPage, vendorPerPage);
                } else if (subresource === 'low-stock') {
                    // GET /products/{id}/low-stock - Get low stock products
                    const stockUserData = await this.getAuthenticatedUser(req);
                    const threshold = parseInt(req.query.threshold) || 5;
                    return await this.productController.getLowStockProducts(stockUserData, threshold);
                } else {
                    // GET /products/{id} - Get product by ID
                    return await this.productController.getProduct(parseInt(id));
                }
                
            case 'POST':
                if (subresource === 'images') {
                    // POST /products/{id}/images - Upload product image
                    const imageUserData = await this.getAuthenticatedUser(req);
                    const files = await this.productController.handleFileUploads(req);
                    const imageData = {
                        ...req.body,
                        product_id: id,
                        image: files.image || null
                    };
                    return await this.productController.uploadImage(imageUserData, imageData);
                } else {
                    // POST /products - Create product
                    const createUserData = await this.getAuthenticatedUser(req);
                    const createData = this.getInputData(req);
                    return await this.productController.create(createUserData, createData);
                }
                
            case 'PUT':
                if (id && subresource === 'stock') {
                    // PUT /products/{id}/stock - Update product stock
                    const stockUpdateUserData = await this.getAuthenticatedUser(req);
                    const stockUpdateData = this.getInputData(req);
                    return await this.productController.updateStock(stockUpdateUserData, parseInt(id), stockUpdateData);
                } else if (id) {
                    // PUT /products/{id} - Update product
                    const updateUserData = await this.getAuthenticatedUser(req);
                    const updateData = this.getInputData(req);
                    return await this.productController.updateProduct(updateUserData, parseInt(id), updateData);
                }
                break;
                
            case 'DELETE':
                if (id && subresource === 'images') {
                    // DELETE /products/{id}/images - Delete product image
                    const deleteImageUserData = await this.getAuthenticatedUser(req);
                    const imageUrl = req.query.url || '';
                    return await this.productController.deleteImage(deleteImageUserData, parseInt(id), imageUrl);
                } else if (id) {
                    // DELETE /products/{id} - Delete product
                    const deleteProductUserData = await this.getAuthenticatedUser(req);
                    return await this.productController.deleteProduct(deleteProductUserData, parseInt(id));
                }
                break;
        }

        // Additional product endpoints
        if (method === 'GET') {
            if (segments[1] === 'categories') {
                // GET /products/categories - Get product categories
                return await this.productController.getCategories();
            } else if (segments[1] === 'popular') {
                // GET /products/popular - Get popular products
                const limit = parseInt(req.query.limit) || 10;
                return await this.productController.getPopularProducts(limit);
            }
        }

        return this.errorResponse('Product endpoint not found', 404);
    }

    /**
     * Order routes
     */
    async routeOrders(method, id, subresource, segments, req) {
        const userData = await this.getAuthenticatedUser(req);

        switch (method) {
            case 'GET':
                if (id === null) {
                    if (segments[1] === 'vendor') {
                        // GET /orders/vendor - Get vendor's orders
                        const vendorPage = parseInt(req.query.page) || 1;
                        const vendorPerPage = parseInt(req.query.per_page) || 20;
                        return await this.orderController.getVendorOrders(userData, vendorPage, vendorPerPage);
                    } else if (segments[1] === 'recent' && userData.role === 'admin') {
                        // GET /orders/recent - Get recent orders (admin only)
                        const limit = parseInt(req.query.limit) || 50;
                        return await this.orderController.getRecentOrders(userData, limit);
                    } else {
                        // GET /orders - Get customer's orders
                        const customerPage = parseInt(req.query.page) || 1;
                        const customerPerPage = parseInt(req.query.per_page) || 20;
                        return await this.orderController.getCustomerOrders(userData, customerPage, customerPerPage);
                    }
                } else {
                    // GET /orders/{id} - Get order by ID
                    return await this.orderController.getOrder(userData, parseInt(id));
                }
                
            case 'POST':
                if (id === null) {
                    // POST /orders - Create order
                    const createData = this.getInputData(req);
                    return await this.orderController.create(userData, createData);
                } else if (id && subresource === 'review') {
                    // POST /orders/{id}/review - Add review to order
                    const reviewData = this.getInputData(req);
                    return await this.orderController.addReview(userData, parseInt(id), reviewData);
                }
                break;
                
            case 'PUT':
                if (id && subresource === 'status') {
                    // PUT /orders/{id}/status - Update order status
                    const statusData = this.getInputData(req);
                    return await this.orderController.updateStatus(userData, parseInt(id), statusData);
                }
                break;
                
            case 'POST':
                if (id && subresource === 'refund') {
                    // POST /orders/{id}/refund - Refund order
                    const refundData = this.getInputData(req);
                    return await this.orderController.refundOrder(userData, parseInt(id), refundData);
                }
                break;
        }

        // Additional order endpoints
        if (method === 'GET' && segments[1] === 'stats' && segments[2] === 'vendor') {
            // GET /orders/stats/vendor - Get vendor statistics
            return await this.orderController.getVendorStats(userData);
        }

        return this.errorResponse('Order endpoint not found', 404);
    }

    /**
     * Webhook routes
     */
    async routeWebhooks(method, segments, req) {
        const action = segments[1] || '';

        if (method !== 'POST') {
            return this.errorResponse('Method not allowed for webhooks', 405);
        }

        switch (action) {
            case 'moneroo':
                // POST /webhooks/moneroo - Moneroo payment webhook
                return await this.webhookController.processMonerooWebhook(req.body);
                
            case 'test':
                // POST /webhooks/test - Test webhook (development only)
                if (Settings.isProduction()) {
                    return this.errorResponse('Test webhook not available in production', 403);
                }
                const testData = this.getInputData(req);
                return await this.webhookController.testWebhook(testData);
                
            case 'health':
                // POST /webhooks/health - Webhook health check
                return await this.webhookController.healthCheck();
                
            case 'logs':
                // POST /webhooks/logs - Get webhook logs (admin only)
                const logsUserData = await this.getAuthenticatedUser(req);
                const logsFilters = this.getInputData(req);
                return await this.webhookController.getWebhookLogs(logsUserData, logsFilters);
                
            default:
                return this.errorResponse('Webhook endpoint not found', 404);
        }
    }

    /**
     * Health check endpoint
     */
    healthCheck() {
        return {
            success: true,
            status: 200,
            data: {
                message: 'Tradefy API is running',
                version: Settings.getAppVersion(),
                environment: Settings.getEnvironment(),
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    /**
     * Get authenticated user from JWT token
     */
    async getAuthenticatedUser(req) {
        const authHeader = req.headers.authorization || '';
        
        if (!authHeader) {
            throw new Error('Authorization header required');
        }

        // Extract token from "Bearer {token}" format
        const tokenMatch = authHeader.match(/Bearer\s+(.*)$/i);
        if (!tokenMatch) {
            throw new Error('Invalid authorization format');
        }

        const token = tokenMatch[1];

        try {
            const userData = await Security.validateToken(token);
            
            // Verify user is still active in database
            const userModel = new User(this.db);
            const user = await userModel.findById(userData.user_id);
            
            if (!user) {
                throw new Error('User not found or inactive');
            }

            return userData;

        } catch (error) {
            throw new Error('Invalid token: ' + error.message);
        }
    }

    /**
     * Set CORS headers
     */
    setCorsHeaders(req, res) {
        const origin = req.headers.origin || '';
        const allowedOrigins = Settings.getAllowedOrigins();

        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            res.setHeader('Access-Control-Allow-Origin', Settings.getAppUrl());
        }

        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Content-Type', 'application/json');
    }

    /**
     * Send JSON response
     */
    sendJsonResponse(res, response) {
        res.status(response.status || 200).json(response);
    }

    /**
     * Send error response
     */
    sendErrorResponse(res, message, statusCode) {
        const response = {
            success: false,
            status: statusCode,
            error: {
                message: message,
                code: statusCode
            },
            timestamp: Date.now()
        };

        res.status(statusCode).json(response);
    }

    /**
     * Error response helper
     */
    errorResponse(message, statusCode) {
        return {
            success: false,
            status: statusCode,
            error: {
                message: message,
                code: statusCode
            },
            timestamp: Date.now()
        };
    }

    /**
     * Get input data from request
     */
    getInputData(req) {
        return req.body || {};
    }

    /**
     * Get database connection for migrations
     */
    getDatabase() {
        return this.db;
    }
}

/**
 * Bootstrap the application
 */
async function bootstrapApplication() {
    // Load configuration
    Settings.initialize();
    
    // Apply environment settings
    Settings.applyEnvironmentSettings();

    // Initialize database connection
    const dbConfig = Settings.getDatabaseConfig();
    
    try {
        // Using pg (PostgreSQL) client for Node.js
        const { Client } = require('pg');
        const db = new Client({
            connectionString: Settings.getDatabaseDSN(),
            ssl: Settings.isProduction() ? { rejectUnauthorized: false } : false
        });
        
        await db.connect();
        
        // Set timezone for database connection
        await db.query("SET timezone = 'UTC'");
        
        return new ApiRouter(db);
        
    } catch (error) {
        console.error('Database connection failed:', error.message);
        throw new Error('Database connection failed');
    }
}

// Export for use with Express
module.exports = {
    ApiRouter,
    bootstrapApplication
};