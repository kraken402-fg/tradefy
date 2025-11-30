const { config, validateConfig, isProduction } = require('./config/platforms');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const Security = require('./utils/Security');

// Importer les routes
const createApiRoutes = require('./Routes/api-routes');

// Initialiser Sentry si en production
let Sentry;
if (isProduction()) {
    try {
        Sentry = require('@sentry/node');
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: config.environment,
            tracesSampleRate: 0.1,
        });
        console.log('🔍 Sentry monitoring initialized');
    } catch (error) {
        console.warn('⚠️ Sentry initialization failed:', error.message);
    }
}

// Créer l'application Express
const app = express();

// Compression des réponses
app.use(compression());

// ====================
// 🔧 MIDDLEWARES
// ====================

// Sécurité
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", config.frontend.url],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// CORS
app.use(cors({
    origin: function (origin, callback) {
        // Autoriser les origines configurées
        if (!origin || config.cors.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: config.cors.credentials,
    methods: config.cors.methods,
    allowedHeaders: config.cors.headers
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.app.rateLimit.period * 1000, // Convertir en millisecondes
    max: config.app.rateLimit.requests,
    message: {
        success: false,
        error: {
            message: 'Trop de requêtes, veuillez réessayer plus tard',
            code: 'RATE_LIMIT_EXCEEDED'
        },
        timestamp: Date.now()
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sécurité personnalisée
app.use(Security.securityMiddleware());

// Logging des requêtes
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = Security.getClientIP(req);
    console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip}`);
    next();
});

// ====================
// 🚀 VALIDATION DE CONFIGURATION
// ====================

if (!validateConfig()) {
    console.error('\n🚨 CONFIGURATION INVALIDE - ARRÊT DU SERVEUR');
    process.exit(1);
}

// ====================
// 📊 ROUTES
// ====================

// Route de santé
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 200,
        data: {
            message: 'Tradefy API is running',
            version: config.app.version,
            environment: config.environment,
            frontend: config.frontend.url,
            backend: config.backend.url,
            database: config.database.url ? '✅ Configured' : '❌ Not configured',
            payment: config.payment.apiKey ? '✅ Configured' : '❌ Not configured',
            timestamp: Date.now()
        }
    });
});

// Routes API
createApiRoutes(app, null); // db sera initialisé plus tard

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Endpoint not found',
            code: 'NOT_FOUND'
        },
        timestamp: Date.now()
    });
});

// ====================
// 🚨 GESTION DES ERREURS
// ====================

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
    // Logger avec Sentry si disponible
    if (Sentry) {
        Sentry.captureException(error);
    }
    
    console.error('Global error handler:', error);

    // Erreur CORS
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: {
                message: 'Origin not allowed',
                code: 'CORS_ERROR'
            },
            timestamp: Date.now()
        });
    }

    // Erreur de parsing JSON
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Invalid JSON format',
                code: 'INVALID_JSON'
            },
            timestamp: Date.now()
        });
    }

    // Erreur de payload trop grand
    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: {
                message: 'Request payload too large',
                code: 'PAYLOAD_TOO_LARGE'
            },
            timestamp: Date.now()
        });
    }

    // Erreur par défaut
    res.status(error.status || 500).json({
        success: false,
        error: {
            message: isProduction() ? 'Internal server error' : error.message,
            code: error.code || 'INTERNAL_ERROR'
        },
        timestamp: Date.now()
    });
});

// ====================
// 🚀 DÉMARRAGE DU SERVEUR
// ====================

const PORT = config.backend.port;

app.listen(PORT, () => {
    console.log('\n🚀 TRAdefY Backend Server Started Successfully!\n');
    console.log('📊 Configuration Summary:');
    console.log(`   • Environment: ${config.environment}`);
    console.log(`   • Version: ${config.app.version}`);
    console.log(`   • Port: ${PORT}`);
    console.log(`   • Frontend URL: ${config.frontend.url}`);
    console.log(`   • Backend URL: ${config.backend.url}`);
    console.log(`   • Database: ${config.database.url ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   • Payment: ${config.payment.apiKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   • Debug Mode: ${config.app.debug ? 'ON' : 'OFF'}`);
    console.log('\n📍 Available Endpoints:');
    console.log(`   • Health Check: http://localhost:${PORT}/health`);
    console.log(`   • API Base: http://localhost:${PORT}/api`);
    console.log('\n🔗 Platform URLs:');
    console.log(`   • Frontend (Vercel): ${config.frontend.url}`);
    console.log(`   • Backend (InfinityFree): ${config.backend.url}`);
    console.log(`   • Database (Supabase): ${config.database.url}`);
    console.log(`   • Payment (Moneroo): ${config.payment.baseUrl}`);
    console.log('\n✨ Server is ready to accept connections!\n');
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught Exception:', error);
    Security.logSecurityEvent('UNCAUGHT_EXCEPTION', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
    Security.logSecurityEvent('UNHANDLED_REJECTION', {
        reason: reason.toString(),
        promise: promise.toString()
    });
});

module.exports = app;
