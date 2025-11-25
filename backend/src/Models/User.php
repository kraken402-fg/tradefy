<?php

namespace Tradefy\Models;

use PDO;
use Tradefy\Utils\Security;
use Tradefy\Utils\CommissionCalculator;

class User
{
    private $db;
    private $id;
    private $email;
    private $passwordHash;
    private $role;
    private $vendorId;
    private $salesCount;
    private $totalRevenue;
    private $createdAt;
    private $updatedAt;
    private $isActive;
    private $profileData;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Create new user
     */
    public function create(array $userData): array
    {
        // Validate required fields
        $required = ['email', 'password'];
        foreach ($required as $field) {
            if (empty($userData[$field])) {
                throw new \Exception("Field {$field} is required");
            }
        }

        // Validate email
        if (!Security::validateEmail($userData['email'])) {
            throw new \Exception('Invalid email format');
        }

        // Validate password
        $passwordValidation = Security::validatePassword($userData['password']);
        if (!$passwordValidation['valid']) {
            throw new \Exception('Password does not meet requirements: ' . implode(', ', $passwordValidation['errors']));
        }

        // Check if email already exists
        if ($this->emailExists($userData['email'])) {
            throw new \Exception('Email already registered');
        }

        // Hash password
        $passwordHash = Security::hashPassword($userData['password']);

        // Prepare user data
        $role = $userData['role'] ?? 'user';
        $vendorId = $userData['vendor_id'] ?? null;
        $profileData = $userData['profile_data'] ?? [];

        $sql = "INSERT INTO users 
                (email, password_hash, role, vendor_id, sales_count, total_revenue, profile_data, created_at, updated_at, is_active) 
                VALUES 
                (:email, :password_hash, :role, :vendor_id, 0, 0.0, :profile_data, NOW(), NOW(), true) 
                RETURNING id, email, role, vendor_id, sales_count, total_revenue, created_at, updated_at, is_active, profile_data";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':email' => $userData['email'],
            ':password_hash' => $passwordHash,
            ':role' => $role,
            ':vendor_id' => $vendorId,
            ':profile_data' => json_encode($profileData)
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // Set object properties
        $this->id = $result['id'];
        $this->email = $result['email'];
        $this->role = $result['role'];
        $this->vendorId = $result['vendor_id'];
        $this->salesCount = $result['sales_count'];
        $this->totalRevenue = $result['total_revenue'];
        $this->createdAt = $result['created_at'];
        $this->updatedAt = $result['updated_at'];
        $this->isActive = $result['is_active'];
        $this->profileData = json_decode($result['profile_data'], true) ?? [];

        return $this->toArray();
    }

    /**
     * Find user by ID
     */
    public function findById(int $userId): ?array
    {
        $sql = "SELECT * FROM users WHERE id = :id AND is_active = true";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $userId]);
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return null;
        }

        $this->loadFromArray($user);
        return $this->toArray();
    }

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?array
    {
        $sql = "SELECT * FROM users WHERE email = :email AND is_active = true";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':email' => $email]);
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return null;
        }

        $this->loadFromArray($user);
        return $this->toArray();
    }

    /**
     * Authenticate user
     */
    public function authenticate(string $email, string $password): ?array
    {
        $sql = "SELECT * FROM users WHERE email = :email AND is_active = true";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':email' => $email]);
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return null;
        }

        if (!Security::verifyPassword($password, $user['password_hash'])) {
            return null;
        }

        $this->loadFromArray($user);
        return $this->toArray();
    }

    /**
     * Update user profile
     */
    public function updateProfile(int $userId, array $profileData): array
    {
        $allowedFields = ['profile_data'];
        $updates = [];
        $params = [':id' => $userId];

        foreach ($profileData as $field => $value) {
            if (in_array($field, $allowedFields)) {
                if ($field === 'profile_data') {
                    $updates[] = "profile_data = :profile_data";
                    $params[':profile_data'] = json_encode($value);
                }
            }
        }

        if (empty($updates)) {
            throw new \Exception('No valid fields to update');
        }

        $updates[] = "updated_at = NOW()";
        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id AND is_active = true RETURNING *";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new \Exception('User not found');
        }

        $this->loadFromArray($user);
        return $this->toArray();
    }

    /**
     * Update user password
     */
    public function updatePassword(int $userId, string $currentPassword, string $newPassword): bool
    {
        // Get current user data
        $user = $this->findById($userId);
        if (!$user) {
            throw new \Exception('User not found');
        }

        // Verify current password
        $sql = "SELECT password_hash FROM users WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $userId]);
        $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!Security::verifyPassword($currentPassword, $currentUser['password_hash'])) {
            throw new \Exception('Current password is incorrect');
        }

        // Validate new password
        $passwordValidation = Security::validatePassword($newPassword);
        if (!$passwordValidation['valid']) {
            throw new \Exception('New password does not meet requirements: ' . implode(', ', $passwordValidation['errors']));
        }

        // Hash new password
        $newPasswordHash = Security::hashPassword($newPassword);

        // Update password
        $sql = "UPDATE users SET password_hash = :password_hash, updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':password_hash' => $newPasswordHash,
            ':id' => $userId
        ]);
    }

    /**
     * Increment sales count and revenue
     */
    public function recordSale(int $userId, float $saleAmount): bool
    {
        $sql = "UPDATE users 
                SET sales_count = sales_count + 1, 
                    total_revenue = total_revenue + :sale_amount,
                    updated_at = NOW() 
                WHERE id = :id AND is_active = true";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':sale_amount' => $saleAmount,
            ':id' => $userId
        ]);
    }

    /**
     * Get user's commission information
     */
    public function getCommissionInfo(int $userId): array
    {
        $user = $this->findById($userId);
        if (!$user) {
            throw new \Exception('User not found');
        }

        $salesCount = $user['sales_count'];
        
        return [
            'user_id' => $userId,
            'sales_count' => $salesCount,
            'total_revenue' => $user['total_revenue'],
            'current_rank' => CommissionCalculator::getRank($salesCount),
            'commission_rate' => CommissionCalculator::calculateCommission($salesCount, 100)['commission_rate'],
            'rank_progress' => CommissionCalculator::calculateRankProgress($salesCount),
            'quest_info' => CommissionCalculator::calculateQuest($salesCount)
        ];
    }

    /**
     * Check if user can be promoted
     */
    public function checkRankUpgrade(int $userId): array
    {
        $user = $this->findById($userId);
        if (!$user) {
            throw new \Exception('User not found');
        }

        $currentSales = $user['sales_count'];
        
        // Simulate new sale to check for upgrade
        $newSales = $currentSales + 1;
        
        return CommissionCalculator::checkRankUpgrade($currentSales, $newSales);
    }

    /**
     * Get user's vendor profile (if applicable)
     */
    public function getVendorProfile(int $userId): ?array
    {
        $user = $this->findById($userId);
        if (!$user || $user['role'] !== 'vendor') {
            return null;
        }

        $commissionInfo = $this->getCommissionInfo($userId);

        return [
            'vendor_id' => $user['vendor_id'],
            'store_name' => $user['profile_data']['store_name'] ?? null,
            'description' => $user['profile_data']['description'] ?? null,
            'contact_email' => $user['profile_data']['contact_email'] ?? $user['email'],
            'social_links' => $user['profile_data']['social_links'] ?? [],
            'commission_info' => $commissionInfo,
            'total_products' => $this->getProductCount($userId),
            'rating' => $this->getVendorRating($userId)
        ];
    }

    /**
     * Get product count for vendor
     */
    private function getProductCount(int $userId): int
    {
        $sql = "SELECT COUNT(*) as product_count FROM products WHERE vendor_id = :vendor_id AND is_active = true";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':vendor_id' => $userId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) $result['product_count'];
    }

    /**
     * Get vendor rating (average from orders)
     */
    private function getVendorRating(int $userId): ?float
    {
        $sql = "SELECT AVG(rating) as avg_rating FROM orders 
                WHERE vendor_id = :vendor_id AND rating IS NOT NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':vendor_id' => $userId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['avg_rating'] ? round((float) $result['avg_rating'], 2) : null;
    }

    /**
     * Search users (admin function)
     */
    public function searchUsers(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $whereConditions = ["is_active = true"];
        $params = [];
        $offset = ($page - 1) * $perPage;

        // Apply filters
        if (!empty($filters['email'])) {
            $whereConditions[] = "email ILIKE :email";
            $params[':email'] = '%' . $filters['email'] . '%';
        }

        if (!empty($filters['role'])) {
            $whereConditions[] = "role = :role";
            $params[':role'] = $filters['role'];
        }

        if (isset($filters['min_sales'])) {
            $whereConditions[] = "sales_count >= :min_sales";
            $params[':min_sales'] = $filters['min_sales'];
        }

        if (isset($filters['max_sales'])) {
            $whereConditions[] = "sales_count <= :max_sales";
            $params[':max_sales'] = $filters['max_sales'];
        }

        $whereClause = implode(' AND ', $whereConditions);

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM users WHERE {$whereClause}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get users
        $sql = "SELECT id, email, role, vendor_id, sales_count, total_revenue, created_at, updated_at, profile_data 
                FROM users 
                WHERE {$whereClause} 
                ORDER BY created_at DESC 
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $params[':limit'] = $perPage;
        $params[':offset'] = $offset;
        
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format response
        foreach ($users as &$user) {
            $user['profile_data'] = json_decode($user['profile_data'], true) ?? [];
            $user['current_rank'] = CommissionCalculator::getRank($user['sales_count']);
        }

        return [
            'users' => $users,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }

    /**
     * Deactivate user account
     */
    public function deactivate(int $userId): bool
    {
        $sql = "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $userId]);
    }

    /**
     * Check if email exists
     */
    private function emailExists(string $email): bool
    {
        $sql = "SELECT COUNT(*) as count FROM users WHERE email = :email";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':email' => $email]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] > 0;
    }

    /**
     * Load user data from array
     */
    private function loadFromArray(array $user): void
    {
        $this->id = $user['id'];
        $this->email = $user['email'];
        $this->passwordHash = $user['password_hash'];
        $this->role = $user['role'];
        $this->vendorId = $user['vendor_id'];
        $this->salesCount = $user['sales_count'];
        $this->totalRevenue = $user['total_revenue'];
        $this->createdAt = $user['created_at'];
        $this->updatedAt = $user['updated_at'];
        $this->isActive = $user['is_active'];
        $this->profileData = json_decode($user['profile_data'], true) ?? [];
    }

    /**
     * Convert user to array
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $this->role,
            'vendor_id' => $this->vendorId,
            'sales_count' => $this->salesCount,
            'total_revenue' => $this->totalRevenue,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
            'is_active' => $this->isActive,
            'profile_data' => $this->profileData
        ];
    }

    /**
     * Generate JWT token for user
     */
    public function generateAuthToken(): string
    {
        if (!$this->id) {
            throw new \Exception('User not loaded');
        }

        $userData = [
            'user_id' => $this->id,
            'email' => $this->email,
            'role' => $this->role,
            'vendor_id' => $this->vendorId
        ];

        return Security::generateToken($userData);
    }
}