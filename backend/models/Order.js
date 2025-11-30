const { config, getDatabaseConfig } = require('../config/platforms');

class Order {
    constructor(db) {
        this.db = db;
    }

    /**
     * Créer une nouvelle commande
     */
    async create(orderData) {
        const query = `
            INSERT INTO orders (
                order_number, customer_id, vendor_id, status, currency,
                subtotal, tax_amount, shipping_amount, total_amount,
                commission_amount, payment_status, payment_method, payment_id,
                shipping_address, billing_address, notes, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `;
        
        const values = [
            orderData.order_number,
            orderData.customer_id,
            orderData.vendor_id,
            orderData.status,
            orderData.currency,
            orderData.subtotal,
            orderData.tax_amount,
            orderData.shipping_amount,
            orderData.total_amount,
            orderData.commission_amount,
            orderData.payment_status,
            orderData.payment_method,
            orderData.payment_id,
            JSON.stringify(orderData.shipping_address),
            JSON.stringify(orderData.billing_address),
            orderData.notes,
            orderData.created_at,
            orderData.updated_at
        ];
        
        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Create order error:', error);
            throw error;
        }
    }

    /**
     * Créer une ligne de commande
     */
    async createOrderItem(itemData) {
        const query = `
            INSERT INTO order_items (
                order_id, product_id, quantity, unit_price, total_price, product_snapshot, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const values = [
            itemData.order_id,
            itemData.product_id,
            itemData.quantity,
            itemData.unit_price,
            itemData.total_price,
            JSON.stringify(itemData.product_snapshot),
            itemData.created_at
        ];
        
        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Create order item error:', error);
            throw error;
        }
    }

    /**
     * Trouver une commande par ID
     */
    async findById(id) {
        const query = 'SELECT * FROM orders WHERE id = $1';
        
        try {
            const result = await this.db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find order by ID error:', error);
            throw error;
        }
    }

    /**
     * Trouver une commande par ID avec détails
     */
    async findByIdWithDetails(id) {
        const query = `
            SELECT 
                o.*,
                c.username as customer_name,
                c.full_name as customer_full_name,
                c.email as customer_email,
                v.username as vendor_name,
                v.full_name as vendor_full_name,
                v.email as vendor_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN users v ON o.vendor_id = v.id
            WHERE o.id = $1
        `;
        
        try {
            const result = await this.db.query(query, [id]);
            const order = result.rows[0] || null;
            
            if (order) {
                // Parser les adresses
                order.shipping_address = typeof order.shipping_address === 'string' 
                    ? JSON.parse(order.shipping_address) 
                    : order.shipping_address;
                order.billing_address = typeof order.billing_address === 'string' 
                    ? JSON.parse(order.billing_address) 
                    : order.billing_address;
                    
                // Récupérer les items
                order.items = await this.getOrderItems(order.id);
            }
            
            return order;
        } catch (error) {
            console.error('Find order with details error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour une commande
     */
    async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Construire dynamiquement la requête
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                if (key === 'shipping_address' || key === 'billing_address') {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(updateData[key]));
                } else {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(updateData[key]);
                }
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        // Ajouter updated_at
        fields.push(`updated_at = $${paramIndex}`);
        values.push(new Date());
        paramIndex++;

        // Ajouter l'ID
        values.push(id);

        const query = `
            UPDATE orders 
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Update order error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les commandes avec filtres
     */
    async getOrdersWithDetails(filters = {}, limit = 20, offset = 0) {
        let query = `
            SELECT 
                o.*,
                c.username as customer_name,
                c.full_name as customer_full_name,
                v.username as vendor_name,
                v.full_name as vendor_full_name,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN users v ON o.vendor_id = v.id
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        // Appliquer les filtres
        if (filters.customer_id) {
            query += ` AND o.customer_id = $${paramIndex}`;
            values.push(filters.customer_id);
            paramIndex++;
        }

        if (filters.vendor_id) {
            query += ` AND o.vendor_id = $${paramIndex}`;
            values.push(filters.vendor_id);
            paramIndex++;
        }

        if (filters.status) {
            query += ` AND o.status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.payment_status) {
            query += ` AND o.payment_status = $${paramIndex}`;
            values.push(filters.payment_status);
            paramIndex++;
        }

        if (filters.start_date) {
            query += ` AND o.created_at >= $${paramIndex}`;
            values.push(filters.start_date);
            paramIndex++;
        }

        if (filters.end_date) {
            query += ` AND o.created_at <= $${paramIndex}`;
            values.push(filters.end_date);
            paramIndex++;
        }

        // Ordre
        query += ` ORDER BY o.created_at DESC`;

        // Pagination
        query += ` LIMIT $${paramIndex}`;
        values.push(limit);
        paramIndex++;

        query += ` OFFSET $${paramIndex}`;
        values.push(offset);

        try {
            const result = await this.db.query(query, values);
            const orders = result.rows;
            
            // Parser les adresses et ajouter les items pour chaque commande
            for (const order of orders) {
                order.shipping_address = typeof order.shipping_address === 'string' 
                    ? JSON.parse(order.shipping_address) 
                    : order.shipping_address;
                order.billing_address = typeof order.billing_address === 'string' 
                    ? JSON.parse(order.billing_address) 
                    : order.billing_address;
                    
                // Récupérer les items (limité pour éviter trop de requêtes)
                order.items = await this.getOrderItems(order.id);
            }
            
            return orders;
        } catch (error) {
            console.error('Get orders with details error:', error);
            throw error;
        }
    }

    /**
     * Compter les commandes
     */
    async count(filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM orders WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        // Appliquer les mêmes filtres que getOrdersWithDetails()
        if (filters.customer_id) {
            query += ` AND customer_id = $${paramIndex}`;
            values.push(filters.customer_id);
            paramIndex++;
        }

        if (filters.vendor_id) {
            query += ` AND vendor_id = $${paramIndex}`;
            values.push(filters.vendor_id);
            paramIndex++;
        }

        if (filters.status) {
            query += ` AND status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.payment_status) {
            query += ` AND payment_status = $${paramIndex}`;
            values.push(filters.payment_status);
            paramIndex++;
        }

        if (filters.start_date) {
            query += ` AND created_at >= $${paramIndex}`;
            values.push(filters.start_date);
            paramIndex++;
        }

        if (filters.end_date) {
            query += ` AND created_at <= $${paramIndex}`;
            values.push(filters.end_date);
            paramIndex++;
        }

        try {
            const result = await this.db.query(query, values);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Count orders error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les items d'une commande
     */
    async getOrderItems(orderId) {
        const query = `
            SELECT 
                oi.*,
                p.name as current_product_name,
                p.status as current_product_status
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
            ORDER BY oi.id ASC
        `;
        
        try {
            const result = await this.db.query(query, [orderId]);
            const items = result.rows;
            
            // Parser les snapshots
            for (const item of items) {
                item.product_snapshot = typeof item.product_snapshot === 'string' 
                    ? JSON.parse(item.product_snapshot) 
                    : item.product_snapshot;
            }
            
            return items;
        } catch (error) {
            console.error('Get order items error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le stock d'un produit
     */
    async updateProductStock(productId, quantityChange) {
        const query = `
            UPDATE products 
            SET inventory_quantity = inventory_quantity + $1, updated_at = $2
            WHERE id = $3 AND track_inventory = true
            RETURNING id, inventory_quantity
        `;
        
        try {
            const result = await this.db.query(query, [quantityChange, new Date(), productId]);
            return result.rows[0];
        } catch (error) {
            console.error('Update product stock error:', error);
            throw error;
        }
    }

    /**
     * Obtenir un produit par ID
     */
    async getProductById(productId) {
        const query = 'SELECT * FROM products WHERE id = $1';
        
        try {
            const result = await this.db.query(query, [productId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Get product by ID error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les commandes récentes
     */
    async getRecentOrders(limit = 50) {
        const query = `
            SELECT 
                o.*,
                c.username as customer_name,
                v.username as vendor_name
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN users v ON o.vendor_id = v.id
            ORDER BY o.created_at DESC
            LIMIT $1
        `;
        
        try {
            const result = await this.db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Get recent orders error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques du vendeur
     */
    async getVendorStats(vendorId) {
        const query = `
            SELECT 
                COUNT(*) as total_orders,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
                COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
                COUNT(*) FILTER (WHERE status = 'shipped') as shipped_orders,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0) as paid_revenue,
                COALESCE(AVG(total_amount), 0) as average_order_value,
                COALESCE(SUM(commission_amount), 0) as total_commissions,
                MIN(created_at) as first_order_date,
                MAX(created_at) as last_order_date
            FROM orders
            WHERE vendor_id = $1
        `;
        
        try {
            const result = await this.db.query(query, [vendorId]);
            return result.rows[0];
        } catch (error) {
            console.error('Get vendor stats error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour les totaux du vendeur
     */
    async updateVendorTotals(vendorId, amount) {
        const query = `
            UPDATE users 
            SET 
                total_sales = COALESCE(total_sales, 0) + 1,
                total_revenue = COALESCE(total_revenue, 0) + $1,
                updated_at = $2
            WHERE id = $3
            RETURNING id, total_sales, total_revenue
        `;
        
        try {
            const result = await this.db.query(query, [amount, new Date(), vendorId]);
            return result.rows[0];
        } catch (error) {
            console.error('Update vendor totals error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour les statistiques quotidiennes du vendeur
     */
    async updateVendorDailyStats(vendorId, amount) {
        const today = new Date().toISOString().split('T')[0];
        
        const query = `
            INSERT INTO vendor_stats (vendor_id, date, total_orders, total_revenue, total_products, average_order_value, created_at, updated_at)
            VALUES ($1, $2, 1, $3, 0, $3, $4, $4)
            ON CONFLICT (vendor_id, date)
            DO UPDATE SET
                total_orders = vendor_stats.total_orders + 1,
                total_revenue = vendor_stats.total_revenue + $3,
                average_order_value = vendor_stats.total_revenue / vendor_stats.total_orders,
                updated_at = $4
            RETURNING *
        `;
        
        try {
            const result = await this.db.query(query, [vendorId, today, amount, new Date()]);
            return result.rows[0];
        } catch (error) {
            console.error('Update vendor daily stats error:', error);
            throw error;
        }
    }

    /**
     * Créer un avis
     */
    async createReview(reviewData) {
        const query = `
            INSERT INTO reviews (
                product_id, order_id, customer_id, rating, title, content, is_verified, is_public, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const values = [
            reviewData.product_id,
            reviewData.order_id,
            reviewData.customer_id,
            reviewData.rating,
            reviewData.title,
            reviewData.content,
            reviewData.is_verified || false,
            reviewData.is_public !== false,
            reviewData.created_at,
            reviewData.updated_at
        ];
        
        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Create review error:', error);
            throw error;
        }
    }

    /**
     * Obtenir l'avis d'une commande
     */
    async getOrderReview(orderId) {
        const query = 'SELECT * FROM reviews WHERE order_id = $1';
        
        try {
            const result = await this.db.query(query, [orderId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Get order review error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les commandes par statut de paiement
     */
    async getOrdersByPaymentStatus(paymentStatus, limit = 50) {
        const query = `
            SELECT 
                o.*,
                c.username as customer_name,
                v.username as vendor_name
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN users v ON o.vendor_id = v.id
            WHERE o.payment_status = $1
            ORDER BY o.created_at DESC
            LIMIT $2
        `;
        
        try {
            const result = await this.db.query(query, [paymentStatus, limit]);
            return result.rows;
        } catch (error) {
            console.error('Get orders by payment status error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les commandes en retard
     */
    async getOverdueOrders(limit = 50) {
        const query = `
            SELECT 
                o.*,
                c.username as customer_name,
                v.username as vendor_name,
                EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_since_creation
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN users v ON o.vendor_id = v.id
            WHERE o.status IN ('pending', 'confirmed', 'processing')
            AND o.created_at < NOW() - INTERVAL '48 hours'
            ORDER BY o.created_at ASC
            LIMIT $1
        `;
        
        try {
            const result = await this.db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Get overdue orders error:', error);
            throw error;
        }
    }

    /**
     * Calculer les revenus par période
     */
    async getRevenueByPeriod(vendorId, startDate, endDate) {
        const query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as order_count,
                COALESCE(SUM(total_amount), 0) as daily_revenue,
                COALESCE(AVG(total_amount), 0) as average_order_value
            FROM orders
            WHERE vendor_id = $1
            AND created_at BETWEEN $2 AND $3
            AND status = 'delivered'
            AND payment_status = 'paid'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;
        
        try {
            const result = await this.db.query(query, [vendorId, startDate, endDate]);
            return result.rows;
        } catch (error) {
            console.error('Get revenue by period error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les produits les plus vendus pour un vendeur
     */
    async getTopSellingProducts(vendorId, limit = 10) {
        const query = `
            SELECT 
                p.id,
                p.name,
                p.price,
                COUNT(oi.id) as times_sold,
                COALESCE(SUM(oi.quantity), 0) as total_quantity,
                COALESCE(SUM(oi.total_price), 0) as total_revenue
            FROM products p
            INNER JOIN order_items oi ON p.id = oi.product_id
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE p.vendor_id = $1
            AND o.status = 'delivered'
            AND o.payment_status = 'paid'
            GROUP BY p.id, p.name, p.price
            ORDER BY total_revenue DESC
            LIMIT $2
        `;
        
        try {
            const result = await this.db.query(query, [vendorId, limit]);
            return result.rows;
        } catch (error) {
            console.error('Get top selling products error:', error);
            throw error;
        }
    }
}

module.exports = Order;
