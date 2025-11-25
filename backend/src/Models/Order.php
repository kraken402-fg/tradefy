<?php

namespace Tradefy\Models;

use PDO;
use Exception;

class Order
{
    private $db;
    private $id;
    private $customerId;
    private $vendorId;
    private $productId;
    private $externalId;
    private $status;
    private $quantity;
    private $unitPrice;
    private $totalAmount;
    private $currency;
    private $commissionRate;
    private $platformFee;
    private $vendorAmount;
    private $customerEmail;
    private $customerData;
    private $productData;
    private $paymentMethod;
    private $paymentStatus;
    private $payoutStatus;
    private $rating;
    private $review;
    private $createdAt;
    private $updatedAt;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Create new order
     */
    public function create(array $orderData): array
    {
        // Validate required fields
        $required = ['customer_id', 'vendor_id', 'product_id', 'quantity', 'unit_price', 'total_amount'];
        foreach ($required as $field) {
            if (empty($orderData[$field])) {
                throw new Exception("Field {$field} is required");
            }
        }

        // Generate external ID
        $externalId = 'ord_' . uniqid();

        $sql = "INSERT INTO orders 
                (customer_id, vendor_id, product_id, external_id, status, quantity, 
                 unit_price, total_amount, currency, commission_rate, platform_fee, 
                 vendor_amount, customer_email, customer_data, product_data, 
                 payment_method, payment_status, payout_status, created_at, updated_at) 
                VALUES 
                (:customer_id, :vendor_id, :product_id, :external_id, 'pending', :quantity,
                 :unit_price, :total_amount, :currency, :commission_rate, :platform_fee,
                 :vendor_amount, :customer_email, :customer_data, :product_data,
                 :payment_method, 'pending', 'pending', NOW(), NOW())
                RETURNING *";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':customer_id' => $orderData['customer_id'],
            ':vendor_id' => $orderData['vendor_id'],
            ':product_id' => $orderData['product_id'],
            ':external_id' => $externalId,
            ':quantity' => $orderData['quantity'],
            ':unit_price' => $orderData['unit_price'],
            ':total_amount' => $orderData['total_amount'],
            ':currency' => $orderData['currency'] ?? 'USD',
            ':commission_rate' => $orderData['commission_rate'] ?? 0,
            ':platform_fee' => $orderData['platform_fee'] ?? 0,
            ':vendor_amount' => $orderData['vendor_amount'] ?? 0,
            ':customer_email' => $orderData['customer_email'] ?? '',
            ':customer_data' => json_encode($orderData['customer_data'] ?? []),
            ':product_data' => json_encode($orderData['product_data'] ?? []),
            ':payment_method' => $orderData['payment_method'] ?? 'moneroo'
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->loadFromArray($result);

        return $this->toArray();
    }

    /**
     * Find order by ID
     */
    public function findById(int $orderId): ?array
    {
        $sql = "SELECT o.*, 
                p.name as product_name,
                v.email as vendor_email,
                c.email as customer_email
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN users v ON o.vendor_id = v.id
                LEFT JOIN users c ON o.customer_id = c.id
                WHERE o.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $orderId]);
        
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return null;
        }

        $this->loadFromArray($order);
        return $this->toArray();
    }

    /**
     * Find order by external ID
     */
    public function findByExternalId(string $externalId): ?array
    {
        $sql = "SELECT o.*, 
                p.name as product_name,
                v.email as vendor_email,
                c.email as customer_email
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN users v ON o.vendor_id = v.id
                LEFT JOIN users c ON o.customer_id = c.id
                WHERE o.external_id = :external_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':external_id' => $externalId]);
        
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return null;
        }

        $this->loadFromArray($order);
        return $this->toArray();
    }

    /**
     * Get orders by customer
     */
    public function findByCustomer(int $customerId, int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM orders WHERE customer_id = :customer_id";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute([':customer_id' => $customerId]);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get orders
        $sql = "SELECT o.*, 
                p.name as product_name,
                v.email as vendor_email,
                v.profile_data as vendor_profile
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN users v ON o.vendor_id = v.id
                WHERE o.customer_id = :customer_id
                ORDER BY o.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':customer_id', $customerId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format orders
        $formattedOrders = array_map(function($order) {
            $this->loadFromArray($order);
            return $this->toArray();
        }, $orders);

        return [
            'orders' => $formattedOrders,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }

    /**
     * Get orders by vendor
     */
    public function findByVendor(int $vendorId, int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM orders WHERE vendor_id = :vendor_id";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute([':vendor_id' => $vendorId]);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get orders
        $sql = "SELECT o.*, 
                p.name as product_name,
                c.email as customer_email,
                c.profile_data as customer_profile
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN users c ON o.customer_id = c.id
                WHERE o.vendor_id = :vendor_id
                ORDER BY o.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':vendor_id', $vendorId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format orders
        $formattedOrders = array_map(function($order) {
            $this->loadFromArray($order);
            return $this->toArray();
        }, $orders);

        return [
            'orders' => $formattedOrders,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }

    /**
     * Update order status
     */
    public function updateStatus(int $orderId, string $status, string $type = 'status'): bool
    {
        $validStatuses = ['pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded'];
        $validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
        $validPayoutStatuses = ['pending', 'processing', 'paid', 'failed'];

        $field = 'status';
        $validValues = $validStatuses;

        if ($type === 'payment') {
            $field = 'payment_status';
            $validValues = $validPaymentStatuses;
        } elseif ($type === 'payout') {
            $field = 'payout_status';
            $validValues = $validPayoutStatuses;
        }

        if (!in_array($status, $validValues)) {
            throw new Exception("Invalid {$field}: {$status}");
        }

        $sql = "UPDATE orders SET {$field} = :status, updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':status' => $status,
            ':id' => $orderId
        ]);
    }

    /**
     * Process successful payment
     */
    public function processPayment(string $externalId): array
    {
        $order = $this->findByExternalId($externalId);
        if (!$order) {
            throw new Exception('Order not found');
        }

        // Update payment status
        $this->updateStatus($order['id'], 'paid', 'payment');
        $this->updateStatus($order['id'], 'processing', 'status');

        // Decrement product stock if physical product
        $productModel = new Product($this->db);
        $product = $productModel->findById($order['product_id']);
        
        if ($product && !$product['is_digital']) {
            $productModel->decrementStock($order['product_id'], $order['quantity']);
        }

        // Record sale for vendor (for commission system)
        $userModel = new User($this->db);
        $userModel->recordSale($order['vendor_id'], $order['total_amount']);

        // Get updated order
        $updatedOrder = $this->findById($order['id']);

        return [
            'success' => true,
            'order' => $updatedOrder,
            'message' => 'Payment processed successfully'
        ];
    }

    /**
     * Add rating and review to order
     */
    public function addReview(int $orderId, int $customerId, int $rating, string $review = ''): array
    {
        // Verify order exists and belongs to customer
        $order = $this->findById($orderId);
        if (!$order || $order['customer_id'] !== $customerId) {
            throw new Exception('Order not found or access denied');
        }

        // Verify order is completed
        if ($order['status'] !== 'completed') {
            throw new Exception('Can only review completed orders');
        }

        // Validate rating
        if ($rating < 1 || $rating > 5) {
            throw new Exception('Rating must be between 1 and 5');
        }

        $sql = "UPDATE orders SET rating = :rating, review = :review, updated_at = NOW() 
                WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([
            ':rating' => $rating,
            ':review' => $review,
            ':id' => $orderId
        ]);

        if ($success) {
            $updatedOrder = $this->findById($orderId);
            return [
                'success' => true,
                'order' => $updatedOrder,
                'message' => 'Review added successfully'
            ];
        }

        throw new Exception('Failed to add review');
    }

    /**
     * Get order statistics for vendor
     */
    public function getVendorStats(int $vendorId): array
    {
        $sql = "SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(total_amount) as total_revenue,
                AVG(rating) as average_rating,
                COUNT(rating) as total_reviews
                FROM orders 
                WHERE vendor_id = :vendor_id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':vendor_id' => $vendorId]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total_orders' => (int) $stats['total_orders'],
            'completed_orders' => (int) $stats['completed_orders'],
            'pending_orders' => (int) $stats['pending_orders'],
            'total_revenue' => (float) ($stats['total_revenue'] ?? 0),
            'average_rating' => $stats['average_rating'] ? round((float) $stats['average_rating'], 2) : null,
            'total_reviews' => (int) $stats['total_reviews']
        ];
    }

    /**
     * Get recent orders with pagination
     */
    public function getRecentOrders(int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT o.*, 
                p.name as product_name,
                v.email as vendor_email,
                c.email as customer_email
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN users v ON o.vendor_id = v.id
                LEFT JOIN users c ON o.customer_id = c.id
                ORDER BY o.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function($order) {
            $this->loadFromArray($order);
            return $this->toArray();
        }, $orders);
    }

    /**
     * Load order data from array
     */
    private function loadFromArray(array $order): void
    {
        $this->id = $order['id'];
        $this->customerId = $order['customer_id'];
        $this->vendorId = $order['vendor_id'];
        $this->productId = $order['product_id'];
        $this->externalId = $order['external_id'];
        $this->status = $order['status'];
        $this->quantity = (int) $order['quantity'];
        $this->unitPrice = (float) $order['unit_price'];
        $this->totalAmount = (float) $order['total_amount'];
        $this->currency = $order['currency'];
        $this->commissionRate = (int) $order['commission_rate'];
        $this->platformFee = (float) $order['platform_fee'];
        $this->vendorAmount = (float) $order['vendor_amount'];
        $this->customerEmail = $order['customer_email'];
        $this->customerData = json_decode($order['customer_data'], true) ?? [];
        $this->productData = json_decode($order['product_data'], true) ?? [];
        $this->paymentMethod = $order['payment_method'];
        $this->paymentStatus = $order['payment_status'];
        $this->payoutStatus = $order['payout_status'];
        $this->rating = $order['rating'] ? (int) $order['rating'] : null;
        $this->review = $order['review'];
        $this->createdAt = $order['created_at'];
        $this->updatedAt = $order['updated_at'];
    }

    /**
     * Convert order to array
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customerId,
            'vendor_id' => $this->vendorId,
            'product_id' => $this->productId,
            'external_id' => $this->externalId,
            'status' => $this->status,
            'quantity' => $this->quantity,
            'unit_price' => $this->unitPrice,
            'total_amount' => $this->totalAmount,
            'currency' => $this->currency,
            'commission_rate' => $this->commissionRate,
            'platform_fee' => $this->platformFee,
            'vendor_amount' => $this->vendorAmount,
            'customer_email' => $this->customerEmail,
            'customer_data' => $this->customerData,
            'product_data' => $this->productData,
            'payment_method' => $this->paymentMethod,
            'payment_status' => $this->paymentStatus,
            'payout_status' => $this->payoutStatus,
            'rating' => $this->rating,
            'review' => $this->review,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt
        ];
    }
}

