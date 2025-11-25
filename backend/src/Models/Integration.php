<?php

namespace Tradefy\Models;

use PDO;
use Tradefy\Utils\Security;
use Exception;

class Integration
{
    private $db;
    private $id;
    private $userId;
    private $type;
    private $name;
    private $config;
    private $isActive;
    private $lastSync;
    private $createdAt;
    private $updatedAt;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Create new integration
     */
    public function create(array $integrationData): array
    {
        // Validate required fields
        $required = ['user_id', 'type', 'name', 'config'];
        foreach ($required as $field) {
            if (empty($integrationData[$field])) {
                throw new Exception("Field {$field} is required");
            }
        }

        // Validate integration type
        $validTypes = ['email', 'analytics', 'crm', 'payment', 'shipping', 'custom'];
        if (!in_array($integrationData['type'], $validTypes)) {
            throw new Exception("Invalid integration type. Valid types: " . implode(', ', $validTypes));
        }

        $sql = "INSERT INTO integrations 
                (user_id, type, name, config, is_active, created_at, updated_at) 
                VALUES 
                (:user_id, :type, :name, :config, :is_active, NOW(), NOW())
                RETURNING *";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $integrationData['user_id'],
            ':type' => $integrationData['type'],
            ':name' => Security::sanitizeInput($integrationData['name']),
            ':config' => json_encode($integrationData['config']),
            ':is_active' => $integrationData['is_active'] ?? true
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->loadFromArray($result);

        return $this->toArray();
    }

    /**
     * Find integration by ID
     */
    public function findById(int $integrationId): ?array
    {
        $sql = "SELECT i.*, u.email as user_email
                FROM integrations i
                LEFT JOIN users u ON i.user_id = u.id
                WHERE i.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $integrationId]);
        
        $integration = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$integration) {
            return null;
        }

        $this->loadFromArray($integration);
        return $this->toArray();
    }

    /**
     * Find integrations by user
     */
    public function findByUser(int $userId, string $type = null): array
    {
        $whereConditions = ["user_id = :user_id"];
        $params = [':user_id' => $userId];

        if ($type) {
            $whereConditions[] = "type = :type";
            $params[':type'] = $type;
        }

        $whereClause = implode(' AND ', $whereConditions);

        $sql = "SELECT * FROM integrations 
                WHERE {$whereClause}
                ORDER BY created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $integrations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function($integration) {
            $this->loadFromArray($integration);
            return $this->toArray();
        }, $integrations);
    }

    /**
     * Update integration
     */
    public function update(int $integrationId, int $userId, array $updateData): array
    {
        // Verify integration exists and belongs to user
        $integration = $this->findById($integrationId);
        if (!$integration || $integration['user_id'] !== $userId) {
            throw new Exception('Integration not found or access denied');
        }

        $allowedFields = ['name', 'config', 'is_active'];
        $updates = [];
        $params = [':id' => $integrationId];

        foreach ($updateData as $field => $value) {
            if (in_array($field, $allowedFields)) {
                if ($field === 'config') {
                    $updates[] = "config = :config";
                    $params[':config'] = json_encode($value);
                } else {
                    $updates[] = "{$field} = :{$field}";
                    $params[":{$field}"] = $value;
                }
            }
        }

        if (empty($updates)) {
            throw new Exception('No valid fields to update');
        }

        $updates[] = "updated_at = NOW()";
        $sql = "UPDATE integrations SET " . implode(', ', $updates) . " WHERE id = :id RETURNING *";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $updatedIntegration = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$updatedIntegration) {
            throw new Exception('Failed to update integration');
        }

        $this->loadFromArray($updatedIntegration);
        return $this->toArray();
    }

    /**
     * Delete integration
     */
    public function delete(int $integrationId, int $userId): bool
    {
        // Verify integration exists and belongs to user
        $integration = $this->findById($integrationId);
        if (!$integration || $integration['user_id'] !== $userId) {
            throw new Exception('Integration not found or access denied');
        }

        $sql = "DELETE FROM integrations WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $integrationId]);
    }

    /**
     * Test integration connection
     */
    public function testConnection(int $integrationId, int $userId): array
    {
        $integration = $this->findById($integrationId);
        if (!$integration || $integration['user_id'] !== $userId) {
            throw new Exception('Integration not found or access denied');
        }

        $config = $integration['config'];
        $type = $integration['type'];

        try {
            switch ($type) {
                case 'email':
                    $result = $this->testEmailIntegration($config);
                    break;
                case 'analytics':
                    $result = $this->testAnalyticsIntegration($config);
                    break;
                case 'crm':
                    $result = $this->testCrmIntegration($config);
                    break;
                case 'payment':
                    $result = $this->testPaymentIntegration($config);
                    break;
                case 'shipping':
                    $result = $this->testShippingIntegration($config);
                    break;
                default:
                    $result = ['success' => true, 'message' => 'Custom integration - connection test not available'];
            }

            // Update last sync time
            $this->updateLastSync($integrationId);

            return $result;

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection test failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Test email integration
     */
    private function testEmailIntegration(array $config): array
    {
        // Validate required config
        $required = ['smtp_host', 'smtp_port', 'username', 'password'];
        foreach ($required as $field) {
            if (empty($config[$field])) {
                throw new Exception("Missing required email configuration: {$field}");
            }
        }

        // Test SMTP connection (simplified - in production would actually connect)
        $host = $config['smtp_host'];
        $port = $config['smtp_port'];

        // Simulate connection test
        if (!filter_var($host, FILTER_VALIDATE_DOMAIN)) {
            throw new Exception('Invalid SMTP host');
        }

        if ($port < 1 || $port > 65535) {
            throw new Exception('Invalid SMTP port');
        }

        return [
            'success' => true,
            'message' => 'Email integration configured successfully',
            'details' => [
                'host' => $host,
                'port' => $port,
                'encryption' => $config['encryption'] ?? 'tls'
            ]
        ];
    }

    /**
     * Test analytics integration
     */
    private function testAnalyticsIntegration(array $config): array
    {
        if (empty($config['tracking_id'])) {
            throw new Exception('Missing tracking ID for analytics integration');
        }

        return [
            'success' => true,
            'message' => 'Analytics integration configured successfully',
            'details' => [
                'tracking_id' => $config['tracking_id'],
                'type' => $config['type'] ?? 'google_analytics'
            ]
        ];
    }

    /**
     * Test CRM integration
     */
    private function testCrmIntegration(array $config): array
    {
        if (empty($config['api_key']) || empty($config['base_url'])) {
            throw new Exception('Missing API key or base URL for CRM integration');
        }

        // Simulate API test
        return [
            'success' => true,
            'message' => 'CRM integration configured successfully',
            'details' => [
                'base_url' => $config['base_url'],
                'crm_type' => $config['crm_type'] ?? 'custom'
            ]
        ];
    }

    /**
     * Test payment integration
     */
    private function testPaymentIntegration(array $config): array
    {
        if (empty($config['api_key']) || empty($config['secret_key'])) {
            throw new Exception('Missing API credentials for payment integration');
        }

        return [
            'success' => true,
            'message' => 'Payment integration configured successfully',
            'details' => [
                'provider' => $config['provider'] ?? 'custom',
                'test_mode' => $config['test_mode'] ?? false
            ]
        ];
    }

    /**
     * Test shipping integration
     */
    private function testShippingIntegration(array $config): array
    {
        if (empty($config['api_key']) || empty($config['carrier'])) {
            throw new Exception('Missing API key or carrier for shipping integration');
        }

        return [
            'success' => true,
            'message' => 'Shipping integration configured successfully',
            'details' => [
                'carrier' => $config['carrier'],
                'test_mode' => $config['test_mode'] ?? false
            ]
        ];
    }

    /**
     * Update last sync time
     */
    private function updateLastSync(int $integrationId): bool
    {
        $sql = "UPDATE integrations SET last_sync = NOW(), updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $integrationId]);
    }

    /**
     * Get integration statistics for user
     */
    public function getUserStats(int $userId): array
    {
        $sql = "SELECT 
                type,
                COUNT(*) as total,
                SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
                MAX(last_sync) as last_sync
                FROM integrations 
                WHERE user_id = :user_id
                GROUP BY type";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalIntegrations = 0;
        $activeIntegrations = 0;

        foreach ($stats as $stat) {
            $totalIntegrations += $stat['total'];
            $activeIntegrations += $stat['active'];
        }

        return [
            'total_integrations' => $totalIntegrations,
            'active_integrations' => $activeIntegrations,
            'inactive_integrations' => $totalIntegrations - $activeIntegrations,
            'by_type' => $stats
        ];
    }

    /**
     * Get available integration types
     */
    public function getAvailableTypes(): array
    {
        return [
            [
                'type' => 'email',
                'name' => 'Email Service',
                'description' => 'Connect your email service for notifications',
                'config_fields' => [
                    'smtp_host' => ['type' => 'text', 'required' => true],
                    'smtp_port' => ['type' => 'number', 'required' => true],
                    'username' => ['type' => 'text', 'required' => true],
                    'password' => ['type' => 'password', 'required' => true],
                    'encryption' => ['type' => 'select', 'options' => ['tls', 'ssl']]
                ]
            ],
            [
                'type' => 'analytics',
                'name' => 'Analytics',
                'description' => 'Integrate with analytics platforms',
                'config_fields' => [
                    'tracking_id' => ['type' => 'text', 'required' => true],
                    'type' => ['type' => 'select', 'options' => ['google_analytics', 'custom']]
                ]
            ],
            [
                'type' => 'crm',
                'name' => 'CRM System',
                'description' => 'Connect with your CRM system',
                'config_fields' => [
                    'api_key' => ['type' => 'text', 'required' => true],
                    'base_url' => ['type' => 'text', 'required' => true],
                    'crm_type' => ['type' => 'select', 'options' => ['salesforce', 'hubspot', 'custom']]
                ]
            ],
            [
                'type' => 'payment',
                'name' => 'Payment Gateway',
                'description' => 'Additional payment gateway integration',
                'config_fields' => [
                    'api_key' => ['type' => 'text', 'required' => true],
                    'secret_key' => ['type' => 'text', 'required' => true],
                    'provider' => ['type' => 'select', 'options' => ['stripe', 'paypal', 'custom']],
                    'test_mode' => ['type' => 'checkbox']
                ]
            ],
            [
                'type' => 'shipping',
                'name' => 'Shipping Provider',
                'description' => 'Integrate with shipping carriers',
                'config_fields' => [
                    'api_key' => ['type' => 'text', 'required' => true],
                    'carrier' => ['type' => 'select', 'options' => ['ups', 'fedex', 'dhl', 'custom']],
                    'test_mode' => ['type' => 'checkbox']
                ]
            ]
        ];
    }

    /**
     * Load integration data from array
     */
    private function loadFromArray(array $integration): void
    {
        $this->id = $integration['id'];
        $this->userId = $integration['user_id'];
        $this->type = $integration['type'];
        $this->name = $integration['name'];
        $this->config = json_decode($integration['config'], true) ?? [];
        $this->isActive = (bool) $integration['is_active'];
        $this->lastSync = $integration['last_sync'];
        $this->createdAt = $integration['created_at'];
        $this->updatedAt = $integration['updated_at'];
    }

    /**
     * Convert integration to array
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->userId,
            'type' => $this->type,
            'name' => $this->name,
            'config' => $this->config,
            'is_active' => $this->isActive,
            'last_sync' => $this->lastSync,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt
        ];
    }
}