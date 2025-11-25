<?php

namespace Tradefy\Config;

class ExternalServices
{
    // Moneroo Payment Gateway
    public static function getMonerooConfig(): array
    {
        return [
            'base_url' => getenv('MONEROO_BASE_URL') ?: 'https://api.moneroo.io/v1',
            'api_key' => getenv('MONEROO_API_KEY'),
            'secret_key' => getenv('MONEROO_SECRET_KEY'),
            'webhook_secret' => getenv('MONEROO_WEBHOOK_SECRET'),
            'timeout' => 30,
            'supported_currencies' => ['USD', 'EUR', 'GBP', 'XOF', 'XAF'],
            'webhook_events' => [
                'payment.succeeded',
                'payment.failed', 
                'payment.refunded',
                'payout.succeeded',
                'payout.failed'
            ]
        ];
    }

    // Supabase Storage
    public static function getSupabaseConfig(): array
    {
        return [
            'url' => getenv('SUPABASE_URL'),
            'key' => getenv('SUPABASE_KEY'),
            'bucket' => getenv('SUPABASE_BUCKET') ?: 'tradefy-products',
            'timeout' => 30,
            'max_file_size' => 5 * 1024 * 1024, // 5MB
            'allowed_mime_types' => [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif'
            ]
        ];
    }

    // Vercel Deployment
    public static function getVercelConfig(): array
    {
        return [
            'deploy_hook' => getenv('VERCEL_DEPLOY_HOOK'),
            'team_id' => getenv('VERCEL_TEAM_ID'),
            'project_id' => getenv('VERCEL_PROJECT_ID'),
            'token' => getenv('VERCEL_TOKEN')
        ];
    }

    // Frontend URLs (Vercel)
    public static function getFrontendUrls(): array
    {
        $appUrl = Settings::getAppUrl();
        
        return [
            'base_url' => $appUrl,
            'payment_success' => $appUrl . '/payment/success',
            'payment_cancel' => $appUrl . '/payment/cancel',
            'webhook_url' => $appUrl . '/webhook/moneroo',
            'product_url' => $appUrl . '/products',
            'vendor_url' => $appUrl . '/vendor'
        ];
    }

    // Service health checks
    public static function getHealthEndpoints(): array
    {
        return [
            'moneroo' => self::getMonerooConfig()['base_url'] . '/health',
            'supabase' => self::getSupabaseConfig()['url'] . '/rest/v1/',
            'main_app' => Settings::getAppUrl() . '/health'
        ];
    }

    // Validate all external service configurations
    public static function validateConfigurations(): array
    {
        $errors = [];

        // Moneroo validation
        $monerooConfig = self::getMonerooConfig();
        if (empty($monerooConfig['api_key']) || empty($monerooConfig['secret_key'])) {
            $errors[] = 'Moneroo API credentials are missing';
        }

        // Supabase validation
        $supabaseConfig = self::getSupabaseConfig();
        if (empty($supabaseConfig['url']) || empty($supabaseConfig['key'])) {
            $errors[] = 'Supabase configuration is missing';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'services' => [
                'moneroo_configured' => !empty($monerooConfig['api_key']),
                'supabase_configured' => !empty($supabaseConfig['url']),
                'vercel_configured' => !empty(self::getVercelConfig()['deploy_hook'])
            ]
        ];
    }
}