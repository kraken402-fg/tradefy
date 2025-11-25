<?php

namespace Tradefy\Composer;

use Composer\Script\Event;
use Composer\Installer\PackageEvent;

class ScriptHandler
{
    /**
     * Post autoload dump handler
     */
    public static function postAutoloadDump(Event $event): void
    {
        $vendorDir = $event->getComposer()->getConfig()->get('vendor-dir');
        
        // Create necessary directories
        self::createDirectories();
        
        // Check PHP version
        self::checkPhpVersion();
        
        // Check required extensions
        self::checkExtensions();
        
        // Generate environment file if it doesn't exist
        self::generateEnvFile();
        
        $event->getIO()->write('✅ Tradefy v3 setup completed successfully');
    }

    /**
     * Create necessary directories
     */
    private static function createDirectories(): void
    {
        $directories = [
            'logs',
            'cache',
            'uploads',
            'migrations',
            'coverage'
        ];

        foreach ($directories as $directory) {
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }
        }
    }

    /**
     * Check PHP version
     */
    private static function checkPhpVersion(): void
    {
        $requiredVersion = '8.1.0';
        $currentVersion = PHP_VERSION;

        if (version_compare($currentVersion, $requiredVersion, '<')) {
            throw new \RuntimeException(
                "Tradefy v3 requires PHP {$requiredVersion} or later. " .
                "Current version: {$currentVersion}"
            );
        }
    }

    /**
     * Check required extensions
     */
    private static function checkExtensions(): void
    {
        $requiredExtensions = [
            'pdo',
            'json',
            'curl',
            'openssl'
        ];

        $missingExtensions = [];

        foreach ($requiredExtensions as $extension) {
            if (!extension_loaded($extension)) {
                $missingExtensions[] = $extension;
            }
        }

        if (!empty($missingExtensions)) {
            throw new \RuntimeException(
                "Missing required PHP extensions: " . implode(', ', $missingExtensions)
            );
        }
    }

    /**
     * Generate .env file if it doesn't exist
     */
    private static function generateEnvFile(): void
    {
        $envFile = '.env';
        
        if (!file_exists($envFile)) {
            $envTemplate = <<<ENV
# Tradefy v3 Environment Configuration
# Copy this file to .env and update with your actual values

# Application Environment
APP_ENV=development
APP_URL=https://your-tradefy-domain.com

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tradefy
DB_USER=tradefy_user
DB_PASSWORD=your_secure_password

# JWT Secret Key (Generate a secure random key)
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here

# Moneroo Payment Gateway
MONEROO_API_KEY=your_moneroo_api_key
MONEROO_SECRET_KEY=your_moneroo_secret_key
MONEROO_WEBHOOK_SECRET=your_moneroo_webhook_secret
MONEROO_BASE_URL=https://api.moneroo.io/v1

# Supabase Storage
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=tradefy-products

# SMTP Email Configuration (Optional)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-email@your-domain.com
SMTP_PASSWORD=your-email-password

# CORS Allowed Origins
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000

ENV;

            file_put_contents($envFile, $envTemplate);
            
            echo "📁 Created .env file. Please update it with your actual configuration.\n";
        }
    }

    /**
     * Pre package install hook
     */
    public static function prePackageInstall(PackageEvent $event): void
    {
        $package = $event->getOperation()->getPackage();
        $packageName = $package->getName();
        
        echo "Installing package: {$packageName}\n";
    }

    /**
     * Post package install hook
     */
    public static function postPackageInstall(PackageEvent $event): void
    {
        $package = $event->getOperation()->getPackage();
        $packageName = $package->getName();
        
        echo "✅ Successfully installed: {$packageName}\n";
    }

    /**
     * Pre package update hook
     */
    public static function prePackageUpdate(PackageEvent $event): void
    {
        $package = $event->getOperation()->getPackage();
        $packageName = $package->getName();
        
        echo "Updating package: {$packageName}\n";
    }

    /**
     * Post package update hook
     */
    public static function postPackageUpdate(PackageEvent $event): void
    {
        $package = $event->getOperation()->getPackage();
        $packageName = $package->getName();
        
        echo "✅ Successfully updated: {$packageName}\n";
    }
}