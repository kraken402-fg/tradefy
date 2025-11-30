/**
 * Tradefy API - Point d'entrée principal (Node.js)
 * 
 * @package Tradefy
 * @version 3.0.0
 */

// Import des dépendances
const express = require('express');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const dependencyChecker = require('./utils/dependencyChecker');

// Configuration de l'application
const app = express();

// Debug settings (à désactiver en production)
const APP_DEBUG = process.env.APP_DEBUG === 'true';
const APP_ENV = process.env.APP_ENV || 'development';

if (APP_DEBUG) {
    console.log('Debug mode enabled');
} else {
    console.log = () => {}; // Désactiver les logs en production
}

// Middleware de sécurité de base
app.use(helmet({
    contentSecurityPolicy: false, // À configurer selon les besoins
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Headers de sécurité supplémentaires
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Définir le fuseau horaire
process.env.TZ = 'UTC';

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    const response = {
        success: false,
        error: 'Internal server error',
        timestamp: Date.now()
    };
    
    // En développement, inclure plus de détails
    if (APP_ENV !== 'production') {
        response.debug = {
            message: error.message,
            stack: error.stack
        };
    }
    
    // En production, ne pas afficher les détails des erreurs
    if (APP_ENV === 'production') {
        // Logger l'erreur pour surveillance
        console.error('Production Error:', {
            message: error.message,
            stack: error.stack
        });
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Logger pour surveillance
    console.error('Unhandled Rejection:', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
    });
});

// Vérifier les dépendances critiques
async function checkDependencies() {
    const requiredModules = [
        'express', 
        'helmet', 
        'pg', // PostgreSQL
        'jsonwebtoken', // JWT
        'crypto', // OpenSSL
        'axios' // équivalent curl
    ];
    
    const missingModules = [];
    
    for (const module of requiredModules) {
        try {
            if (module === 'crypto') {
                // crypto est intégré à Node.js
                require(module);
            } else {
                require.resolve(module);
            }
        } catch (error) {
            missingModules.push(module);
        }
    }
    
    if (missingModules.length > 0) {
        throw new Error(`Missing required Node.js modules: ${missingModules.join(', ')}`);
    }
    
    // Vérifier la version de Node.js
    const nodeVersion = process.version;
    const requiredVersion = '16.0.0';
    
    function compareVersions(v1, v2) {
        const v1Parts = v1.replace('v', '').split('.').map(Number);
        const v2Parts = v2.replace('v', '').split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const part1 = v1Parts[i] || 0;
            const part2 = v2Parts[i] || 0;
            if (part1 > part2) return 1;
            if (part1 < part2) return -1;
        }
        return 0;
    }
    
    if (compareVersions(nodeVersion, requiredVersion) < 0) {
        throw new Error(`Node.js ${requiredVersion} or higher is required. Current version: ${nodeVersion}`);
    }
    
    return true;
}

// Endpoint de santé simple
app.get(['/health', '/api/health'], (req, res) => {
    res.json({
        status: 'ok',
        service: 'Tradefy API',
        version: '3.0.0',
        timestamp: Date.now(),
        node_version: process.version,
        environment: APP_ENV
    });
});

// Servir les fichiers statiques en développement
if (APP_ENV === 'development') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../public')));
}

// Point d'entrée principal de l'API
async function bootstrapApplication() {
    try {
        // Vérifier les dépendances
        await checkDependencies();
        
        // Initialiser les routes
        const router = require('./routes/bootstrap');
        app.use('/api', router);
        
        // Middleware de gestion d'erreurs (doit être le dernier)
        app.use(errorHandler);
        
        // Route 404
        app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                timestamp: Date.now()
            });
        });
        
        console.log('✅ Tradefy API dependencies checked successfully');
        console.log(`🚀 Environment: ${APP_ENV}`);
        console.log(`🔧 Debug mode: ${APP_DEBUG}`);
        
        return app;
        
    } catch (error) {
        // Logger l'erreur critique
        console.error('Critical Application Error:', error.message);
        
        const response = {
            success: false,
            error: 'Application startup failed',
            timestamp: Date.now()
        };
        
        // En développement, afficher plus de détails
        if (APP_ENV !== 'production') {
            response.debug = {
                message: error.message,
                stack: error.stack
            };
        }
        
        // Middleware d'erreur pour le démarrage
        app.use('*', (req, res) => {
            res.status(500).json(response);
        });
        
        return app;
    }
}

// Export pour les tests et le démarrage
module.exports = {
    bootstrapApplication,
    app
};

// Démarrage automatique si exécuté directement
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    
    bootstrapApplication().then(app => {
        app.listen(PORT, () => {
            console.log(`✅ Tradefy API server running on port ${PORT}`);
            console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
        });
    }).catch(error => {
        console.error('❌ Failed to start Tradefy API:', error);
        process.exit(1);
    });
}