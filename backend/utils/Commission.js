const { config } = require('../config/platforms');

class Commission {
    constructor() {
        this.ranks = {
            'Bronze': { rate: 450, minSales: 0, name: 'Bronze' },
            'Silver': { rate: 425, minSales: 10, name: 'Silver' },
            'Gold': { rate: 400, minSales: 25, name: 'Gold' },
            'Platinum': { rate: 375, minSales: 50, name: 'Platinum' },
            'Diamond': { rate: 350, minSales: 100, name: 'Diamond' },
            'Magnat': { rate: 325, minSales: 250, name: 'Magnat' },
            'Senior': { rate: 300, minSales: 500, name: 'Senior' }
        };
    }

    /**
     * Calculer la commission pour une transaction
     */
    async calculateCommission(amount, vendorId, db = null) {
        try {
            // Obtenir le rang du vendeur
            let vendorRank = 'Bronze';
            if (db) {
                const userQuery = 'SELECT rank FROM users WHERE id = $1';
                const result = await db.query(userQuery, [vendorId]);
                if (result.rows.length > 0) {
                    vendorRank = result.rows[0].rank || 'Bronze';
                }
            }

            // Obtenir le taux de commission
            const rankInfo = this.ranks[vendorRank] || this.ranks['Bronze'];
            const commissionRate = rankInfo.rate; // en basis points
            
            // Calculer la commission
            const commissionAmount = (amount * commissionRate) / 10000;
            const netAmount = amount - commissionAmount;

            return {
                grossAmount: amount,
                commissionRate: commissionRate,
                commissionAmount: commissionAmount,
                netAmount: netAmount,
                vendorRank: vendorRank,
                rankInfo: rankInfo
            };

        } catch (error) {
            console.error('Calculate commission error:', error);
            throw error;
        }
    }

    /**
     * Obtenir le rang du vendeur basé sur ses ventes
     */
    getRankBySales(totalSales) {
        for (const [rankName, rankInfo] of Object.entries(this.ranks).reverse()) {
            if (totalSales >= rankInfo.minSales) {
                return {
                    name: rankName,
                    rate: rankInfo.rate,
                    minSales: rankInfo.minSales,
                    info: rankInfo
                };
            }
        }
        
        return {
            name: 'Bronze',
            rate: this.ranks['Bronze'].rate,
            minSales: 0,
            info: this.ranks['Bronze']
        };
    }

    /**
     * Mettre à jour le rang d'un vendeur
     */
    async updateVendorRank(vendorId, db) {
        try {
            // Obtenir les ventes totales du vendeur
            const salesQuery = 'SELECT total_sales FROM users WHERE id = $1';
            const salesResult = await db.query(salesQuery, [vendorId]);
            
            if (salesResult.rows.length === 0) {
                throw new Error('Vendeur non trouvé');
            }

            const totalSales = salesResult.rows[0].total_sales || 0;
            const newRank = this.getRankBySales(totalSales);

            // Mettre à jour le rang si nécessaire
            const updateQuery = `
                UPDATE users 
                SET rank = $1, commission_rate = $2, updated_at = $3
                WHERE id = $4 AND rank != $1
                RETURNING id, rank, commission_rate, total_sales
            `;

            const updateResult = await db.query(updateQuery, [
                newRank.name,
                newRank.rate,
                new Date(),
                vendorId
            ]);

            if (updateResult.rows.length > 0) {
                return {
                    updated: true,
                    newRank: newRank,
                    previousRank: salesResult.rows[0].rank,
                    vendor: updateResult.rows[0]
                };
            }

            return {
                updated: false,
                currentRank: newRank,
                vendor: salesResult.rows[0]
            };

        } catch (error) {
            console.error('Update vendor rank error:', error);
            throw error;
        }
    }

    /**
     * Obtenir tous les rangs disponibles
     */
    getAllRanks() {
        return this.ranks;
    }

    /**
     * Obtenir le rang suivant
     */
    getNextRank(currentRank) {
        const rankNames = Object.keys(this.ranks);
        const currentIndex = rankNames.indexOf(currentRank);
        
        if (currentIndex < rankNames.length - 1) {
            const nextRankName = rankNames[currentIndex + 1];
            return {
                name: nextRankName,
                ...this.ranks[nextRankName]
            };
        }
        
        return null; // Rang maximum atteint
    }

    /**
     * Calculer les ventes nécessaires pour le rang suivant
     */
    getSalesNeededForNextRank(currentRank, currentSales) {
        const nextRank = this.getNextRank(currentRank);
        
        if (!nextRank) {
            return {
                hasNextRank: false,
                salesNeeded: 0,
                message: 'Rang maximum atteint'
            };
        }

        const salesNeeded = Math.max(0, nextRank.minSales - currentSales);

        return {
            hasNextRank: true,
            nextRank: nextRank,
            salesNeeded: salesNeeded,
            message: salesNeeded > 0 
                ? `${salesNeeded} ventes supplémentaires pour atteindre le rang ${nextRank.name}`
                : 'Prêt pour une promotion!'
        };
    }

    /**
     * Calculer les statistiques de commission pour un vendeur
     */
    async getCommissionStats(vendorId, db, period = 'month') {
        try {
            let dateFilter = '';
            switch (period) {
                case 'day':
                    dateFilter = "AND created_at >= CURRENT_DATE";
                    break;
                case 'week':
                    dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
                    break;
                case 'month':
                    dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
                    break;
                case 'year':
                    dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '365 days'";
                    break;
            }

            const query = `
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(total_amount), 0) as total_revenue,
                    COALESCE(SUM(commission_amount), 0) as total_commissions,
                    COALESCE(AVG(commission_amount), 0) as average_commission,
                    MIN(commission_amount) as min_commission,
                    MAX(commission_amount) as max_commission
                FROM orders
                WHERE vendor_id = $1
                AND status = 'delivered'
                AND payment_status = 'paid'
                ${dateFilter}
            `;

            const result = await db.query(query, [vendorId]);
            return result.rows[0];

        } catch (error) {
            console.error('Get commission stats error:', error);
            throw error;
        }
    }

    /**
     * Calculer l'évolution des commissions
     */
    async getCommissionEvolution(vendorId, db, days = 30) {
        try {
            const query = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as order_count,
                    COALESCE(SUM(total_amount), 0) as daily_revenue,
                    COALESCE(SUM(commission_amount), 0) as daily_commission,
                    COALESCE(AVG(commission_amount), 0) as average_commission
                FROM orders
                WHERE vendor_id = $1
                AND status = 'delivered'
                AND payment_status = 'paid'
                AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `;

            const result = await db.query(query, [vendorId]);
            return result.rows;

        } catch (error) {
            console.error('Get commission evolution error:', error);
            throw error;
        }
    }

    /**
     * Obtenir le classement des vendeurs par commissions
     */
    async getTopVendorsByCommissions(db, limit = 10, period = 'month') {
        try {
            let dateFilter = '';
            switch (period) {
                case 'day':
                    dateFilter = "AND o.created_at >= CURRENT_DATE";
                    break;
                case 'week':
                    dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'";
                    break;
                case 'month':
                    dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'";
                    break;
                case 'year':
                    dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '365 days'";
                    break;
            }

            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.full_name,
                    u.rank,
                    u.commission_rate,
                    COUNT(o.id) as total_orders,
                    COALESCE(SUM(o.total_amount), 0) as total_revenue,
                    COALESCE(SUM(o.commission_amount), 0) as total_commissions,
                    COALESCE(AVG(o.commission_amount), 0) as average_commission,
                    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(o.commission_amount), 0) DESC) as position
                FROM users u
                INNER JOIN orders o ON u.id = o.vendor_id
                WHERE u.role = 'vendor'
                AND u.status = 'active'
                AND o.status = 'delivered'
                AND o.payment_status = 'paid'
                ${dateFilter}
                GROUP BY u.id, u.username, u.full_name, u.rank, u.commission_rate
                ORDER BY total_commissions DESC
                LIMIT $1
            `;

            const result = await db.query(query, [limit]);
            return result.rows;

        } catch (error) {
            console.error('Get top vendors error:', error);
            throw error;
        }
    }

    /**
     * Calculer les économies pour un client basées sur les commissions
     */
    calculateCustomerSavings(amount, vendorRank) {
        const rankInfo = this.ranks[vendorRank] || this.ranks['Bronze'];
        const commissionRate = rankInfo.rate;
        const commissionAmount = (amount * commissionRate) / 10000;
        
        return {
            originalAmount: amount,
            commissionRate: commissionRate,
            commissionAmount: commissionAmount,
            vendorEarnings: amount - commissionAmount,
            platformFee: commissionAmount,
            savings: 0 // Pas d'économies directes pour le client
        };
    }

    /**
     * Valider un taux de commission
     */
    validateCommissionRate(rate) {
        const minRate = 300; // 3%
        const maxRate = 500; // 5%
        
        if (typeof rate !== 'number') {
            return {
                valid: false,
                message: 'Le taux de commission doit être un nombre'
            };
        }
        
        if (rate < minRate || rate > maxRate) {
            return {
                valid: false,
                message: `Le taux de commission doit être entre ${minRate} et ${maxRate} basis points`
            };
        }
        
        return { valid: true };
    }

    /**
     * Obtenir les bénéfices de la plateforme
     */
    async getPlatformCommissionStats(db, period = 'month') {
        try {
            let dateFilter = '';
            switch (period) {
                case 'day':
                    dateFilter = "AND created_at >= CURRENT_DATE";
                    break;
                case 'week':
                    dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
                    break;
                case 'month':
                    dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
                    break;
                case 'year':
                    dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '365 days'";
                    break;
            }

            const query = `
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(total_amount), 0) as total_revenue,
                    COALESCE(SUM(commission_amount), 0) as total_commissions,
                    COALESCE(AVG(commission_amount), 0) as average_commission,
                    COUNT(DISTINCT vendor_id) as active_vendors,
                    COUNT(DISTINCT customer_id) as unique_customers
                FROM orders
                WHERE status = 'delivered'
                AND payment_status = 'paid'
                ${dateFilter}
            `;

            const result = await db.query(query);
            return result.rows[0];

        } catch (error) {
            console.error('Get platform commission stats error:', error);
            throw error;
        }
    }

    /**
     * Simuler l'impact d'un changement de commission
     */
    simulateCommissionChange(vendorId, newRate, db) {
        // Cette méthode permet de simuler l'impact d'un changement de taux
        // pour un vendeur spécifique
        
        return {
            vendorId: vendorId,
            currentRate: this.ranks['Bronze'].rate, // Simplifié
            newRate: newRate,
            impact: {
                commissionDifference: newRate - this.ranks['Bronze'].rate,
                percentageChange: ((newRate - this.ranks['Bronze'].rate) / this.ranks['Bronze'].rate) * 100,
                recommendation: this.getCommissionChangeRecommendation(newRate)
            }
        };
    }

    /**
     * Obtenir une recommandation pour un changement de commission
     */
    getCommissionChangeRecommendation(newRate) {
        const currentStandardRate = this.ranks['Bronze'].rate;
        
        if (newRate < currentStandardRate - 50) {
            return 'Réduction significative - peut attirer plus de vendeurs';
        } else if (newRate < currentStandardRate) {
            return 'Réduction modérée - compétitive';
        } else if (newRate === currentStandardRate) {
            return 'Taux standard - équilibré';
        } else if (newRate <= currentStandardRate + 50) {
            return 'Augmentation modérée - plus de revenus pour la plateforme';
        } else {
            return 'Augmentation significative - risque de perdre des vendeurs';
        }
    }
}

module.exports = Commission;
