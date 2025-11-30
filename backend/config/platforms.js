/**
 * =============================================
 * 🚀 TRAdefY v3 - CONFIGURATION CENTRALISÉE
 * =============================================
 * 
 * Fichier de configuration unique pour toutes les plateformes
 * Copiez ce fichier en .env.js et ajoutez vos URLs et clés
 */

const config = {
    // ====================
    // 🌍 ENVIRONNEMENT
    // ====================
    environment: process.env.NODE_ENV || 'development',
    
    // ====================
    // 🔗 URLs DES PLATEFORMES
    // ====================
    
    // Vercel (Frontend) - Remplacez par votre URL Vercel
    frontend: {
        url: process.env.FRONTEND_URL || 'https://tradefy-eight.vercel.app',
        name: 'Tradefy Frontend'
    },
    
    // InfinityFree (Backend) - Remplacez par votre URL InfinityFree  
    backend: {
        url: process.env.BACKEND_URL || 'https://tradefy-backend.infinityfreeapp.com',
        port: process.env.PORT || 3000,
        name: 'Tradefy Backend API'
    },
    
    // Supabase (Base de données) - Remplacez par vos URLs Supabase
    database: {
        url: process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co',
        key: process.env.SUPABASE_KEY || 'your-supabase-anon-key-here',
        secret: process.env.SUPABASE_SECRET || 'your-supabase-service-role-key-here',
        bucket: process.env.SUPABASE_BUCKET || 'tradefy-products',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        name: process.env.DB_NAME || 'tradefy',
        user: process.env.DB_USER || 'tradefy_user',
        password: process.env.DB_PASSWORD || 'your-secure-database-password',
        sslmode: process.env.DB_SSLMODE || 'prefer'
    },
    
    // Moneroo (Paiement) - Remplacez par vos clés Moneroo
    payment: {
        apiKey: process.env.MONEROO_API_KEY || 'your-moneroo-api-key-here',
        secretKey: process.env.MONEROO_SECRET_KEY || 'your-moneroo-secret-key-here',
        baseUrl: process.env.MONEROO_BASE_URL || 'https://api.moneroo.io/v1',
        webhookSecret: process.env.MONEROO_WEBHOOK_SECRET || 'your-moneroo-webhook-secret-here'
    },
    
    // ====================
    // 🔐 SÉCURITÉ
    // ====================
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here-change-in-production',
        jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
        jwtExpiration: parseInt(process.env.JWT_EXPIRATION) || 86400,
        encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here'
    },
    
    // ====================
    // 🌐 CORS & ORIGINES AUTORISÉES
    // ====================
    cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',') 
            : [
                'https://tradefy-eight.vercel.app',
                'https://tradefy-app.vercel.app', 
                'https://tradefy-frontend.vercel.app',
                'http://localhost:3000',
                'http://localhost:8000'
            ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    
    // ====================
    // ⚙️ PARAMÈTRES APPLICATION
    // ====================
    app: {
        name: process.env.APP_NAME || 'Tradefy',
        version: process.env.APP_VERSION || '3.0.0',
        timezone: process.env.APP_TIMEZONE || 'UTC',
        debug: process.env.APP_DEBUG === 'true',
        
        // Limitation de débit
        rateLimit: {
            requests: parseInt(process.env.RATE_LIMIT_REQUESTS) || 100,
            period: parseInt(process.env.RATE_LIMIT_PERIOD) || 900
        },
        
        // Upload de fichiers
        upload: {
            maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880, // 5MB
            allowedTypes: process.env.UPLOAD_ALLOWED_TYPES 
                ? process.env.UPLOAD_ALLOWED_TYPES.split(',')
                : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
        },
        
        // Produits
        products: {
            minPrice: parseFloat(process.env.PRODUCT_MIN_PRICE) || 1.00,
            maxPrice: parseFloat(process.env.PRODUCT_MAX_PRICE) || 10000.00,
            defaultCommission: parseInt(process.env.DEFAULT_COMMISSION) || 450 // 4.5%
        }
    },
    
    // ====================
    // 🎯 GAMIFICATION
    // ====================
    gamification: {
        enabled: process.env.GAMIFICATION_ENABLED === 'true',
        points: {
            firstSale: parseInt(process.env.ACHIEVEMENT_POINTS_FIRST_SALE) || 100,
            tenSales: parseInt(process.env.ACHIEVEMENT_POINTS_10_SALES) || 250,
            rankUp: parseInt(process.env.ACHIEVEMENT_POINTS_RANK_UP) || 300
        }
    },
    
    // ====================
    // 📧 EMAIL (Optionnel)
    // ====================
    email: {
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            username: process.env.SMTP_USERNAME || 'your-email@gmail.com',
            password: process.env.SMTP_PASSWORD || 'your-app-password',
            encryption: process.env.SMTP_ENCRYPTION || 'tls'
        },
        from: {
            address: process.env.MAIL_FROM_ADDRESS || 'noreply@tradefy.com',
            name: process.env.MAIL_FROM_NAME || 'Tradefy'
        }
    },
    
    // ====================
    // 📊 LOGGING
    // ====================
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        channel: process.env.LOG_CHANNEL || 'daily',
        file: process.env.LOG_FILE || 'logs/tradefy.log'
    },
    
    // ====================
    // 🔍 ANALYTICS (Optionnel)
    // ====================
    analytics: {
        googleTrackingId: process.env.GA_TRACKING_ID,
        sentryDsn: process.env.SENTRY_DSN
    },
    
    // ====================
    // 🧪 TESTING
    // ====================
    testing: {
        database: {
            host: process.env.TEST_DB_HOST || 'localhost',
            port: parseInt(process.env.TEST_DB_PORT) || 5432,
            name: process.env.TEST_DB_NAME || 'tradefy_test',
            user: process.env.TEST_DB_USER || 'tradefy_test_user',
            password: process.env.TEST_DB_PASSWORD || 'test_password'
        }
    },
    
    // ====================
    // 🔧 DÉVELOPPEMENT
    // ====================
    development: {
        debugBar: process.env.DEBUG_BAR_ENABLED === 'true',
        seedFakeData: process.env.SEED_FAKE_DATA === 'true',
        fakeUsersCount: parseInt(process.env.FAKE_USERS_COUNT) || 10,
        fakeProductsCount: parseInt(process.env.FAKE_PRODUCTS_COUNT) || 50,
        fakeOrdersCount: parseInt(process.env.FAKE_ORDERS_COUNT) || 100
    },
    
    // ====================
    // 📱 INTÉGRATIONS (Optionnel)
    // ====================
    integrations: {
        webhook: {
            url: process.env.WEBHOOK_URL,
            secret: process.env.WEBHOOK_SECRET
        },
        stripe: {
            apiKey: process.env.STRIPE_API_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        },
        paypal: {
            clientId: process.env.PAYPAL_CLIENT_ID,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET
        }
    }
};

// ====================
// 🚨 VALIDATIONS
// ====================

function validateConfig() {
    const errors = [];
    
    // Vérifications des URLs requises
    if (!config.frontend.url || config.frontend.url.includes('your-')) {
        errors.push('❌ Frontend URL requis (Vercel)');
    }
    
    if (!config.backend.url || config.backend.url.includes('your-')) {
        errors.push('❌ Backend URL requis (InfinityFree)');
    }
    
    if (!config.database.url || config.database.url.includes('your-')) {
        errors.push('❌ Supabase URL requis');
    }
    
    if (!config.payment.apiKey || config.payment.apiKey.includes('your-')) {
        errors.push('❌ Moneroo API Key requis');
    }
    
    if (!config.security.jwtSecret || config.security.jwtSecret.includes('your-')) {
        errors.push('❌ JWT Secret requis');
    }
    
    if (errors.length > 0) {
        console.error('\n🚨 ERREURS DE CONFIGURATION:');
        errors.forEach(error => console.error(error));
        console.error('\n📝 ÉDITEZ .env.js avec vos vraies clés et URLs\n');
        return false;
    }
    
    return true;
}

// ====================
// 🌍 ENVIRONNEMENT
// ====================

function isProduction() {
    return config.environment === 'production';
}

function isDevelopment() {
    return config.environment === 'development';
}

function isStaging() {
    return config.environment === 'staging';
}

// ====================
// 🔗 CONNEXIONS
// ====================

function getDatabaseDSN() {
    const { database } = config;
    return `postgresql://${database.user}:${database.password}@${database.host}:${database.port}/${database.name}`;
}

function getDatabaseConfig() {
    const { database } = config;
    return {
        host: database.host,
        port: database.port,
        database: database.name,
        user: database.user,
        password: database.password,
        ssl: isProduction() ? { rejectUnauthorized: false } : false,
        timezone: 'UTC'
    };
}

function getSupabaseConfig() {
    const { database } = config;
    return {
        url: database.url,
        key: database.key,
        secret: database.secret,
        bucket: database.bucket
    };
}

function getMonerooConfig() {
    return config.payment;
}

// ====================
// 📊 INFOS
// ====================

function getConfigSummary() {
    return {
        app: `${config.app.name} v${config.app.version}`,
        environment: config.environment,
        frontend: config.frontend.url,
        backend: config.backend.url,
        database: database.url ? '✅ Configuré' : '❌ Non configuré',
        payment: config.payment.apiKey ? '✅ Configuré' : '❌ Non configuré',
        debug: config.app.debug,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    config,
    validateConfig,
    isProduction,
    isDevelopment,
    isStaging,
    getDatabaseDSN,
    getDatabaseConfig,
    getSupabaseConfig,
    getMonerooConfig,
    getConfigSummary
};
