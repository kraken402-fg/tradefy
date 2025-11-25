<?php

namespace Tradefy\Config;

class Settings
{
    // Environment
    private static $environment;
    
    // Database
    private static $dbHost;
    private static $dbPort;
    private static $dbName;
    private static $dbUser;
    private static $dbPassword;
    
    // JWT
    private static $jwtSecret;
    private static $jwtAlgorithm = 'HS256';
    private static $jwtExpiration = 86400; // 24 hours
    
    // Moneroo Payment
    private static $monerooApiKey;
    private static $monerooSecretKey;
    private static $monerooWebhookSecret;
    private static $monerooBaseUrl;
    
    // Supabase
    private static $supabaseUrl;
    private static $supabaseKey;
    private static $supabaseBucket;
    
    // Application
    private static $appUrl;
    private static $appName = 'Tradefy';
    private static $appVersion = '3.0.0';
    private static $timezone = 'UTC';
    
    // Commission System
    private static $defaultCommission = 450; // bps
    private static $minProductPrice = 1.00;
    private static $maxProductPrice = 10000.00;
    
    // Rate Limiting
    private static $rateLimitRequests = 100;
    private static $rateLimitPeriod = 900; // 15 minutes
    
    // CORS
    private static $allowedOrigins = [];
    
    // File Upload
    private static $maxFileSize = 5242880; // 5MB
    private static $allowedMimeTypes = [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif'
    ];
    
    // Email (for future notifications)
    private static $smtpHost;
    private static $smtpPort;
    private static $smtpUsername;
    private static $smtpPassword;
    private static $smtpEncryption = 'tls';
    
    // Cache
    private static $cacheEnabled = true;
    private static $cacheLifetime = 3600; // 1 hour

    // 🎯 RANKS ET COMMISSIONS (selon ta spécification exacte)
    private const RANKS = [
        'profane' => ['min_sales' => 0, 'max_sales' => 24, 'commission' => 450],
        'debutant' => ['min_sales' => 25, 'max_sales' => 74, 'commission' => 425],
        'marchand' => ['min_sales' => 75, 'max_sales' => 227, 'commission' => 400],
        'negociant' => ['min_sales' => 228, 'max_sales' => 554, 'commission' => 375],
        'courtier' => ['min_sales' => 555, 'max_sales' => 1004, 'commission' => 350],
        'magnat' => ['min_sales' => 1005, 'max_sales' => 2849, 'commission' => 325],
        'senior' => ['min_sales' => 2850, 'max_sales' => null, 'commission' => 300]
    ];

    /**
     * Initialize settings from environment variables
     */
    public static function initialize(): void
    {
        // Environment
        self::$environment = self::getEnv('APP_ENV', 'production');
        
        // Database
        self::$dbHost = self::getEnv('DB_HOST', 'localhost');
        self::$dbPort = self::getEnv('DB_PORT', '5432');
        self::$dbName = self::getEnv('DB_NAME', 'tradefy');
        self::$dbUser = self::getEnv('DB_USER', 'tradefy_user');
        self::$dbPassword = self::getEnv('DB_PASSWORD', '');
        
        // JWT
        self::$jwtSecret = self::getEnv('JWT_SECRET');
        if (empty(self::$jwtSecret)) {
            throw new \Exception('JWT_SECRET environment variable is required'); 
        }
        
        // Moneroo
        self::$monerooApiKey = self::getEnv('MONEROO_API_KEY');
        self::$monerooSecretKey = self::getEnv('MONEROO_SECRET_KEY');
        self::$monerooWebhookSecret = self::getEnv('MONEROO_WEBHOOK_SECRET');
        self::$monerooBaseUrl = self::getEnv('MONEROO_BASE_URL', 'https://api.moneroo.io/v1');
        
        // Supabase
        self::$supabaseUrl = self::getEnv('SUPABASE_URL');
        self::$supabaseKey = self::getEnv('SUPABASE_KEY');
        self::$supabaseBucket = self::getEnv('SUPABASE_BUCKET', 'tradefy-products');
        
        // Application
        self::$appUrl = self::getEnv('APP_URL', 'https://tradefy-height.vercel.app'); // 🔥 URL Vercel par défaut
        
        // CORS
        $origins = self::getEnv('ALLOWED_ORIGINS', 'https://tradefy-height.vercel.app,http://localhost:3000');
        self::$allowedOrigins = array_map('trim', explode(',', $origins));
        
        // Email
        self::$smtpHost = self::getEnv('SMTP_HOST');
        self::$smtpPort = (int) self::getEnv('SMTP_PORT', '587');
        self::$smtpUsername = self::getEnv('SMTP_USERNAME');
        self::$smtpPassword = self::getEnv('SMTP_PASSWORD');
        
        // Set timezone
        date_default_timezone_set(self::$timezone);
        
        // Apply environment-specific settings
        self::applyEnvironmentSettings();
    }

    /**
     * Helper method to get environment variables
     */
    private static function getEnv(string $key, string $default = ''): string
    {
        // Priorité aux variables d'environnement Vercel
        return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?? $default;
    }

    /**
     * Getters for all settings
     */
    
    // Environment
    public static function getEnvironment(): string
    {
        return self::$environment;
    }
    
    public static function isDevelopment(): bool
    {
        return self::$environment === 'development';
    }
    
    public static function isProduction(): bool
    {
        return self::$environment === 'production';
    }
    
    public static function isStaging(): bool
    {
        return self::$environment === 'staging';
    }

    // Database
    public static function getDatabaseConfig(): array
    {
        return [
            'host' => self::$dbHost,
            'port' => self::$dbPort,
            'dbname' => self::$dbName,
            'user' => self::$dbUser,
            'password' => self::$dbPassword,
            'sslmode' => self::isProduction() ? 'require' : 'prefer'
        ];
    }
    
    public static function getDatabaseDSN(): string
    {
        $config = self::getDatabaseConfig();
        return "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
    }

    // JWT
    public static function getJwtSecret(): string
    {
        return self::$jwtSecret;
    }
    
    public static function getJwtAlgorithm(): string
    {
        return self::$jwtAlgorithm;
    }
    
    public static function getJwtExpiration(): int
    {
        return self::$jwtExpiration;
    }

    // Moneroo
    public static function getMonerooConfig(): array
    {
        return [
            'api_key' => self::$monerooApiKey,
            'secret_key' => self::$monerooSecretKey,
            'webhook_secret' => self::$monerooWebhookSecret,
            'base_url' => self::$monerooBaseUrl
        ];
    }
    
    public static function isMonerooEnabled(): bool
    {
        return !empty(self::$monerooApiKey) && !empty(self::$monerooSecretKey);
    }

    // Supabase
    public static function getSupabaseConfig(): array
    {
        return [
            'url' => self::$supabaseUrl,
            'key' => self::$supabaseKey,
            'bucket' => self::$supabaseBucket
        ];
    }
    
    public static function isSupabaseEnabled(): bool
    {
        return !empty(self::$supabaseUrl) && !empty(self::$supabaseKey);
    }

    // Application
    public static function getAppUrl(): string
    {
        return self::$appUrl;
    }
    
    public static function getAppName(): string
    {
        return self::$appName;
    }
    
    public static function getAppVersion(): string
    {
        return self::$appVersion;
    }

    // Commission System
    public static function getDefaultCommission(): int
    {
        return self::$defaultCommission;
    }
    
    public static function getMinProductPrice(): float
    {
        return self::$minProductPrice;
    }
    
    public static function getMaxProductPrice(): float
    {
        return self::$maxProductPrice;
    }

    /**
     * Calculate commission based on sales count and product price
     */
    public static function calculateCommission(int $salesCount, float $productPrice): array
    {
        $rank = self::getRank($salesCount);
        $commissionRate = self::RANKS[$rank]['commission'] ?? self::$defaultCommission;
        $commissionAmount = ($productPrice * $commissionRate) / 10000; // bps to percentage
        
        return [
            'rank' => $rank,
            'commission_rate' => $commissionRate,
            'commission_amount' => round($commissionAmount, 2),
            'vendor_amount' => round($productPrice - $commissionAmount, 2)
        ];
    }

    /**
     * Get rank based on sales count
     */
    public static function getRank(int $salesCount): string
    {
        foreach (self::RANKS as $rankName => $rankData) {
            $min = $rankData['min_sales'];
            $max = $rankData['max_sales'];
            
            if ($salesCount >= $min && ($max === null || $salesCount <= $max)) {
                return $rankName;
            }
        }
        
        return 'profane'; // Default rank
    }

    /**
     * Get quest parameters for current rank
     */
    public static function getQuestParameters(string $currentRank, int $currentSales): ?array
    {
        $rankData = self::RANKS[$currentRank] ?? null;
        
        if (!$rankData || $rankData['max_sales'] === null) {
            return null; // No quest for senior rank
        }
        
        $questStart = $rankData['max_sales'];
        $questLength = floor($rankData['max_sales'] / 5);
        $questEnd = $questStart + $questLength;
        
        return [
            'start' => $questStart,
            'length' => $questLength,
            'end' => $questEnd,
            'progress' => max(0, min(100, (($currentSales - $questStart) / $questLength) * 100)),
            'completed' => $currentSales >= $questEnd
        ];
    }

    // Rate Limiting
    public static function getRateLimitConfig(): array
    {
        return [
            'requests' => self::$rateLimitRequests,
            'period' => self::$rateLimitPeriod
        ];
    }

    // CORS
    public static function getAllowedOrigins(): array
    {
        return self::$allowedOrigins;
    }
    
    public static function isOriginAllowed(string $origin): bool
    {
        return in_array($origin, self::$allowedOrigins);
    }

    // File Upload
    public static function getFileUploadConfig(): array
    {
        return [
            'max_size' => self::$maxFileSize,
            'allowed_types' => self::$allowedMimeTypes
        ];
    }

    // Email
    public static function getEmailConfig(): array
    {
        return [
            'host' => self::$smtpHost,
            'port' => self::$smtpPort,
            'username' => self::$smtpUsername,
            'password' => self::$smtpPassword,
            'encryption' => self::$smtpEncryption
        ];
    }
    
    public static function isEmailEnabled(): bool
    {
        return !empty(self::$smtpHost) && !empty(self::$smtpUsername);
    }

    // Cache
    public static function isCacheEnabled(): bool
    {
        return self::$cacheEnabled;
    }
    
    public static function getCacheLifetime(): int
    {
        return self::$cacheLifetime;
    }

    /**
     * Get all settings as array (for debugging, never expose in production)
     */
    public static function getAllSettings(): array
    {
        return [
            'environment' => self::$environment,
            'database' => [
                'host' => self::$dbHost,
                'port' => self::$dbPort,
                'name' => self::$dbName,
                'user' => self::$dbUser,
                'password' => '***' // Masked for security
            ],
            'jwt' => [
                'algorithm' => self::$jwtAlgorithm,
                'expiration' => self::$jwtExpiration,
                'secret' => '***'
            ],
            'moneroo' => [
                'enabled' => self::isMonerooEnabled(),
                'base_url' => self::$monerooBaseUrl,
                'api_key' => '***',
                'secret_key' => '***'
            ],
            'supabase' => [
                'enabled' => self::isSupabaseEnabled(),
                'url' => self::$supabaseUrl,
                'bucket' => self::$supabaseBucket,
                'key' => '***'
            ],
            'application' => [
                'name' => self::$appName,
                'version' => self::$appVersion,
                'url' => self::$appUrl
            ],
            'commissions' => [
                'ranks' => self::RANKS,
                'default' => self::$defaultCommission,
                'min_price' => self::$minProductPrice,
                'max_price' => self::$maxProductPrice
            ],
            'rate_limiting' => self::getRateLimitConfig(),
            'cors' => [
                'allowed_origins' => self::$allowedOrigins
            ],
            'file_upload' => self::getFileUploadConfig(),
            'email' => [
                'enabled' => self::isEmailEnabled(),
                'host' => self::$smtpHost,
                'port' => self::$smtpPort
            ],
            'cache' => [
                'enabled' => self::$cacheEnabled,
                'lifetime' => self::$cacheLifetime
            ]
        ];
    }

    /**
     * Validate critical configuration
     */
    public static function validateConfig(): array
    {
        $errors = [];

        // Required settings
        if (empty(self::$jwtSecret)) {
            $errors[] = 'JWT_SECRET is required';
        }
        
        if (empty(self::$dbHost) || empty(self::$dbName) || empty(self::$dbUser)) {
            $errors[] = 'Database configuration is incomplete';
        }
        
        if (empty(self::$monerooApiKey) || empty(self::$monerooSecretKey)) {
            $errors[] = 'Moneroo configuration is incomplete';
        }
        
        if (empty(self::$supabaseUrl) || empty(self::$supabaseKey)) {
            $errors[] = 'Supabase configuration is incomplete';
        }

        return $errors;
    }

    /**
     * Get environment-specific configuration
     */
    public static function getEnvironmentConfig(): array
    {
        $config = [
            'display_errors' => self::isDevelopment(),
            'error_reporting' => self::isDevelopment() ? E_ALL : E_ALL & ~E_DEPRECATED & ~E_STRICT,
            'log_errors' => true,
            'error_log' => __DIR__ . '/../../logs/error.log'
        ];

        if (self::isProduction()) {
            $config['display_errors'] = false;
            $config['log_errors'] = true;
        }

        return $config;
    }

    /**
     * Apply environment settings
     */
    public static function applyEnvironmentSettings(): void
    {
        $envConfig = self::getEnvironmentConfig();
        
        ini_set('display_errors', $envConfig['display_errors'] ? '1' : '0');
        ini_set('log_errors', $envConfig['log_errors'] ? '1' : '0');
        ini_set('error_log', $envConfig['error_log']);
        error_reporting($envConfig['error_reporting']);
    }
}