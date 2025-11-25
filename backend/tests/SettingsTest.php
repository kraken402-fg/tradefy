<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Config\Settings;

class SettingsTest extends TestCase
{
    protected function setUp(): void
    {
        // Clear environment variables before each test
        putenv('APP_ENV');
        putenv('DB_HOST');
        putenv('DB_NAME');
        putenv('DB_USER');
        putenv('DB_PASSWORD');
        putenv('JWT_SECRET');
        putenv('MONEROO_API_KEY');
        putenv('MONEROO_SECRET_KEY');
        putenv('SUPABASE_URL');
        putenv('SUPABASE_KEY');
        putenv('APP_URL');
        putenv('ALLOWED_ORIGINS');
    }

    public function testDefaultSettings()
    {
        // Set minimal required environment variables
        putenv('JWT_SECRET=test-secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $this->assertEquals('production', Settings::getEnvironment());
        $this->assertTrue(Settings::isProduction());
        $this->assertFalse(Settings::isDevelopment());
        
        $this->assertEquals('Tradefy', Settings::getAppName());
        $this->assertEquals('3.0.0', Settings::getAppVersion());
        $this->assertEquals('https://tradefy.com', Settings::getAppUrl());
        
        $this->assertEquals(450, Settings::getDefaultCommission());
        $this->assertEquals(1.00, Settings::getMinProductPrice());
        $this->assertEquals(10000.00, Settings::getMaxProductPrice());
    }

    public function testEnvironmentDetection()
    {
        putenv('APP_ENV=development');
        putenv('JWT_SECRET=test-secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $this->assertEquals('development', Settings::getEnvironment());
        $this->assertTrue(Settings::isDevelopment());
        $this->assertFalse(Settings::isProduction());
    }

    public function testDatabaseConfig()
    {
        putenv('APP_ENV=test');
        putenv('DB_HOST=db.server.com');
        putenv('DB_PORT=5433');
        putenv('DB_NAME=tradefy_test');
        putenv('DB_USER=test_user');
        putenv('DB_PASSWORD=test_pass');
        putenv('JWT_SECRET=test-secret');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $dbConfig = Settings::getDatabaseConfig();
        
        $this->assertEquals('db.server.com', $dbConfig['host']);
        $this->assertEquals('5433', $dbConfig['port']);
        $this->assertEquals('tradefy_test', $dbConfig['dbname']);
        $this->assertEquals('test_user', $dbConfig['user']);
        $this->assertEquals('test_pass', $dbConfig['password']);
        $this->assertEquals('prefer', $dbConfig['sslmode']);

        $dsn = Settings::getDatabaseDSN();
        $this->assertEquals('pgsql:host=db.server.com;port=5433;dbname=tradefy_test', $dsn);
    }

    public function testJwtConfig()
    {
        putenv('JWT_SECRET=super-secret-jwt-key');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $this->assertEquals('super-secret-jwt-key', Settings::getJwtSecret());
        $this->assertEquals('HS256', Settings::getJwtAlgorithm());
        $this->assertEquals(86400, Settings::getJwtExpiration());
    }

    public function testMonerooConfig()
    {
        putenv('MONEROO_API_KEY=test-api-key');
        putenv('MONEROO_SECRET_KEY=test-secret-key');
        putenv('MONEROO_WEBHOOK_SECRET=webhook-secret');
        putenv('MONEROO_BASE_URL=https://api.moneroo.test');
        putenv('JWT_SECRET=test-secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $monerooConfig = Settings::getMonerooConfig();
        
        $this->assertEquals('test-api-key', $monerooConfig['api_key']);
        $this->assertEquals('test-secret-key', $monerooConfig['secret_key']);
        $this->assertEquals('webhook-secret', $monerooConfig['webhook_secret']);
        $this->assertEquals('https://api.moneroo.test', $monerooConfig['base_url']);
        
        $this->assertTrue(Settings::isMonerooEnabled());
    }

    public function testSupabaseConfig()
    {
        putenv('SUPABASE_URL=https://custom.supabase.co');
        putenv('SUPABASE_KEY=custom-key');
        putenv('SUPABASE_BUCKET=images-bucket');
        putenv('JWT_SECRET=test-secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');

        Settings::initialize();

        $supabaseConfig = Settings::getSupabaseConfig();
        
        $this->assertEquals('https://custom.supabase.co', $supabaseConfig['url']);
        $this->assertEquals('custom-key', $supabaseConfig['key']);
        $this->assertEquals('images-bucket', $supabaseConfig['bucket']);
        
        $this->assertTrue(Settings::isSupabaseEnabled());
    }

    public function testCorsConfig()
    {
        putenv('ALLOWED_ORIGINS=https://app.tradefy.com,http://localhost:3000,https://staging.tradefy.com');
        putenv('JWT_SECRET=test-secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $origins = Settings::getAllowedOrigins();
        
        $this->assertCount(3, $origins);
        $this->assertContains('https://app.tradefy.com', $origins);
        $this->assertContains('http://localhost:3000', $origins);
        $this->assertContains('https://staging.tradefy.com', $origins);
        
        $this->assertTrue(Settings::isOriginAllowed('https://app.tradefy.com'));
        $this->assertFalse(Settings::isOriginAllowed('https://evil.com'));
    }

    public function testFileUploadConfig()
    {
        Settings::initialize();

        $uploadConfig = Settings::getFileUploadConfig();
        
        $this->assertEquals(5242880, $uploadConfig['max_size']);
        $this->assertContains('image/jpeg', $uploadConfig['allowed_types']);
        $this->assertContains('image/png', $uploadConfig['allowed_types']);
        $this->assertContains('image/webp', $uploadConfig['allowed_types']);
    }

    public function testRateLimitConfig()
    {
        Settings::initialize();

        $rateLimit = Settings::getRateLimitConfig();
        
        $this->assertEquals(100, $rateLimit['requests']);
        $this->assertEquals(900, $rateLimit['period']);
    }

    public function testConfigValidation()
    {
        // Test with missing required settings
        putenv('JWT_SECRET='); // Missing JWT secret
        
        Settings::initialize();
        
        $errors = Settings::validateConfig();
        
        $this->assertContains('JWT_SECRET is required', $errors);
    }

    public function testEnvironmentConfig()
    {
        putenv('APP_ENV=development');
        putenv('JWT_SECRET=test-secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $envConfig = Settings::getEnvironmentConfig();
        
        $this->assertTrue($envConfig['display_errors']);
        $this->assertEquals(E_ALL, $envConfig['error_reporting']);
    }

    public function testAllSettings()
    {
        putenv('APP_ENV=test');
        putenv('JWT_SECRET=test-secret');
        putenv('DB_HOST=localhost');
        putenv('DB_NAME=tradefy');
        putenv('DB_USER=user');
        putenv('MONEROO_API_KEY=moneroo-key');
        putenv('MONEROO_SECRET_KEY=moneroo-secret');
        putenv('SUPABASE_URL=https://test.supabase.co');
        putenv('SUPABASE_KEY=supabase-key');

        Settings::initialize();

        $allSettings = Settings::getAllSettings();
        
        $this->assertEquals('test', $allSettings['environment']);
        $this->assertEquals('Tradefy', $allSettings['application']['name']);
        $this->assertEquals('3.0.0', $allSettings['application']['version']);
        $this->assertTrue($allSettings['moneroo']['enabled']);
        $this->assertTrue($allSettings['supabase']['enabled']);
    }
}