<?php

namespace Tradefy\Tests;

use PHPUnit\Framework\TestCase;
use Tradefy\Controllers\AuthController;
use Tradefy\Models\User;
use PDO;

class AuthControllerTest extends TestCase
{
    private $db;
    private $authController;
    private $userModel;

    protected function setUp(): void
    {
        // Create in-memory SQLite database for testing
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Create users table
        $this->createUsersTable();

        $this->authController = new AuthController($this->db);
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

    public function testUserRegistration()
    {
        $userData = [
            'email' => 'register@tradefy.com',
            'password' => 'SecurePass123!',
            'role' => 'vendor',
            'profile_data' => ['store_name' => 'Test Store']
        ];

        $response = $this->authController->register($userData);

        $this->assertTrue($response['success']);
        $this->assertEquals(201, $response['status']);
        $this->assertArrayHasKey('user', $response['data']);
        $this->assertArrayHasKey('token', $response['data']);
        $this->assertEquals('register@tradefy.com', $response['data']['user']['email']);
        $this->assertEquals('vendor', $response['data']['user']['role']);
        $this->assertEquals('Test Store', $response['data']['user']['profile_data']['store_name']);
    }

    public function testUserRegistrationWithInvalidEmail()
    {
        $userData = [
            'email' => 'invalid-email',
            'password' => 'SecurePass123!'
        ];

        $response = $this->authController->register($userData);

        $this->assertFalse($response['success']);
        $this->assertEquals(400, $response['status']);
        $this->assertEquals('Invalid email format', $response['error']['message']);
    }

    public function testUserRegistrationWithWeakPassword()
    {
        $userData = [
            'email' => 'weakpass@tradefy.com',
            'password' => 'weak'
        ];

        $response = $this->authController->register($userData);

        $this->assertFalse($response['success']);
        $this->assertEquals(400, $response['status']);
        $this->assertStringContainsString('Password does not meet requirements', $response['error']['message']);
    }

    public function testUserLogin()
    {
        // First register a user
        $userData = [
            'email' => 'login@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $this->authController->register($userData);

        // Then try to login
        $loginData = [
            'email' => 'login@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $response = $this->authController->login($loginData);

        $this->assertTrue($response['success']);
        $this->assertEquals(200, $response['status']);
        $this->assertArrayHasKey('user', $response['data']);
        $this->assertArrayHasKey('token', $response['data']);
        $this->assertEquals('login@tradefy.com', $response['data']['user']['email']);
        $this->assertEquals('Login successful', $response['data']['message']);
    }

    public function testUserLoginWithInvalidCredentials()
    {
        $loginData = [
            'email' => 'nonexistent@tradefy.com',
            'password' => 'WrongPass123!'
        ];

        $response = $this->authController->login($loginData);

        $this->assertFalse($response['success']);
        $this->assertEquals(401, $response['status']);
        $this->assertEquals('Invalid email or password', $response['error']['message']);
    }

    public function testGetUserProfile()
    {
        // Create a user
        $userData = [
            'email' => 'profile@tradefy.com',
            'password' => 'SecurePass123!',
            'profile_data' => ['first_name' => 'John', 'last_name' => 'Doe']
        ];

        $registerResponse = $this->authController->register($userData);
        $user = $registerResponse['data']['user'];

        // Mock user data from JWT token
        $jwtUserData = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $response = $this->authController->getProfile($jwtUserData);

        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('user', $response['data']);
        $this->assertEquals('profile@tradefy.com', $response['data']['user']['email']);
        $this->assertEquals('John', $response['data']['user']['profile_data']['first_name']);
    }

    public function testUpdateUserProfile()
    {
        // Create a user
        $userData = [
            'email' => 'update@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $registerResponse = $this->authController->register($userData);
        $user = $registerResponse['data']['user'];

        $jwtUserData = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $updateData = [
            'profile_data' => [
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'phone' => '+1234567890'
            ]
        ];

        $response = $this->authController->updateProfile($jwtUserData, $updateData);

        $this->assertTrue($response['success']);
        $this->assertEquals('Jane', $response['data']['user']['profile_data']['first_name']);
        $this->assertEquals('Smith', $response['data']['user']['profile_data']['last_name']);
        $this->assertEquals('Profile updated successfully', $response['data']['message']);
    }

    public function testChangePassword()
    {
        // Create a user
        $userData = [
            'email' => 'password@tradefy.com',
            'password' => 'OldSecurePass123!'
        ];

        $registerResponse = $this->authController->register($userData);
        $user = $registerResponse['data']['user'];

        $jwtUserData = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $passwordData = [
            'current_password' => 'OldSecurePass123!',
            'new_password' => 'NewSecurePass123!'
        ];

        $response = $this->authController->changePassword($jwtUserData, $passwordData);

        $this->assertTrue($response['success']);
        $this->assertEquals('Password updated successfully', $response['data']['message']);

        // Verify new password works
        $loginResponse = $this->authController->login([
            'email' => 'password@tradefy.com',
            'password' => 'NewSecurePass123!'
        ]);

        $this->assertTrue($loginResponse['success']);
    }

    public function testGetCommissionInfo()
    {
        // Create a vendor user
        $userData = [
            'email' => 'commission@tradefy.com',
            'password' => 'SecurePass123!',
            'role' => 'vendor'
        ];

        $registerResponse = $this->authController->register($userData);
        $user = $registerResponse['data']['user'];

        $jwtUserData = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $response = $this->authController->getCommissionInfo($jwtUserData);

        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('commission_info', $response['data']);
        $this->assertEquals('Profane', $response['data']['commission_info']['current_rank']);
        $this->assertEquals(0, $response['data']['commission_info']['sales_count']);
    }

    public function testAdminGetUsers()
    {
        // Create admin user
        $adminData = [
            'email' => 'admin@tradefy.com',
            'password' => 'SecurePass123!',
            'role' => 'admin'
        ];

        $registerResponse = $this->authController->register($adminData);
        $admin = $registerResponse['data']['user'];

        $jwtAdminData = [
            'user_id' => $admin['id'],
            'email' => $admin['email'],
            'role' => 'admin'
        ];

        // Create some test users
        $this->authController->register(['email' => 'user1@tradefy.com', 'password' => 'SecurePass123!']);
        $this->authController->register(['email' => 'user2@tradefy.com', 'password' => 'SecurePass123!']);

        $response = $this->authController->getUsers($jwtAdminData);

        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('users', $response['data']);
        $this->assertArrayHasKey('pagination', $response['data']);
        $this->assertGreaterThan(2, $response['data']['pagination']['total']);
    }

    public function testNonAdminCannotGetUsers()
    {
        // Create regular user
        $userData = [
            'email' => 'regular@tradefy.com',
            'password' => 'SecurePass123!',
            'role' => 'user'
        ];

        $registerResponse = $this->authController->register($userData);
        $user = $registerResponse['data']['user'];

        $jwtUserData = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => 'user'
        ];

        $response = $this->authController->getUsers($jwtUserData);

        $this->assertFalse($response['success']);
        $this->assertEquals(403, $response['status']);
        $this->assertEquals('Access denied. Admin role required.', $response['error']['message']);
    }

    public function testTokenValidation()
    {
        // Create a user and get token
        $userData = [
            'email' => 'token@tradefy.com',
            'password' => 'SecurePass123!'
        ];

        $registerResponse = $this->authController->register($userData);
        $token = $registerResponse['data']['token'];

        // Validate token
        $response = $this->authController->validateToken($token);

        $this->assertTrue($response['success']);
        $this->assertTrue($response['data']['valid']);
        $this->assertArrayHasKey('user', $response['data']);
        $this->assertEquals('token@tradefy.com', $response['data']['user']['email']);
    }

    public function testInvalidTokenValidation()
    {
        $response = $this->authController->validateToken('invalid-token');

        $this->assertFalse($response['success']);
        $this->assertEquals(401, $response['status']);
        $this->assertStringContainsString('Invalid token', $response['error']['message']);
    }

    public function testResponseFormatting()
    {
        $successResponse = $this->authController->successResponse(['test' => 'data'], 201);
        
        $this->assertTrue($successResponse['success']);
        $this->assertEquals(201, $successResponse['status']);
        $this->assertEquals('data', $successResponse['data']['test']);
        $this->assertArrayHasKey('timestamp', $successResponse);

        $errorResponse = $this->authController->errorResponse('Test error', 400);
        
        $this->assertFalse($errorResponse['success']);
        $this->assertEquals(400, $errorResponse['status']);
        $this->assertEquals('Test error', $errorResponse['error']['message']);
        $this->assertEquals(400, $errorResponse['error']['code']);
    }
}