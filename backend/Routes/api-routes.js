const { config, validateConfig } = require('../config/platforms');
const AuthController = require('../controllers/AuthController');
const ProductController = require('../controllers/ProductController');
const OrderController = require('../controllers/OrderController');
const WebhookController = require('../controllers/WebhookController');
const GamificationService = require('../services/GamificationService');
const Security = require('../utils/Security');

// Créer les routes API complètes
function createApiRoutes(app, db) {
    // Initialiser les contrôleurs et services
    const authController = new AuthController(db);
    const productController = new ProductController(db);
    const orderController = new OrderController(db);
    const webhookController = new WebhookController(db);
    const gamificationService = new GamificationService(db);

    // ====================
    // 🔐 AUTHENTIFICATION
    // ====================
    
    app.post('/api/auth/register', async (req, res) => {
        try {
            const result = await authController.register(req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Register route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/auth/login', async (req, res) => {
        try {
            const result = await authController.login(req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Login route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/auth/refresh', async (req, res) => {
        try {
            const result = await authController.refreshToken(req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Refresh token route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/auth/profile', Security.authenticateToken, async (req, res) => {
        try {
            const result = await authController.getProfile(req.user);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get profile route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.put('/api/auth/profile', Security.authenticateToken, async (req, res) => {
        try {
            const result = await authController.updateProfile(req.user, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Update profile route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/auth/change-password', Security.authenticateToken, async (req, res) => {
        try {
            const result = await authController.changePassword(req.user, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Change password route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/auth/forgot-password', async (req, res) => {
        try {
            const result = await authController.forgotPassword(req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Forgot password route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/auth/reset-password', async (req, res) => {
        try {
            const result = await authController.resetPassword(req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Reset password route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/auth/logout', Security.authenticateToken, async (req, res) => {
        try {
            const result = await authController.logout(req.user);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Logout route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    // ====================
    // 🛍️ PRODUITS
    // ====================
    
    app.post('/api/products', Security.authenticateToken, async (req, res) => {
        try {
            const result = await productController.create(req.user, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Create product route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/products/:id', async (req, res) => {
        try {
            const result = await productController.getProduct(req.params.id);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get product route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.put('/api/products/:id', Security.authenticateToken, async (req, res) => {
        try {
            const result = await productController.updateProduct(req.user, req.params.id, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Update product route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.delete('/api/products/:id', Security.authenticateToken, async (req, res) => {
        try {
            const result = await productController.deleteProduct(req.user, req.params.id);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Delete product route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/products', async (req, res) => {
        try {
            const filters = {
                search: req.query.search,
                category_id: req.query.category_id,
                min_price: req.query.min_price,
                max_price: req.query.max_price,
                vendor_id: req.query.vendor_id,
                featured: req.query.featured,
                tags: req.query.tags ? req.query.tags.split(',') : null,
                sort_by: req.query.sort_by,
                sort_order: req.query.sort_order
            };
            
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;
            
            const result = await productController.searchProducts(filters, page, perPage);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Search products route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/vendor/products', Security.authenticateToken, async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;
            
            const result = await productController.getVendorProducts(req.user, page, perPage);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get vendor products route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/products/low-stock', Security.authenticateToken, async (req, res) => {
        try {
            const threshold = parseInt(req.query.threshold) || 5;
            const result = await productController.getLowStockProducts(req.user, threshold);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get low stock products route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.put('/api/products/:id/stock', Security.authenticateToken, async (req, res) => {
        try {
            const result = await productController.updateStock(req.user, req.params.id, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Update stock route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/products/:id/images', Security.authenticateToken, async (req, res) => {
        try {
            const result = await productController.uploadImage(req.user, {
                ...req.body,
                product_id: req.params.id
            });
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Upload image route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.delete('/api/products/:id/images/:image_url', Security.authenticateToken, async (req, res) => {
        try {
            const imageUrl = decodeURIComponent(req.params.image_url);
            const result = await productController.deleteImage(req.user, req.params.id, imageUrl);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Delete image route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/categories', async (req, res) => {
        try {
            const result = await productController.getCategories();
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get categories route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/products/popular', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const result = await productController.getPopularProducts(limit);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get popular products route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    // ====================
    // 📦 COMMANDES
    // ====================
    
    app.post('/api/orders', Security.authenticateToken, async (req, res) => {
        try {
            const result = await orderController.create(req.user, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Create order route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/orders/:id', Security.authenticateToken, async (req, res) => {
        try {
            const result = await orderController.getOrder(req.user, req.params.id);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get order route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/customer/orders', Security.authenticateToken, async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;
            
            const result = await orderController.getCustomerOrders(req.user, page, perPage);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get customer orders route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/vendor/orders', Security.authenticateToken, async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;
            
            const result = await orderController.getVendorOrders(req.user, page, perPage);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get vendor orders route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.put('/api/orders/:id/status', Security.authenticateToken, async (req, res) => {
        try {
            const result = await orderController.updateStatus(req.user, req.params.id, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Update order status route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/orders/:id/review', Security.authenticateToken, async (req, res) => {
        try {
            const result = await orderController.addReview(req.user, req.params.id, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Add review route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/orders/:id/refund', Security.authenticateToken, async (req, res) => {
        try {
            const result = await orderController.refundOrder(req.user, req.params.id, req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Refund order route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/admin/orders', Security.authenticateToken, Security.requireRole('admin'), async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const result = await orderController.getRecentOrders(req.user, limit);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get recent orders route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/vendor/stats', Security.authenticateToken, async (req, res) => {
        try {
            const result = await orderController.getVendorStats(req.user);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get vendor stats route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    // ====================
    // 🎮 GAMIFICATION
    // ====================
    
    app.get('/api/gamification/stats', Security.authenticateToken, async (req, res) => {
        try {
            const result = await gamificationService.getGamificationStats(req.user.user_id);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Get gamification stats route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/gamification/achievements', Security.authenticateToken, async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;
            
            const result = await gamificationService.getUserAchievements(req.user.user_id, page, perPage);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Get achievements route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/gamification/leaderboard', async (req, res) => {
        try {
            const type = req.query.type || 'points';
            const limit = parseInt(req.query.limit) || 50;
            
            const result = await gamificationService.getLeaderboard(type, limit);
            res.status(200).json({
                success: true,
                data: {
                    leaderboard: result,
                    type: type
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Get leaderboard route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/gamification/quests', Security.authenticateToken, async (req, res) => {
        try {
            const result = await gamificationService.getActiveQuests(req.user.user_id);
            res.status(200).json({
                success: true,
                data: {
                    quests: result
                },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Get quests route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/gamification/quests/:questId/complete', Security.authenticateToken, async (req, res) => {
        try {
            const result = await gamificationService.completeQuest(req.user.user_id, req.params.questId);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Complete quest route error:', error);
            res.status(500).json({
                success: false,
                error: { message: error.message },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/gamification/check-achievements', Security.authenticateToken, async (req, res) => {
        try {
            const result = await gamificationService.checkAndUnlockAchievements(req.user.user_id);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Check achievements route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur serveur' },
                timestamp: Date.now()
            });
        }
    });

    // ====================
    // 🪝 WEBHOOKS
    // ====================
    
    app.post('/api/webhooks/moneroo', async (req, res) => {
        try {
            const result = await webhookController.processMonerooWebhook(req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Moneroo webhook route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur webhook' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/webhooks/test', Security.authenticateToken, Security.requireRole('admin'), async (req, res) => {
        try {
            const result = await webhookController.testWebhook(req.body);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Test webhook route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur webhook test' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/webhooks/health', async (req, res) => {
        try {
            const result = await webhookController.healthCheck();
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Webhook health check route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur health check' },
                timestamp: Date.now()
            });
        }
    });

    app.get('/api/webhooks/logs', Security.authenticateToken, Security.requireRole('admin'), async (req, res) => {
        try {
            const filters = {
                type: req.query.type,
                status: req.query.status,
                event_type: req.query.event_type
            };
            
            const result = await webhookController.getWebhookLogs(req.user, filters);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Get webhook logs route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur logs' },
                timestamp: Date.now()
            });
        }
    });

    app.post('/api/webhooks/:webhookId/replay', Security.authenticateToken, Security.requireRole('admin'), async (req, res) => {
        try {
            const result = await webhookController.replayWebhook(req.user, req.params.webhookId);
            res.status(result.status).json(result);
        } catch (error) {
            console.error('Replay webhook route error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Erreur replay' },
                timestamp: Date.now()
            });
        }
    });

    // ====================
    // 🚀 UTILITAIRES
    // ====================
    
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            status: 200,
            data: {
                message: 'Tradefy API is running',
                version: config.app.version,
                environment: config.environment,
                timestamp: Date.now(),
                config_valid: validateConfig()
            }
        });
    });

    app.get('/api/config', (req, res) => {
        res.json({
            success: true,
            data: {
                app: {
                    name: config.app.name,
                    version: config.app.version,
                    environment: config.environment
                },
                frontend: {
                    url: config.frontend.url
                },
                features: {
                    gamification: config.gamification.enabled,
                    payments: true,
                    reviews: true
                }
            }
        });
    });
}

module.exports = createApiRoutes;
