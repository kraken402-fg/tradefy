const express = require('express');
const router = express.Router();
const { bootstrapApplication } = require('./ApiRouter');

// Middleware to attach router to request
async function apiRouterMiddleware(req, res, next) {
    try {
        if (!req.apiRouter) {
            req.apiRouter = await bootstrapApplication();
        }
        next();
    } catch (error) {
        console.error('API Router initialization failed:', error);
        res.status(500).json({
            success: false,
            error: 'Application bootstrap failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: Date.now()
        });
    }
}

// Apply middleware to all API routes
router.use('/api/*', apiRouterMiddleware);

// Main API route handler
router.use('/api', async (req, res) => {
    try {
        await req.apiRouter.route(req, res);
    } catch (error) {
        console.error('API routing error:', error);
        res.status(500).json({
            success: false,
            error: 'Application routing failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: Date.now()
        });
    }
});

// Health check endpoint (direct access)
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Tradefy API',
        version: '3.0.0',
        timestamp: Date.now()
    });
});

module.exports = router;