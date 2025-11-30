const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validateUser, validateUserUpdate } = require('../../utils/Validators');

/**
 * Modèle pour la gestion des utilisateurs
 */
class User {
    constructor(db) {
        this.db = db;
        this.saltRounds = 12;
    }

    /**
     * Créer un nouvel utilisateur
     */
    async create(userData) {
        try {
            // Valider les données
            const validation = validateUser(userData);
            if (!validation.valid) {
                throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
            }

            // Vérifier si l'email existe déjà
            const existingEmail = await this.findByEmail(userData.email);
            if (existingEmail) {
                throw new Error('Cet email est déjà utilisé');
            }

            // Vérifier si le username existe déjà
            const existingUsername = await this.findByUsername(userData.username);
            if (existingUsername) {
                throw new Error('Ce nom d\'utilisateur est déjà utilisé');
            }

            // Hasher le mot de passe
            const passwordHash = await bcrypt.hash(userData.password, this.saltRounds);

            // Définir le rang par défaut
            const rank = userData.rank || 'Bronze';
            const commissionRate = this.getCommissionRate(rank);

            const query = `
                INSERT INTO users (
                    email, username, password_hash, full_name, phone, role,
                    status, rank, commission_rate, avatar_url, bio, gamification_points,
                    total_sales, total_revenue, average_order_value, customer_rating,
                    email_verified_at, last_login_at, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17, $18, $19, $20
                ) RETURNING id, email, username, full_name, phone, role, status, rank,
                          commission_rate, avatar_url, bio, gamification_points,
                          total_sales, total_revenue, average_order_value, customer_rating,
                          email_verified_at, last_login_at, created_at, updated_at
            `;

            const values = [
                userData.email,
                userData.username,
                passwordHash,
                userData.full_name,
                userData.phone,
                userData.role || 'customer',
                userData.status || 'active',
                rank,
                commissionRate,
                userData.avatar_url,
                userData.bio,
                0, // gamification_points
                0, // total_sales
                0, // total_revenue
                0, // average_order_value
                0, // customer_rating
                userData.email_verified_at || null,
                null, // last_login_at
                new Date(),
                new Date()
            ];

            const result = await this.db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la création de l\'utilisateur:', error);
            throw error;
        }
    }

    /**
     * Obtenir un utilisateur par ID
     */
    async findById(userId) {
        try {
            const query = `
                SELECT id, email, username, password_hash, full_name, phone, role,
                       status, rank, commission_rate, avatar_url, bio, gamification_points,
                       total_sales, total_revenue, average_order_value, customer_rating,
                       email_verified_at, last_login_at, deactivation_reason,
                       deactivated_at, created_at, updated_at
                FROM users
                WHERE id = $1 AND deleted_at IS NULL
            `;

            const result = await this.db.query(query, [userId]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la recherche de l\'utilisateur:', error);
            throw error;
        }
    }

    /**
     * Obtenir un utilisateur par email
     */
    async findByEmail(email) {
        try {
            const query = `
                SELECT id, email, username, password_hash, full_name, phone, role,
                       status, rank, commission_rate, avatar_url, bio, gamification_points,
                       total_sales, total_revenue, average_order_value, customer_rating,
                       email_verified_at, last_login_at, created_at, updated_at
                FROM users
                WHERE email = $1 AND deleted_at IS NULL
            `;

            const result = await this.db.query(query, [email]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la recherche par email:', error);
            throw error;
        }
    }

    /**
     * Obtenir un utilisateur par username
     */
    async findByUsername(username) {
        try {
            const query = `
                SELECT id, email, username, password_hash, full_name, phone, role,
                       status, rank, commission_rate, avatar_url, bio, gamification_points,
                       total_sales, total_revenue, average_order_value, customer_rating,
                       email_verified_at, last_login_at, created_at, updated_at
                FROM users
                WHERE username = $1 AND deleted_at IS NULL
            `;

            const result = await this.db.query(query, [username]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la recherche par username:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour un utilisateur
     */
    async update(userId, updateData) {
        try {
            const fields = [];
            const values = [];
            let paramIndex = 1;

            // Construire dynamiquement la requête
            for (const [key, value] of Object.entries(updateData)) {
                if (key !== 'id' && key !== 'password_hash') {
                    fields.push(`${key} = $${paramIndex++}`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                throw new Error('Aucun champ à mettre à jour');
            }

            fields.push(`updated_at = $${paramIndex++}`);
            values.push(new Date());

            values.push(userId);

            const query = `
                UPDATE users 
                SET ${fields.join(', ')}
                WHERE id = $${paramIndex} AND deleted_at IS NULL
                RETURNING id, email, username, full_name, phone, role, status, rank,
                          commission_rate, avatar_url, bio, gamification_points,
                          total_sales, total_revenue, average_order_value, customer_rating,
                          email_verified_at, last_login_at, created_at, updated_at
            `;

            const result = await this.db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le mot de passe
     */
    async updatePassword(userId, newPasswordHash) {
        try {
            const query = `
                UPDATE users 
                SET password_hash = $1, updated_at = $2
                WHERE id = $3 AND deleted_at IS NULL
                RETURNING id, email, username
            `;

            const result = await this.db.query(query, [newPasswordHash, new Date(), userId]);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour du mot de passe:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le statut
     */
    async updateStatus(userId, newStatus) {
        try {
            const query = `
                UPDATE users 
                SET status = $1, updated_at = $2
                WHERE id = $3 AND deleted_at IS NULL
                RETURNING id, email, username, status
            `;

            const result = await this.db.query(query, [newStatus, new Date(), userId]);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le rang
     */
    async updateRank(userId, newRank, newCommissionRate) {
        try {
            const query = `
                UPDATE users 
                SET rank = $1, commission_rate = $2, updated_at = $3
                WHERE id = $4 AND deleted_at IS NULL
                RETURNING id, email, username, rank, commission_rate
            `;

            const result = await this.db.query(query, [newRank, newCommissionRate, new Date(), userId]);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour du rang:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour les statistiques de ventes
     */
    async updateSalesStats(userId, salesData) {
        try {
            const query = `
                UPDATE users 
                SET total_sales = total_sales + $1,
                    total_revenue = total_revenue + $2,
                    average_order_value = CASE 
                        WHEN total_sales = 0 THEN $2
                        ELSE (total_revenue + $2) / (total_sales + $1)
                    END,
                    updated_at = $3
                WHERE id = $4 AND deleted_at IS NULL
                RETURNING id, total_sales, total_revenue, average_order_value
            `;

            const result = await this.db.query(query, [
                salesData.total_orders || 1,
                salesData.total_spent || 0,
                new Date(),
                userId
            ]);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour des statistiques de ventes:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour la note client
     */
    async updateCustomerRating(userId, newRating) {
        try {
            const query = `
                UPDATE users 
                SET customer_rating = $1, updated_at = $2
                WHERE id = $3 AND deleted_at IS NULL
                RETURNING id, customer_rating
            `;

            const result = await this.db.query(query, [newRating, new Date(), userId]);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour de la note client:', error);
            throw error;
        }
    }

    /**
     * Obtenir les meilleurs vendeurs
     */
    async getTopVendors(limit = 10) {
        try {
            const query = `
                SELECT id, username, full_name, avatar_url, rank, commission_rate,
                       total_sales, total_revenue, average_order_value, customer_rating,
                       gamification_points
                FROM users
                WHERE role = 'vendor' AND status = 'active' AND deleted_at IS NULL
                ORDER BY total_sales DESC, total_revenue DESC, customer_rating DESC
                LIMIT $1
            `;

            const result = await this.db.query(query, [limit]);
            return result.rows;

        } catch (error) {
            console.error('Erreur lors de la récupération des meilleurs vendeurs:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques d'un utilisateur
     */
    async getUserStats(userId) {
        try {
            const query = `
                SELECT 
                    u.*,
                    COUNT(p.id) as total_products,
                    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_products,
                    COUNT(o.id) as total_orders,
                    COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_orders,
                    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as total_revenue
                FROM users u
                LEFT JOIN products p ON u.id = p.vendor_id AND p.deleted_at IS NULL
                LEFT JOIN orders o ON u.id = o.vendor_id
                WHERE u.id = $1 AND u.deleted_at IS NULL
                GROUP BY u.id
            `;

            const result = await this.db.query(query, [userId]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
            throw error;
        }
    }

    /**
     * Obtenir les utilisateurs avec pagination
     */
    async getUsersWithPagination(filters = {}, page = 1, perPage = 20) {
        try {
            const limit = perPage;
            const offset = (page - 1) * perPage;

            let whereClause = 'WHERE deleted_at IS NULL';
            const params = [];
            let paramIndex = 1;

            // Filtres
            if (filters.role) {
                whereClause += ` AND role = $${paramIndex++}`;
                params.push(filters.role);
            }

            if (filters.status) {
                whereClause += ` AND status = $${paramIndex++}`;
                params.push(filters.status);
            }

            if (filters.rank) {
                whereClause += ` AND rank = $${paramIndex++}`;
                params.push(filters.rank);
            }

            if (filters.search) {
                whereClause += ` AND (
                    username ILIKE $${paramIndex} OR 
                    full_name ILIKE $${paramIndex} OR 
                    email ILIKE $${paramIndex}
                )`;
                params.push(`%${filters.search}%`);
                paramIndex++;
            }

            // Tri
            let orderClause = 'ORDER BY';
            const sortBy = filters.sort_by || 'created_at';
            const sortOrder = filters.sort_order || 'DESC';

            const allowedSortFields = ['username', 'full_name', 'email', 'role', 'status', 'rank', 'created_at', 'total_sales'];
            if (allowedSortFields.includes(sortBy)) {
                orderClause += ` u.${sortBy} ${sortOrder}`;
            } else {
                orderClause += ` u.created_at DESC`;
            }

            const query = `
                SELECT id, email, username, full_name, phone, role, status, rank,
                       commission_rate, avatar_url, bio, gamification_points,
                       total_sales, total_revenue, average_order_value, customer_rating,
                       email_verified_at, last_login_at, created_at, updated_at
                FROM users u
                ${whereClause}
                ${orderClause}
                LIMIT $${paramIndex++} OFFSET $${paramIndex}
            `;

            params.push(limit, offset);

            const result = await this.db.query(query, params);

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total FROM users ${whereClause}
            `;
            const countResult = await this.db.query(countQuery, params.slice(0, -2));
            const total = parseInt(countResult.rows[0].total);

            return {
                users: result.rows,
                pagination: {
                    page: page,
                    per_page: perPage,
                    total: total,
                    pages: Math.ceil(total / perPage)
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            throw error;
        }
    }

    /**
     * Désactiver un utilisateur
     */
    async deactivateUser(userId, reason) {
        try {
            const query = `
                UPDATE users 
                SET status = 'inactive', 
                    deactivation_reason = $1,
                    deactivated_at = $2,
                    updated_at = $3
                WHERE id = $4 AND deleted_at IS NULL
                RETURNING id, email, username, status, deactivation_reason
            `;

            const result = await this.db.query(query, [reason, new Date(), new Date(), userId]);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la désactivation de l\'utilisateur:', error);
            throw error;
        }
    }

    /**
     * Supprimer un utilisateur (soft delete)
     */
    async delete(userId) {
        try {
            const query = `
                UPDATE users 
                SET deleted_at = $1, updated_at = $2
                WHERE id = $3
            `;

            await this.db.query(query, [new Date(), new Date(), userId]);

        } catch (error) {
            console.error('Erreur lors de la suppression de l\'utilisateur:', error);
            throw error;
        }
    }

    /**
     * Vérifier si un email est unique
     */
    async checkEmailUnique(email, excludeUserId = null) {
        try {
            let query = 'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL';
            let params = [email];

            if (excludeUserId) {
                query += ' AND id != $2';
                params.push(excludeUserId);
            }

            const result = await this.db.query(query, params);
            
            return {
                isUnique: result.rows.length === 0,
                existingUserId: result.rows.length > 0 ? result.rows[0].id : null
            };

        } catch (error) {
            console.error('Erreur lors de la vérification de l\'email:', error);
            return { isUnique: false, error: error.message };
        }
    }

    /**
     * Vérifier si un username est unique
     */
    async checkUsernameUnique(username, excludeUserId = null) {
        try {
            let query = 'SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL';
            let params = [username];

            if (excludeUserId) {
                query += ' AND id != $2';
                params.push(excludeUserId);
            }

            const result = await this.db.query(query, params);
            
            return {
                isUnique: result.rows.length === 0,
                existingUserId: result.rows.length > 0 ? result.rows[0].id : null
            };

        } catch (error) {
            console.error('Erreur lors de la vérification du username:', error);
            return { isUnique: false, error: error.message };
        }
    }

    /**
     * Mettre à jour la date de dernière connexion
     */
    async updateLastLogin(userId) {
        try {
            const query = `
                UPDATE users 
                SET last_login_at = $1, updated_at = $2
                WHERE id = $3 AND deleted_at IS NULL
            `;

            await this.db.query(query, [new Date(), new Date(), userId]);

        } catch (error) {
            console.error('Erreur lors de la mise à jour de la dernière connexion:', error);
        }
    }

    /**
     * Vérifier le mot de passe
     */
    async verifyPassword(userId, password) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                return false;
            }

            return await bcrypt.compare(password, user.password_hash);

        } catch (error) {
            console.error('Erreur lors de la vérification du mot de passe:', error);
            return false;
        }
    }

    /**
     * Générer un token JWT
     */
    generateToken(user, tokenType = 'access') {
        try {
            const { config } = require('../../config/platforms');
            const secret = config.security.jwtSecret;
            const expiresIn = tokenType === 'refresh' ? config.security.refreshExpiresIn : config.security.jwtExpiresIn;

            const payload = {
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                tokenType: tokenType
            };

            return jwt.sign(payload, secret, { expiresIn });

        } catch (error) {
            console.error('Erreur lors de la génération du token:', error);
            throw error;
        }
    }

    /**
     * Vérifier un token JWT
     */
    verifyToken(token) {
        try {
            const { config } = require('../../config/platforms');
            const secret = config.security.jwtSecret;

            return jwt.verify(token, secret);

        } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
            return null;
        }
    }

    /**
     * Obtenir le taux de commission pour un rang
     */
    getCommissionRate(rank) {
        const commissionRates = {
            'Bronze': 450,    // 4.5%
            'Silver': 425,    // 4.25%
            'Gold': 400,      // 4.0%
            'Platinum': 375,  // 3.75%
            'Diamond': 350,   // 3.5%
            'Magnat': 325,    // 3.25%
            'Senior': 300     // 3.0%
        };

        return commissionRates[rank] || 450; // Bronze par défaut
    }

    /**
     * Calculer le rang basé sur les ventes
     */
    calculateRank(totalSales) {
        if (totalSales >= 1000) return 'Senior';
        if (totalSales >= 500) return 'Magnat';
        if (totalSales >= 250) return 'Diamond';
        if (totalSales >= 100) return 'Platinum';
        if (totalSales >= 50) return 'Gold';
        if (totalSales >= 20) return 'Silver';
        return 'Bronze';
    }

    /**
     * Mettre à jour automatiquement le rang
     */
    async updateRankAutomatically(userId) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            const newRank = this.calculateRank(user.total_sales);
            
            if (newRank !== user.rank) {
                const newCommissionRate = this.getCommissionRate(newRank);
                await this.updateRank(userId, newRank, newCommissionRate);
                
                return {
                    oldRank: user.rank,
                    newRank: newRank,
                    oldCommissionRate: user.commission_rate,
                    newCommissionRate: newCommissionRate
                };
            }

            return null;

        } catch (error) {
            console.error('Erreur lors de la mise à jour automatique du rang:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques globales des utilisateurs
     */
    async getGlobalStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
                    COUNT(CASE WHEN role = 'vendor' THEN 1 END) as vendors,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                    COUNT(CASE WHEN email_verified_at IS NOT NULL THEN 1 END) as verified_users,
                    COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_active_users
                FROM users
                WHERE deleted_at IS NULL
            `;

            const result = await this.db.query(query);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques globales:', error);
            throw error;
        }
    }
}

module.exports = User;
