<?php

namespace Tradefy\Controllers;

use Tradefy\Models\User;
use Tradefy\Utils\Security;
use PDO;
use Exception;

class AuthController
{
    private $userModel;
    private $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->userModel = new User($db);
    }

    /**
     * Register new user
     */
    public function register(array $data): array
    {
        try {
            // Validate required fields
            if (empty($data['email']) || empty($data['password'])) {
                return $this->errorResponse('Email and password are required', 400);
            }

            // Validate email format
            if (!Security::validateEmail($data['email'])) {
                return $this->errorResponse('Invalid email format', 400);
            }

            // Create user
            $userData = [
                'email' => Security::sanitizeInput($data['email']),
                'password' => $data['password'],
                'role' => Security::sanitizeInput($data['role'] ?? 'user'),
                'vendor_id' => isset($data['vendor_id']) ? (int) $data['vendor_id'] : null,
                'profile_data' => $data['profile_data'] ?? []
            ];

            $user = $this->userModel->create($userData);

            // Generate auth token
            $token = $this->userModel->generateAuthToken();

            return $this->successResponse([
                'user' => $this->formatUserResponse($user),
                'token' => $token,
                'message' => 'User registered successfully'
            ], 201);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Login user
     */
    public function login(array $data): array
    {
        try {
            // Validate required fields
            if (empty($data['email']) || empty($data['password'])) {
                return $this->errorResponse('Email and password are required', 400);
            }

            // Authenticate user
            $user = $this->userModel->authenticate(
                Security::sanitizeInput($data['email']),
                $data['password']
            );

            if (!$user) {
                return $this->errorResponse('Invalid email or password', 401);
            }

            // Generate auth token
            $token = $this->userModel->generateAuthToken();

            return $this->successResponse([
                'user' => $this->formatUserResponse($user),
                'token' => $token,
                'message' => 'Login successful'
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get current user profile
     */
    public function getProfile(array $userData): array
    {
        try {
            $user = $this->userModel->findById($userData['user_id']);

            if (!$user) {
                return $this->errorResponse('User not found', 404);
            }

            $response = $this->formatUserResponse($user);

            // Include vendor profile if user is a vendor
            if ($user['role'] === 'vendor') {
                $vendorProfile = $this->userModel->getVendorProfile($user['user_id']);
                if ($vendorProfile) {
                    $response['vendor_profile'] = $vendorProfile;
                }
            }

            return $this->successResponse(['user' => $response]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Update user profile
     */
    public function updateProfile(array $userData, array $updateData): array
    {
        try {
            // Only allow updating profile_data for now
            $allowedFields = ['profile_data'];
            $filteredData = array_intersect_key($updateData, array_flip($allowedFields));

            if (empty($filteredData)) {
                return $this->errorResponse('No valid fields to update', 400);
            }

            // Sanitize profile data if present
            if (isset($filteredData['profile_data'])) {
                $filteredData['profile_data'] = $this->sanitizeProfileData($filteredData['profile_data']);
            }

            $updatedUser = $this->userModel->updateProfile($userData['user_id'], $filteredData);

            return $this->successResponse([
                'user' => $this->formatUserResponse($updatedUser),
                'message' => 'Profile updated successfully'
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Change user password
     */
    public function changePassword(array $userData, array $passwordData): array
    {
        try {
            // Validate required fields
            if (empty($passwordData['current_password']) || empty($passwordData['new_password'])) {
                return $this->errorResponse('Current password and new password are required', 400);
            }

            $success = $this->userModel->updatePassword(
                $userData['user_id'],
                $passwordData['current_password'],
                $passwordData['new_password']
            );

            if ($success) {
                return $this->successResponse(['message' => 'Password updated successfully']);
            } else {
                return $this->errorResponse('Failed to update password', 500);
            }

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Refresh JWT token
     */
    public function refreshToken(array $userData): array
    {
        try {
            $user = $this->userModel->findById($userData['user_id']);

            if (!$user) {
                return $this->errorResponse('User not found', 404);
            }

            $newToken = $this->userModel->generateAuthToken();

            return $this->successResponse([
                'token' => $newToken,
                'message' => 'Token refreshed successfully'
            ]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get user's commission information
     */
    public function getCommissionInfo(array $userData): array
    {
        try {
            $commissionInfo = $this->userModel->getCommissionInfo($userData['user_id']);

            return $this->successResponse(['commission_info' => $commissionInfo]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Check if user can upgrade rank
     */
    public function checkRankUpgrade(array $userData): array
    {
        try {
            $upgradeInfo = $this->userModel->checkRankUpgrade($userData['user_id']);

            return $this->successResponse(['rank_upgrade' => $upgradeInfo]);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Validate JWT token (middleware function)
     */
    public function validateToken(string $token): array
    {
        try {
            $userData = Security::validateToken($token);

            // Verify user still exists and is active
            $user = $this->userModel->findById($userData['user_id']);
            if (!$user) {
                return $this->errorResponse('User not found', 404);
            }

            return $this->successResponse([
                'valid' => true,
                'user' => $this->formatUserResponse($user)
            ]);

        } catch (Exception $e) {
            return $this->errorResponse('Invalid token: ' . $e->getMessage(), 401);
        }
    }

    /**
     * Admin: Get all users (with pagination and filters)
     */
    public function getUsers(array $userData, array $filters = []): array
    {
        try {
            // Check if user is admin
            if ($userData['role'] !== 'admin') {
                return $this->errorResponse('Access denied. Admin role required.', 403);
            }

            $page = isset($filters['page']) ? (int) $filters['page'] : 1;
            $perPage = isset($filters['per_page']) ? (int) $filters['per_page'] : 20;

            // Remove pagination params from filters
            $searchFilters = array_diff_key($filters, array_flip(['page', 'per_page']));

            $result = $this->userModel->searchUsers($searchFilters, $page, $perPage);

            // Format users for response
            $result['users'] = array_map(function($user) {
                return $this->formatUserResponse($user);
            }, $result['users']);

            return $this->successResponse($result);

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Admin: Deactivate user
     */
    public function deactivateUser(array $userData, int $targetUserId): array
    {
        try {
            // Check if user is admin
            if ($userData['role'] !== 'admin') {
                return $this->errorResponse('Access denied. Admin role required.', 403);
            }

            // Prevent self-deactivation
            if ($userData['user_id'] === $targetUserId) {
                return $this->errorResponse('Cannot deactivate your own account', 400);
            }

            $success = $this->userModel->deactivate($targetUserId);

            if ($success) {
                return $this->successResponse(['message' => 'User deactivated successfully']);
            } else {
                return $this->errorResponse('Failed to deactivate user', 500);
            }

        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Format user response (remove sensitive data)
     */
    private function formatUserResponse(array $user): array
    {
        return [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'vendor_id' => $user['vendor_id'],
            'sales_count' => $user['sales_count'],
            'total_revenue' => (float) $user['total_revenue'],
            'profile_data' => $user['profile_data'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'is_active' => $user['is_active']
        ];
    }

    /**
     * Sanitize profile data
     */
    private function sanitizeProfileData(array $profileData): array
    {
        $sanitized = [];

        $allowedFields = [
            'store_name', 'description', 'contact_email', 'social_links',
            'first_name', 'last_name', 'phone', 'address', 'website'
        ];

        foreach ($profileData as $key => $value) {
            if (in_array($key, $allowedFields)) {
                if (is_array($value)) {
                    $sanitized[$key] = array_map([Security::class, 'sanitizeInput'], $value);
                } else {
                    $sanitized[$key] = Security::sanitizeInput($value);
                }
            }
        }

        return $sanitized;
    }

    /**
     * Success response formatter
     */
    private function successResponse(array $data, int $statusCode = 200): array
    {
        return [
            'success' => true,
            'status' => $statusCode,
            'data' => $data,
            'timestamp' => time()
        ];
    }

    /**
     * Error response formatter
     */
    private function errorResponse(string $message, int $statusCode = 500): array
    {
        return [
            'success' => false,
            'status' => $statusCode,
            'error' => [
                'message' => $message,
                'code' => $statusCode
            ],
            'timestamp' => time()
        ];
    }

    /**
     * Get request data from input
     */
    public function getInputData(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (strpos($contentType, 'application/json') !== false) {
            $input = file_get_contents('php://input');
            return json_decode($input, true) ?? [];
        }

        return $_POST;
    }

    /**
     * Send CORS headers if needed
     */
    public function handleCors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ($origin && in_array($origin, \Tradefy\Config\Settings::getAllowedOrigins())) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }
}