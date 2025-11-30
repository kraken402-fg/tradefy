/**
 * Middleware de gestion d'erreurs global
 */

function errorHandler(error, req, res, next) {
    // Logger l'erreur
    console.error('Error Handler:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    
    const response = {
        success: false,
        error: 'Internal server error',
        timestamp: Date.now()
    };
    
    // En développement, inclure plus de détails
    if (process.env.APP_ENV !== 'production') {
        response.debug = {
            message: error.message,
            stack: error.stack
        };
    }
    
    // Gérer différents types d'erreurs
    if (error.name === 'ValidationError') {
        res.status(400);
        response.error = 'Validation failed';
        response.details = error.details;
    } else if (error.name === 'UnauthorizedError') {
        res.status(401);
        response.error = 'Unauthorized';
    } else if (error.name === 'ForbiddenError') {
        res.status(403);
        response.error = 'Forbidden';
    } else if (error.name === 'NotFoundError') {
        res.status(404);
        response.error = 'Resource not found';
    } else {
        res.status(500);
    }
    
    res.json(response);
}

module.exports = errorHandler;