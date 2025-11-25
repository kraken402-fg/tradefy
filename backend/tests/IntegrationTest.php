<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Models\Integration;
use PDO;

class IntegrationTest extends TestCase
{
    private $db;
    private $integrationModel;

    protected function setUp(): void
    {
        // Create in-memory SQLite database for testing
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Create tables
        $this->createUsersTable();
        $this->createIntegrationsTable();

        $this->integrationModel = new Integration($this->db);
    }

    private function createUsersTable(): void
    {
        $sql = "
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                vendor_id INTEGER,
                sales_count INTEGER DEFAULT 0,
                total_revenue DECIMAL(10,2) DEFAULT 0.00,
                profile_data TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        ";
        $this->db->exec($sql);
    }

    private function createIntegrationsTable(): void
    {
        $sql = "
            CREATE TABLE integrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                config TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                last_sync TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ";
        $this->db->exec($sql);
    }

    private function createTestUser(string $email = 'user@tradefy.com'): int
    {
        $sql = "INSERT INTO users (email, password_hash) 
                VALUES (:email, :password_hash)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':email' => $email,
            ':password_hash' => password_hash('password', PASSWORD_BCRYPT)
        ]);
        return $this->db->lastInsertId();
    }

    public function testIntegrationCreation()
    {
        $userId = $this->createTestUser();
        
        $integrationData = [
            'user_id' => $userId,
            'type' => 'email',
            'name' => 'My Email Service',
            'config' => [
                'smtp_host' => 'smtp.example.com',
                'smtp_port' => 587,
                'username' => 'user@example.com',
                'password' => 'password123',
                'encryption' => 'tls'
            ],
            'is_active' => true
        ];

        $integration = $this->integrationModel->create($integrationData);

        $this->assertIsArray($integration);
        $this->assertEquals($userId, $integration['user_id']);
        $this->assertEquals('email', $integration['type']);
        $this->assertEquals('My Email Service', $integration['name']);
        $this->assertEquals([
            'smtp_host' => 'smtp.example.com',
            'smtp_port' => 587,
            'username' => 'user@example.com',
            'password' => 'password123',
            'encryption' => 'tls'
        ], $integration['config']);
        $this->assertTrue($integration['is_active']);
    }

    public function testIntegrationCreationWithMissingRequiredFields()
    {
        $userId = $this->createTestUser();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Field type is required');

        $this->integrationModel->create([
            'user_id' => $userId,
            'name' => 'Test Integration'
            // Missing type and config
        ]);
    }

    public function testIntegrationCreationWithInvalidType()
    {
        $userId = $this->createTestUser();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid integration type');

        $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'invalid_type',
            'name' => 'Invalid Integration',
            'config' => []
        ]);
    }

    public function testFindIntegrationById()
    {
        $userId = $this->createTestUser();
        
        $integrationData = [
            'user_id' => $userId,
            'type' => 'analytics',
            'name' => 'Google Analytics',
            'config' => ['tracking_id' => 'UA-123456']
        ];

        $createdIntegration = $this->integrationModel->create($integrationData);
        $foundIntegration = $this->integrationModel->findById($createdIntegration['id']);

        $this->assertIsArray($foundIntegration);
        $this->assertEquals($createdIntegration['id'], $foundIntegration['id']);
        $this->assertEquals('Google Analytics', $foundIntegration['name']);
        $this->assertEquals('analytics', $foundIntegration['type']);
    }

    public function testFindIntegrationsByUser()
    {
        $userId = $this->createTestUser();
        
        // Create multiple integrations for the same user
        $integrationTypes = ['email', 'analytics', 'crm'];
        
        foreach ($integrationTypes as $type) {
            $this->integrationModel->create([
                'user_id' => $userId,
                'type' => $type,
                'name' => "{$type} Integration",
                'config' => ['test' => 'value']
            ]);
        }

        $integrations = $this->integrationModel->findByUser($userId);

        $this->assertCount(3, $integrations);
        $this->assertEquals('email', $integrations[0]['type']);
        $this->assertEquals('analytics', $integrations[1]['type']);
        $this->assertEquals('crm', $integrations[2]['type']);
    }

    public function testFindIntegrationsByUserAndType()
    {
        $userId = $this->createTestUser();
        
        $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'email',
            'name' => 'Email Integration',
            'config' => ['test' => 'value']
        ]);

        $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'analytics',
            'name' => 'Analytics Integration',
            'config' => ['test' => 'value']
        ]);

        $emailIntegrations = $this->integrationModel->findByUser($userId, 'email');
        $this->assertCount(1, $emailIntegrations);
        $this->assertEquals('email', $emailIntegrations[0]['type']);

        $analyticsIntegrations = $this->integrationModel->findByUser($userId, 'analytics');
        $this->assertCount(1, $analyticsIntegrations);
        $this->assertEquals('analytics', $analyticsIntegrations[0]['type']);
    }

    public function testUpdateIntegration()
    {
        $userId = $this->createTestUser();
        
        $integration = $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'payment',
            'name' => 'Original Name',
            'config' => ['api_key' => 'old_key'],
            'is_active' => true
        ]);

        $updatedIntegration = $this->integrationModel->update($integration['id'], $userId, [
            'name' => 'Updated Name',
            'config' => ['api_key' => 'new_key', 'secret' => 'secret123'],
            'is_active' => false
        ]);

        $this->assertEquals('Updated Name', $updatedIntegration['name']);
        $this->assertEquals(['api_key' => 'new_key', 'secret' => 'secret123'], $updatedIntegration['config']);
        $this->assertFalse($updatedIntegration['is_active']);
    }

    public function testUpdateIntegrationWithInvalidUser()
    {
        $userId = $this->createTestUser();
        $otherUserId = $this->createTestUser('other@tradefy.com');
        
        $integration = $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'email',
            'name' => 'My Integration',
            'config' => ['test' => 'value']
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Integration not found or access denied');

        $this->integrationModel->update($integration['id'], $otherUserId, [
            'name' => 'Hacked Integration'
        ]);
    }

    public function testDeleteIntegration()
    {
        $userId = $this->createTestUser();
        
        $integration = $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'shipping',
            'name' => 'Shipping Integration',
            'config' => ['api_key' => 'test_key']
        ]);

        $result = $this->integrationModel->delete($integration['id'], $userId);
        $this->assertTrue($result);

        $deletedIntegration = $this->integrationModel->findById($integration['id']);
        $this->assertNull($deletedIntegration);
    }

    public function testTestConnection()
    {
        $userId = $this->createTestUser();
        
        $integration = $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'email',
            'name' => 'Email Integration',
            'config' => [
                'smtp_host' => 'smtp.example.com',
                'smtp_port' => 587,
                'username' => 'user@example.com',
                'password' => 'password123',
                'encryption' => 'tls'
            ]
        ]);

        $result = $this->integrationModel->testConnection($integration['id'], $userId);

        $this->assertTrue($result['success']);
        $this->assertEquals('Email integration configured successfully', $result['message']);
        $this->assertArrayHasKey('details', $result);
    }

    public function testTestConnectionWithInvalidConfig()
    {
        $userId = $this->createTestUser();
        
        $integration = $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'email',
            'name' => 'Invalid Email Integration',
            'config' => [
                // Missing required fields
                'smtp_host' => 'smtp.example.com'
                // Missing smtp_port, username, password
            ]
        ]);

        $result = $this->integrationModel->testConnection($integration['id'], $userId);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Connection test failed', $result['message']);
        $this->assertArrayHasKey('error', $result);
    }

    public function testTestConnectionWithInvalidUser()
    {
        $userId = $this->createTestUser();
        $otherUserId = $this->createTestUser('other@tradefy.com');
        
        $integration = $this->integrationModel->create([
            'user_id' => $userId,
            'type' => 'analytics',
            'name' => 'Analytics Integration',
            'config' => ['tracking_id' => 'UA-123456']
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Integration not found or access denied');

        $this->integrationModel->testConnection($integration['id'], $otherUserId);
    }

    public function testGetUserStats()
    {
        $userId = $this->createTestUser();
        
        // Create integrations of different types and statuses
        $integrations = [
            ['type' => 'email', 'active' => true],
            ['type' => 'analytics', 'active' => true],
            ['type' => 'crm', 'active' => false],
            ['type' => 'email', 'active' => true],
            ['type' => 'payment', 'active' => false]
        ];

        foreach ($integrations as $integrationData) {
            $this->integrationModel->create([
                'user_id' => $userId,
                'type' => $integrationData['type'],
                'name' => "{$integrationData['type']} Integration",
                'config' => ['test' => 'value'],
                'is_active' => $integrationData['active']
            ]);
        }

        $stats = $this->integrationModel->getUserStats($userId);

        $this->assertEquals(5, $stats['total_integrations']);
        $this->assertEquals(3, $stats['active_integrations']);
        $this->assertEquals(2, $stats['inactive_integrations']);
        $this->assertCount(4, $stats['by_type']); // email (2), analytics (1), crm (1), payment (1)

        // Check email type specifically
        $emailStats = array_filter($stats['by_type'], function($typeStat) {
            return $typeStat['type'] === 'email';
        });
        $this->assertEquals(2, array_values($emailStats)[0]['total']);
    }

    public function testGetAvailableTypes()
    {
        $availableTypes = $this->integrationModel->getAvailableTypes();

        $this->assertIsArray($availableTypes);
        $this->assertGreaterThan(0, count($availableTypes));

        // Check structure of first type
        $firstType = $availableTypes[0];
        $this->assertArrayHasKey('type', $firstType);
        $this->assertArrayHasKey('name', $firstType);
        $this->assertArrayHasKey('description', $firstType);
        $this->assertArrayHasKey('config_fields', $firstType);

        // Check that we have expected types
        $types = array_column($availableTypes, 'type');
        $this->assertContains('email', $types);
        $this->assertContains('analytics', $types);
        $this->assertContains('crm', $types);
        $this->assertContains('payment', $types);
        $this->assertContains('shipping', $types);
    }

    public function testTestConnectionForDifferentTypes()
    {
        $userId = $this->createTestUser();

        $testCases = [
            [
                'type' => 'analytics',
                'config' => ['tracking_id' => 'UA-123456'],
                'should_succeed' => true
            ],
            [
                'type' => 'crm',
                'config' => ['api_key' => 'test_key', 'base_url' => 'https://api.example.com'],
                'should_succeed' => true
            ],
            [
                'type' => 'payment',
                'config' => ['api_key' => 'test_key', 'secret_key' => 'test_secret'],
                'should_succeed' => true
            ],
            [
                'type' => 'shipping',
                'config' => ['api_key' => 'test_key', 'carrier' => 'ups'],
                'should_succeed' => true
            ],
            [
                'type' => 'analytics',
                'config' => [], // Missing tracking_id
                'should_succeed' => false
            ]
        ];

        foreach ($testCases as $testCase) {
            $integration = $this->integrationModel->create([
                'user_id' => $userId,
                'type' => $testCase['type'],
                'name' => "Test {$testCase['type']}",
                'config' => $testCase['config']
            ]);

            $result = $this->integrationModel->testConnection($integration['id'], $userId);

            if ($testCase['should_succeed']) {
                $this->assertTrue($result['success'], "Failed for type: {$testCase['type']}");
                $this->assertStringContainsString('configured successfully', $result['message']);
            } else {
                $this->assertFalse($result['success'], "Should have failed for type: {$testCase['type']}");
            }
        }
    }
}