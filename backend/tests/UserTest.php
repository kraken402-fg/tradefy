<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Models\User;
use PDO;
use PDOException;

class UserTest extends TestCase
{
    private $db;
    private $userModel;

    protected function setUp(): void
    {
        // Create in-memory SQLite database for testing
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Create users table
        $this->createUsersTable();

        $this->userModel = new User($this->db);
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

    public function testUserCreation()
    {
        $userData = [
            'email' => 'test@tradefy.com',
            'password' => 'SecurePass123!',
            'role' => 'vendor',
            'profile_data' => ['store_name' => 'Test Store']
        ];

        $user = $this->userModel->create($userData);

        $this->assertIsArray($user);
        $this->assertEquals('test@tradefy.com', $user['email']);
        $this->assertEquals('vendor', $user['role']);
        $this->assertEquals(0, $user['sales_count']);
        $this->assertEquals(0.0, $user['total_revenue']);
        $this->assertTrue($user['is_active']);
        $this->assertEquals('Test Store', $user['profile_data']['store_name']);
    }

    public function testUserCreationWithInvalidEmail()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid email format');

        $userData = [
            'email' => 'invalid-email',
            'password' => 'SecurePass123!'
        ];

        $this->userModel->create($userData);
    }

    public function testUserCreationWithWeakPassword()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Password does not meet requirements');

        $userData = [
            'email' => 'test@tradefy.com',
            'password' => 'weak'
        ];

        $this->userModel->create($userData);
    }

    public function testDuplicateEmail()
    {
        $userData = [
            'email' => 'duplicate@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $this->userModel->create($userData);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Email already registered');

        $this->userModel->create($userData);
    }

    public function testFindUserById()
    {
        $userData = [
            'email' => 'find@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $createdUser = $this->userModel->create($userData);
        $foundUser = $this->userModel->findById($createdUser['id']);

        $this->assertIsArray($foundUser);
        $this->assertEquals($createdUser['id'], $foundUser['id']);
        $this->assertEquals('find@tradefy.com', $foundUser['email']);
    }

    public function testFindNonExistentUser()
    {
        $user = $this->userModel->findById(999);
        $this->assertNull($user);
    }

    public function testFindUserByEmail()
    {
        $userData = [
            'email' => 'findbyemail@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $this->userModel->create($userData);
        $foundUser = $this->userModel->findByEmail('findbyemail@tradefy.com');

        $this->assertIsArray($foundUser);
        $this->assertEquals('findbyemail@tradefy.com', $foundUser['email']);
    }

    public function testUserAuthentication()
    {
        $userData = [
            'email' => 'auth@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $this->userModel->create($userData);
        
        // Successful authentication
        $user = $this->userModel->authenticate('auth@tradefy.com', 'SecurePass123!');
        $this->assertIsArray($user);
        $this->assertEquals('auth@tradefy.com', $user['email']);

        // Failed authentication - wrong password
        $user = $this->userModel->authenticate('auth@tradefy.com', 'WrongPass123!');
        $this->assertNull($user);

        // Failed authentication - non-existent user
        $user = $this->userModel->authenticate('nonexistent@tradefy.com', 'SecurePass123!');
        $this->assertNull($user);
    }

    public function testUpdateProfile()
    {
        $userData = [
            'email' => 'profile@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $createdUser = $this->userModel->create($userData);
        
        $profileData = [
            'profile_data' => [
                'store_name' => 'Updated Store',
                'description' => 'Test description',
                'social_links' => ['twitter' => '@tradefy']
            ]
        ];

        $updatedUser = $this->userModel->updateProfile($createdUser['id'], $profileData);

        $this->assertEquals('Updated Store', $updatedUser['profile_data']['store_name']);
        $this->assertEquals('Test description', $updatedUser['profile_data']['description']);
        $this->assertEquals('@tradefy', $updatedUser['profile_data']['social_links']['twitter']);
    }

    public function testUpdatePassword()
    {
        $userData = [
            'email' => 'password@tradefy.com',
            'password' => 'OldSecurePass123!'
        ];

        $createdUser = $this->userModel->create($userData);

        // Successful password update
        $result = $this->userModel->updatePassword($createdUser['id'], 'OldSecurePass123!', 'NewSecurePass123!');
        $this->assertTrue($result);

        // Verify new password works
        $user = $this->userModel->authenticate('password@tradefy.com', 'NewSecurePass123!');
        $this->assertIsArray($user);

        // Verify old password doesn't work
        $user = $this->userModel->authenticate('password@tradefy.com', 'OldSecurePass123!');
        $this->assertNull($user);
    }

    public function testRecordSale()
    {
        $userData = [
            'email' => 'sales@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $createdUser = $this->userModel->create($userData);
        
        // Record first sale
        $this->userModel->recordSale($createdUser['id'], 100.50);
        $user = $this->userModel->findById($createdUser['id']);
        
        $this->assertEquals(1, $user['sales_count']);
        $this->assertEquals(100.50, $user['total_revenue']);

        // Record second sale
        $this->userModel->recordSale($createdUser['id'], 50.25);
        $user = $this->userModel->findById($createdUser['id']);
        
        $this->assertEquals(2, $user['sales_count']);
        $this->assertEquals(150.75, $user['total_revenue']);
    }

    public function testGetCommissionInfo()
    {
        $userData = [
            'email' => 'commission@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $createdUser = $this->userModel->create($userData);
        
        // Record some sales to reach Beginner rank
        for ($i = 0; $i < 30; $i++) {
            $this->userModel->recordSale($createdUser['id'], 10.00);
        }

        $commissionInfo = $this->userModel->getCommissionInfo($createdUser['id']);

        $this->assertEquals($createdUser['id'], $commissionInfo['user_id']);
        $this->assertEquals(30, $commissionInfo['sales_count']);
        $this->assertEquals(300.00, $commissionInfo['total_revenue']);
        $this->assertEquals('Beginner', $commissionInfo['current_rank']);
        $this->assertEquals(425, $commissionInfo['commission_rate']);
        $this->assertArrayHasKey('rank_progress', $commissionInfo);
        $this->assertArrayHasKey('quest_info', $commissionInfo);
    }

    public function testSearchUsers()
    {
        // Create test users
        $users = [
            ['email' => 'vendor1@tradefy.com', 'password' => 'SecurePass123!', 'role' => 'vendor'],
            ['email' => 'vendor2@tradefy.com', 'password' => 'SecurePass123!', 'role' => 'vendor'],
            ['email' => 'user1@tradefy.com', 'password' => 'SecurePass123!', 'role' => 'user'],
        ];

        foreach ($users as $userData) {
            $this->userModel->create($userData);
        }

        // Search all vendors
        $result = $this->userModel->searchUsers(['role' => 'vendor']);
        
        $this->assertCount(2, $result['users']);
        $this->assertEquals(2, $result['pagination']['total']);

        // Search by email
        $result = $this->userModel->searchUsers(['email' => 'vendor1']);
        $this->assertCount(1, $result['users']);
        $this->assertEquals('vendor1@tradefy.com', $result['users'][0]['email']);

        // Test pagination
        $result = $this->userModel->searchUsers([], 1, 2);
        $this->assertCount(2, $result['users']);
        $this->assertEquals(3, $result['pagination']['total']);
        $this->assertEquals(2, $result['pagination']['total_pages']);
    }

    public function testDeactivateUser()
    {
        $userData = [
            'email' => 'deactivate@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $createdUser = $this->userModel->create($userData);
        
        $result = $this->userModel->deactivate($createdUser['id']);
        $this->assertTrue($result);

        $user = $this->userModel->findById($createdUser['id']);
        $this->assertNull($user);
    }

    public function testGenerateAuthToken()
    {
        $userData = [
            'email' => 'token@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $createdUser = $this->userModel->create($userData);
        
        // Load user first
        $user = $this->userModel->findById($createdUser['id']);
        
        $token = $this->userModel->generateAuthToken();
        
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }
}