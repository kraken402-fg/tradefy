class Settings {
    // Environment
    static environment;
    
    // Database
    static dbHost;
    static dbPort;
    static dbName;
    static dbUser;
    static dbPassword;
    
    // JWT
    static jwtSecret;
    static jwtAlgorithm = 'HS256';
    static jwtExpiration = 86400; // 24 hours
    
    // Moneroo Payment
    static monerooApiKey;
    static monerooSecretKey;
    static monerooWebhookSecret;
    static monerooBaseUrl;
    
    // Supabase
    static supabaseUrl;
    static supabaseKey;
    static supabaseBucket;
    
    // Application
    static appUrl;
    static appName = 'Tradefy';
    static appVersion = '3.0.0';
    static timezone = 'UTC';
    
    // Commission System
    static defaultCommission = 450; // bps
    static minProductPrice = 1.00;
    static maxProductPrice = 10000.00;
    
    // Rate Limiting
    static rateLimitRequests = 100;
    static rateLimitPeriod = 900; // 15 minutes
    
    // CORS
    static allowedOrigins = [];
    
    // File Upload
    static maxFileSize = 5242880; // 5MB
    static allowedMimeTypes = [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif'
    ];
    
    // Email (for future notifications)
    static smtpHost;
    static smtpPort;
    static smtpUsername;
    static smtpPassword;
    static smtpEncryption = 'tls';
    
    // Cache
    static cacheEnabled = true;
    static cacheLifetime = 3600; // 1 hour

    // 🎯 RANKS ET COMMISSIONS (selon ta spécification exacte)
    static RANKS = {
        'profane': { min_sales: 0, max_sales: 24, commission: 450 },
        'debutant': { min_sales: 25, max_sales: 74, commission: 425 },
        'marchand': { min_sales: 75, max_sales: 227, commission: 400 },
        'negociant': { min_sales: 228, max_sales: 554, commission: 375 },
        'courtier': { min_sales: 555, max_sales: 1004, commission: 350 },
        'magnat': { min_sales: 1005, max_sales: 2849, commission: 325 },
        'senior': { min_sales: 2850, max_sales: null, commission: 300 }
    };

    /**
     * Initialize settings from environment variables
     */
    static initialize() {
        // Environment
        this.environment = this.getEnv('APP_ENV', 'production');
        
        // Database
        this.dbHost = this.getEnv('DB_HOST', 'localhost');
        this.dbPort = this.getEnv('DB_PORT', '5432');
        this.dbName = this.getEnv('DB_NAME', 'tradefy');
        this.dbUser = this.getEnv('DB_USER', 'tradefy_user');
        this.dbPassword = this.getEnv('DB_PASSWORD', '');
        
        // JWT
        this.jwtSecret = this.getEnv('JWT_SECRET');
        if (!this.jwtSecret) {
            throw new Error('JWT_SECRET environment variable is required'); 
        }
        
        // Moneroo
        this.monerooApiKey = this.getEnv('MONEROO_API_KEY');
        this.monerooSecretKey = this.getEnv('MONEROO_SECRET_KEY');
        this.monerooWebhookSecret = this.getEnv('MONEROO_WEBHOOK_SECRET');
        this.monerooBaseUrl = this.getEnv('MONEROO_BASE_URL', 'https://api.moneroo.io/v1');
        
        // Supabase
        this.supabaseUrl = this.getEnv('SUPABASE_URL');
        this.supabaseKey = this.getEnv('SUPABASE_KEY');
        this.supabaseBucket = this.getEnv('SUPABASE_BUCKET', 'tradefy-products');
        
        // Application
        this.appUrl = this.getEnv('APP_URL', 'https://tradefy-height.vercel.app'); // 🔥 URL Vercel par défaut
        
        // CORS
        const origins = this.getEnv('ALLOWED_ORIGINS', 'https://tradefy-height.vercel.app,http://localhost:3000');
        this.allowedOrigins = origins.split(',').map(origin => origin.trim());
        
        // Email
        this.smtpHost = this.getEnv('SMTP_HOST');
        this.smtpPort = parseInt(this.getEnv('SMTP_PORT', '587'));
        this.smtpUsername = this.getEnv('SMTP_USERNAME');
        this.smtpPassword = this.getEnv('SMTP_PASSWORD');
        
        // Set timezone
        process.env.TZ = this.timezone;
        
        // Apply environment-specific settings
        this.applyEnvironmentSettings();
    }

    /**
     * Helper method to get environment variables
     */
    static getEnv(key, defaultValue = '') {
        // Priorité aux variables d'environnement
        return process.env[key] || defaultValue;
    }

    /**
     * Getters for all settings
     */
    
    // Environment
    static getEnvironment() {
        return this.environment;
    }
    
    static isDevelopment() {
        return this.environment === 'development';
    }
    
    static isProduction() {
        return this.environment === 'production';
    }
    
    static isStaging() {
        return this.environment === 'staging';
    }

    // Database
    static getDatabaseConfig() {
        return {
            host: this.dbHost,
            port: this.dbPort,
            database: this.dbName,
            user: this.dbUser,
            password: this.dbPassword,
            ssl: this.isProduction() ? { rejectUnauthorized: false } : false
        };
    }
    
    static getDatabaseDSN() {
        const config = this.getDatabaseConfig();
        return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
    }

    // JWT
    static getJwtSecret() {
        return this.jwtSecret;
    }
    
    static getJwtAlgorithm() {
        return this.jwtAlgorithm;
    }
    
    static getJwtExpiration() {
        return this.jwtExpiration;
    }

    // Moneroo
    static getMonerooConfig() {
        return {
            api_key: this.monerooApiKey,
            secret_key: this.monerooSecretKey,
            webhook_secret: this.monerooWebhookSecret,
            base_url: this.monerooBaseUrl
        };
    }
    
    static isMonerooEnabled() {
        return !!this.monerooApiKey && !!this.monerooSecretKey;
    }

    // Supabase
    static getSupabaseConfig() {
        return {
            url: this.supabaseUrl,
            key: this.supabaseKey,
            bucket: this.supabaseBucket
        };
    }
    
    static isSupabaseEnabled() {
        return !!this.supabaseUrl && !!this.supabaseKey;
    }

    // Application
    static getAppUrl() {
        return this.appUrl;
    }
    
    static getAppName() {
        return this.appName;
    }
    
    static getAppVersion() {
        return this.appVersion;
    }

    // Commission System
    static getDefaultCommission() {
        return this.defaultCommission;
    }
    
    static getMinProductPrice() {
        return this.minProductPrice;
    }
    
    static getMaxProductPrice() {
        return this.maxProductPrice;
    }

    /**
     * Calculate commission based on sales count and product price
     */
    static calculateCommission(salesCount, productPrice) {
        const rank = this.getRank(salesCount);
        const commissionRate = this.RANKS[rank]?.commission || this.defaultCommission;
        const commissionAmount = (productPrice * commissionRate) / 10000; // bps to percentage
        
        return {
            rank: rank,
            commission_rate: commissionRate,
            commission_amount: Math.round(commissionAmount * 100) / 100,
            vendor_amount: Math.round((productPrice - commissionAmount) * 100) / 100
        };
    }

    /**
     * Get rank based on sales count
     */
    static getRank(salesCount) {
        for (const [rankName, rankData] of Object.entries(this.RANKS)) {
            const min = rankData.min_sales;
            const max = rankData.max_sales;
            
            if (salesCount >= min && (max === null || salesCount <= max)) {
                return rankName;
            }
        }
        
        return 'profane'; // Default rank
    }

    /**
     * Get quest parameters for current rank
     */
    static getQuestParameters(currentRank, currentSales) {
        const rankData = this.RANKS[currentRank];
        
        if (!rankData || rankData.max_sales === null) {
            return null; // No quest for senior rank
        }
        
        const questStart = rankData.max_sales;
        const questLength = Math.floor(rankData.max_sales / 5);
        const questEnd = questStart + questLength;
        
        return {
            start: questStart,
            length: questLength,
            end: questEnd,
            progress: Math.max(0, Math.min(100, ((currentSales - questStart) / questLength) * 100)),
            completed: currentSales >= questEnd
        };
    }

    // Rate Limiting
    static getRateLimitConfig() {
        return {
            requests: this.rateLimitRequests,
            period: this.rateLimitPeriod
        };
    }

    // CORS
    static getAllowedOrigins() {
        return this.allowedOrigins;
    }
    
    static isOriginAllowed(origin) {
        return this.allowedOrigins.includes(origin);
    }

    // File Upload
    static getFileUploadConfig() {
        return {
            max_size: this.maxFileSize,
            allowed_types: this.allowedMimeTypes
        };
    }

    // Email
    static getEmailConfig() {
        return {
            host: this.smtpHost,
            port: this.smtpPort,
            username: this.smtpUsername,
            password: this.smtpPassword,
            encryption: this.smtpEncryption
        };
    }
    
    static isEmailEnabled() {
        return !!this.smtpHost && !!this.smtpUsername;
    }

    // Cache
    static isCacheEnabled() {
        return this.cacheEnabled;
    }
    
    static getCacheLifetime() {
        return this.cacheLifetime;
    }

    /**
     * Get all settings as array (for debugging, never expose in production)
     */
    static getAllSettings() {
        return {
            environment: this.environment,
            database: {
                host: this.dbHost,
                port: this.dbPort,
                name: this.dbName,
                user: this.dbUser,
                password: '***' // Masked for security
            },
            jwt: {
                algorithm: this.jwtAlgorithm,
                expiration: this.jwtExpiration,
                secret: '***'
            },
            moneroo: {
                enabled: this.isMonerooEnabled(),
                base_url: this.monerooBaseUrl,
                api_key: '***',
                secret_key: '***'
            },
            supabase: {
                enabled: this.isSupabaseEnabled(),
                url: this.supabaseUrl,
                bucket: this.supabaseBucket,
                key: '***'
            },
            application: {
                name: this.appName,
                version: this.appVersion,
                url: this.appUrl
            },
            commissions: {
                ranks: this.RANKS,
                default: this.defaultCommission,
                min_price: this.minProductPrice,
                max_price: this.maxProductPrice
            },
            rate_limiting: this.getRateLimitConfig(),
            cors: {
                allowed_origins: this.allowedOrigins
            },
            file_upload: this.getFileUploadConfig(),
            email: {
                enabled: this.isEmailEnabled(),
                host: this.smtpHost,
                port: this.smtpPort
            },
            cache: {
                enabled: this.cacheEnabled,
                lifetime: this.cacheLifetime
            }
        };
    }

    /**
     * Validate critical configuration
     */
    static validateConfig() {
        const errors = [];

        // Required settings
        if (!this.jwtSecret) {
            errors.push('JWT_SECRET is required');
        }
        
        if (!this.dbHost || !this.dbName || !this.dbUser) {
            errors.push('Database configuration is incomplete');
        }
        
        if (!this.monerooApiKey || !this.monerooSecretKey) {
            errors.push('Moneroo configuration is incomplete');
        }
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            errors.push('Supabase configuration is incomplete');
        }

        return errors;
    }

    /**
     * Get environment-specific configuration
     */
    static getEnvironmentConfig() {
        const config = {
            display_errors: this.isDevelopment(),
            log_errors: true,
            error_log: './logs/error.log'
        };

        if (this.isProduction()) {
            config.display_errors = false;
            config.log_errors = true;
        }

        return config;
    }

    /**
     * Apply environment settings
     */
    static applyEnvironmentSettings() {
        const envConfig = this.getEnvironmentConfig();
        
        // In Node.js, we handle errors differently
        if (this.isDevelopment()) {
            // Enable more verbose logging in development
            process.env.DEBUG = 'tradefy:*';
        } else {
            // In production, keep logs clean
            process.env.DEBUG = '';
        }
        
        // Configure logging
        if (envConfig.log_errors) {
            // You might want to set up a proper logger like winston or pino
            console.log(`📝 Error logging enabled: ${envConfig.error_log}`);
        }
    }

    /**
     * Get rank progression information
     */
    static getRankProgression(currentSales) {
        const currentRank = this.getRank(currentSales);
        const rankData = this.RANKS[currentRank];
        const nextRank = this.getNextRank(currentRank);
        
        if (!nextRank) {
            return {
                current_rank: currentRank,
                next_rank: null,
                progress: 100,
                sales_to_next: 0,
                is_max_rank: true
            };
        }

        const nextRankData = this.RANKS[nextRank];
        const progress = ((currentSales - rankData.min_sales) / (rankData.max_sales - rankData.min_sales)) * 100;
        const salesToNext = nextRankData.min_sales - currentSales;

        return {
            current_rank: currentRank,
            next_rank: nextRank,
            progress: Math.min(100, Math.max(0, progress)),
            sales_to_next: Math.max(0, salesToNext),
            is_max_rank: false
        };
    }

    /**
     * Get next rank
     */
    static getNextRank(currentRank) {
        const ranks = Object.keys(this.RANKS);
        const currentIndex = ranks.indexOf(currentRank);
        
        if (currentIndex === -1 || currentIndex === ranks.length - 1) {
            return null;
        }
        
        return ranks[currentIndex + 1];
    }

    /**
     * Get commission breakdown for display
     */
    static getCommissionBreakdown(salesCount) {
        const ranks = Object.entries(this.RANKS);
        const breakdown = [];

        for (const [rankName, rankData] of ranks) {
            breakdown.push({
                rank: rankName,
                min_sales: rankData.min_sales,
                max_sales: rankData.max_sales,
                commission_rate: rankData.commission,
                commission_percentage: (rankData.commission / 100).toFixed(2) + '%',
                is_current: salesCount >= rankData.min_sales && 
                           (rankData.max_sales === null || salesCount <= rankData.max_sales)
            });
        }

        return breakdown;
    }
}

module.exports = Settings;