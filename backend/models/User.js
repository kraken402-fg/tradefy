const { config, getDatabaseConfig } = require('../config/platforms');

class User {
    constructor(db) {
        this.db = db;
    }

    /**
     * Créer un nouvel utilisateur
     */
    async create(userData) {
        const query = `
            INSERT INTO users (
                email, password, username, full_name, phone, 
                role, status, commission_rate, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const values = [
            userData.email,
            userData.password,
            userData.username,
            userData.full_name,
            userData.phone,
            userData.role,
            userData.status,
            userData.commission_rate,
            userData.created_at,
            userData.updated_at
        ];
        
        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }

    /**
     * Trouver un utilisateur par ID
     */
    async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1 AND status = $2';
        
        try {
            const result = await this.db.query(query, [id, 'active']);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find user by ID error:', error);
            throw error;
        }
    }

    /**
     * Trouver un utilisateur par email
     */
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        
        try {
            const result = await this.db.query(query, [email.toLowerCase()]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find user by email error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour un utilisateur
     */
    async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Construire dynamiquement la requête
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(updateData[key]);
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
            UPDATE users 
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le mot de passe
     */
    async updatePassword(id, hashedPassword) {
        const query = `
            UPDATE users 
            SET password = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, email, updated_at
        `;
        
        try {
            const result = await this.db.query(query, [hashedPassword, new Date(), id]);
            return result.rows[0];
        } catch (error) {
            console.error('Update password error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le statut
     */
    async updateStatus(id, status) {
        const query = `
            UPDATE users 
            SET status = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, email, status, updated_at
        `;
        
        try {
            const result = await this.db.query(query, [status, new Date(), id]);
            return result.rows[0];
        } catch (error) {
            console.error('Update status error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour la dernière connexion
     */
    async updateLastLogin(id) {
        const query = `
            UPDATE users 
            SET last_login = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, last_login
        `;
        
        try {
            const result = await this.db.query(query, [new Date(), new Date(), id]);
            return result.rows[0];
        } catch (error) {
            console.error('Update last login error:', error);
            throw error;
        }
    }

    /**
     * Obtenir tous les utilisateurs (avec filtres)
     */
    async getAll(filters = {}) {
        let query = 'SELECT * FROM users WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        // Appliquer les filtres
        if (filters.status) {
            query += ` AND status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.role) {
            query += ` AND role = $${paramIndex}`;
            values.push(filters.role);
            paramIndex++;
        }

        if (filters.search) {
            query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`;
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        // Ordre
        query += ' ORDER BY created_at DESC';

        // Pagination
        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(filters.limit);
            paramIndex++;
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex}`;
            values.push(filters.offset);
        }

        try {
            const result = await this.db.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Get all users error:', error);
            throw error;
        }
    }

    /**
     * Compter le nombre total d'utilisateurs
     */
    async count(filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        // Appliquer les filtres
        if (filters.status) {
            query += ` AND status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.role) {
            query += ` AND role = $${paramIndex}`;
            values.push(filters.role);
            paramIndex++;
        }

        try {
            const result = await this.db.query(query, values);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Count users error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour les statistiques de vente
     */
    async updateSalesStats(id, amount) {
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
            const result = await this.db.query(query, [amount, new Date(), id]);
            return result.rows[0];
        } catch (error) {
            console.error('Update sales stats error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le rang de l'utilisateur
     */
    async updateRank(id, newRank) {
        const query = `
            UPDATE users 
            SET rank = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, rank, updated_at
        `;
        
        try {
            const result = await this.db.query(query, [newRank, new Date(), id]);
            return result.rows[0];
        } catch (error) {
            console.error('Update rank error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les meilleurs vendeurs
     */
    async getTopVendors(limit = 10, period = 'month') {
        let dateCondition = '';
        
        switch (period) {
            case 'week':
                dateCondition = "AND o.created_at >= NOW() - INTERVAL '7 days'";
                break;
            case 'month':
                dateCondition = "AND o.created_at >= NOW() - INTERVAL '30 days'";
                break;
            case 'year':
                dateCondition = "AND o.created_at >= NOW() - INTERVAL '365 days'";
                break;
            default:
                dateCondition = '';
        }

        const query = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.rank,
                COUNT(o.id) as total_orders,
                COALESCE(SUM(o.total_amount), 0) as total_revenue
            FROM users u
            LEFT JOIN orders o ON u.id = o.vendor_id AND o.status = 'completed' ${dateCondition}
            WHERE u.role = 'vendor' AND u.status = 'active'
            GROUP BY u.id, u.username, u.full_name, u.rank
            ORDER BY total_revenue DESC
            LIMIT $1
        `;
        
        try {
            const result = await this.db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Get top vendors error:', error);
            throw error;
        }
    }

    /**
     * Vérifier si un email existe déjà
     */
    async emailExists(email, excludeId = null) {
        let query = 'SELECT id FROM users WHERE email = $1';
        const values = [email.toLowerCase()];
        
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        
        try {
            const result = await this.db.query(query, values);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Check email exists error:', error);
            throw error;
        }
    }

    /**
     * Vérifier si un nom d'utilisateur existe déjà
     */
    async usernameExists(username, excludeId = null) {
        let query = 'SELECT id FROM users WHERE username = $1';
        const values = [username];
        
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        
        try {
            const result = await this.db.query(query, values);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Check username exists error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques d'un utilisateur
     */
    async getStats(id) {
        const query = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.rank,
                u.commission_rate,
                u.total_sales,
                u.total_revenue,
                u.created_at,
                u.last_login,
                COUNT(DISTINCT o.id) as total_orders,
                COUNT(DISTINCT p.id) as total_products,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as total_reviews
            FROM users u
            LEFT JOIN orders o ON u.id = o.vendor_id
            LEFT JOIN products p ON u.id = p.vendor_id
            LEFT JOIN reviews r ON p.id = r.product_id
            WHERE u.id = $1
            GROUP BY u.id, u.username, u.full_name, u.rank, u.commission_rate, u.total_sales, u.total_revenue, u.created_at, u.last_login
        `;
        
        try {
            const result = await this.db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Get user stats error:', error);
            throw error;
        }
    }

    /**
     * Désactiver un utilisateur (soft delete)
     */
    async deactivate(id) {
        const query = `
            UPDATE users 
            SET status = 'inactive', updated_at = $1
            WHERE id = $2
            RETURNING id, email, status, updated_at
        `;
        
        try {
            const result = await this.db.query(query, [new Date(), id]);
            return result.rows[0];
        } catch (error) {
            console.error('Deactivate user error:', error);
            throw error;
        }
    }

    /**
     * Réactiver un utilisateur
     */
    async reactivate(id) {
        const query = `
            UPDATE users 
            SET status = 'active', updated_at = $1
            WHERE id = $2
            RETURNING id, email, status, updated_at
        `;
        
        try {
            const result = await this.db.query(query, [new Date(), id]);
            return result.rows[0];
        } catch (error) {
            console.error('Reactivate user error:', error);
            throw error;
        }
    }
}

module.exports = User;
