const { config, isProduction } = require('../config/platforms');

class GamificationService {
    constructor(db) {
        this.db = db;
        this.achievements = {
            'first_sale': {
                id: 'first_sale',
                name: 'Première Vente',
                description: 'Effectuez votre première vente',
                points: 100,
                badge_url: '/assets/badges/first-sale.png',
                condition: 'total_sales >= 1'
            },
            'ten_sales': {
                id: 'ten_sales',
                name: 'Vendeur Actif',
                description: 'Effectuez 10 ventes',
                points: 250,
                badge_url: '/assets/badges/ten-sales.png',
                condition: 'total_sales >= 10'
            },
            'fifty_sales': {
                id: 'fifty_sales',
                name: 'Vendeur Expérimenté',
                description: 'Effectuez 50 ventes',
                points: 500,
                badge_url: '/assets/badges/fifty-sales.png',
                condition: 'total_sales >= 50'
            },
            'hundred_sales': {
                id: 'hundred_sales',
                name: 'Vendeur Expert',
                description: 'Effectuez 100 ventes',
                points: 1000,
                badge_url: '/assets/badges/hundred-sales.png',
                condition: 'total_sales >= 100'
            },
            'silver_rank': {
                id: 'silver_rank',
                name: 'Rang Silver',
                description: 'Atteignez le rang Silver',
                points: 300,
                badge_url: '/assets/badges/silver-rank.png',
                condition: 'rank = "Silver"'
            },
            'gold_rank': {
                id: 'gold_rank',
                name: 'Rang Gold',
                description: 'Atteignez le rang Gold',
                points: 500,
                badge_url: '/assets/badges/gold-rank.png',
                condition: 'rank = "Gold"'
            },
            'platinum_rank': {
                id: 'platinum_rank',
                name: 'Rang Platinum',
                description: 'Atteignez le rang Platinum',
                points: 750,
                badge_url: '/assets/badges/platinum-rank.png',
                condition: 'rank = "Platinum"'
            },
            'diamond_rank': {
                id: 'diamond_rank',
                name: 'Rang Diamond',
                description: 'Atteignez le rang Diamond',
                points: 1000,
                badge_url: '/assets/badges/diamond-rank.png',
                condition: 'rank = "Diamond"'
            },
            'perfect_rating': {
                id: 'perfect_rating',
                name: 'Note Parfaite',
                description: 'Obtenez une note de 5 étoiles',
                points: 150,
                badge_url: '/assets/badges/perfect-rating.png',
                condition: 'average_rating >= 5'
            },
            'top_vendor': {
                id: 'top_vendor',
                name: 'Meilleur Vendeur',
                description: 'Soyez dans le top 10 des vendeurs',
                points: 500,
                badge_url: '/assets/badges/top-vendor.png',
                condition: 'leaderboard_position <= 10'
            }
        };
    }

    /**
     * Vérifier et débloquer les achievements pour un utilisateur
     */
    async checkAndUnlockAchievements(userId) {
        try {
            // Obtenir les statistiques de l'utilisateur
            const userStats = await this.getUserStats(userId);
            const unlockedAchievements = [];

            // Vérifier chaque achievement
            for (const [achievementId, achievement] of Object.entries(this.achievements)) {
                // Vérifier si déjà débloqué
                const isAlreadyUnlocked = await this.isAchievementUnlocked(userId, achievementId);
                if (isAlreadyUnlocked) {
                    continue;
                }

                // Vérifier si la condition est remplie
                if (this.checkAchievementCondition(achievement.condition, userStats)) {
                    await this.unlockAchievement(userId, achievementId, achievement);
                    unlockedAchievements.push(achievement);
                }
            }

            return {
                success: true,
                unlockedAchievements: unlockedAchievements,
                totalPoints: unlockedAchievements.reduce((sum, a) => sum + a.points, 0)
            };

        } catch (error) {
            console.error('Check and unlock achievements error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques d'un utilisateur
     */
    async getUserStats(userId) {
        const query = `
            SELECT 
                u.id,
                u.username,
                u.rank,
                u.total_sales,
                u.total_revenue,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT o.id) as order_count,
                COALESCE(SUM(o.total_amount), 0) as total_order_amount,
                (SELECT COUNT(*) FROM achievements WHERE user_id = u.id) as achievements_count,
                (SELECT COALESCE(SUM(points), 0) FROM achievements WHERE user_id = u.id) as total_points,
                -- Position dans le classement
                (SELECT position FROM (
                    SELECT 
                        u.id,
                        ROW_NUMBER() OVER (ORDER BY u.total_revenue DESC) as position
                    FROM users u 
                    WHERE u.role = 'vendor' AND u.status = 'active'
                ) ranked WHERE ranked.id = u.id) as leaderboard_position
            FROM users u
            LEFT JOIN orders o ON u.id = o.vendor_id AND o.status = 'delivered'
            LEFT JOIN reviews r ON u.id = r.product_vendor_id
            WHERE u.id = $1
            GROUP BY u.id, u.username, u.rank, u.total_sales, u.total_revenue
        `;

        try {
            const result = await this.db.query(query, [userId]);
            return result.rows[0] || {};
        } catch (error) {
            console.error('Get user stats error:', error);
            throw error;
        }
    }

    /**
     * Vérifier si un achievement est déjà débloqué
     */
    async isAchievementUnlocked(userId, achievementId) {
        const query = 'SELECT id FROM achievements WHERE user_id = $1 AND type = $2';
        
        try {
            const result = await this.db.query(query, [userId, achievementId]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Check achievement unlocked error:', error);
            throw error;
        }
    }

    /**
     * Débloquer un achievement
     */
    async unlockAchievement(userId, achievementId, achievementData) {
        const query = `
            INSERT INTO achievements (
                user_id, type, title, description, points, badge_url, unlocked_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            userId,
            achievementId,
            achievementData.name,
            achievementData.description,
            achievementData.points,
            achievementData.badge_url,
            new Date(),
            new Date()
        ];

        try {
            const result = await this.db.query(query, values);
            
            // Mettre à jour les points de l'utilisateur
            await this.updateUserPoints(userId, achievementData.points);
            
            // Créer une notification
            await this.createAchievementNotification(userId, achievementData);
            
            return result.rows[0];
        } catch (error) {
            console.error('Unlock achievement error:', error);
            throw error;
        }
    }

    /**
     * Vérifier la condition d'un achievement
     */
    checkAchievementCondition(condition, userStats) {
        try {
            // Remplacer les variables dans la condition
            const conditionWithValues = condition
                .replace(/total_sales/g, userStats.total_sales || 0)
                .replace(/total_revenue/g, userStats.total_revenue || 0)
                .replace(/average_rating/g, userStats.average_rating || 0)
                .replace(/rank/g, `'${userStats.rank || 'Bronze'}'`)
                .replace(/leaderboard_position/g, userStats.leaderboard_position || 999);

            // Évaluer la condition de manière sécurisée
            return this.evaluateCondition(conditionWithValues);
        } catch (error) {
            console.error('Check achievement condition error:', error);
            return false;
        }
    }

    /**
     * Évaluer une condition de manière sécurisée
     */
    evaluateCondition(condition) {
        // Parser la condition et l'évaluer en toute sécurité
        // Pour l'instant, implémentation simple
        
        if (condition.includes('>=') || condition.includes('<=') || 
            condition.includes('>') || condition.includes('<') || 
            condition.includes('=')) {
            
            // Extraire les parties de la condition
            const parts = condition.match(/(.+)\s*(>=|<=|>|<|=)\s*(.+)/);
            if (!parts) return false;
            
            const left = parseFloat(parts[1].replace(/'/g, ''));
            const operator = parts[2];
            const right = parseFloat(parts[3].replace(/'/g, ''));
            
            switch (operator) {
                case '>=': return left >= right;
                case '<=': return left <= right;
                case '>': return left > right;
                case '<': return left < right;
                case '=': return left === right;
                default: return false;
            }
        }
        
        return false;
    }

    /**
     * Mettre à jour les points de l'utilisateur
     */
    async updateUserPoints(userId, points) {
        const query = `
            UPDATE users 
            SET gamification_points = COALESCE(gamification_points, 0) + $1, updated_at = $2
            WHERE id = $3
            RETURNING id, gamification_points
        `;

        try {
            const result = await this.db.query(query, [points, new Date(), userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Update user points error:', error);
            throw error;
        }
    }

    /**
     * Créer une notification pour un achievement
     */
    async createAchievementNotification(userId, achievementData) {
        const query = `
            INSERT INTO notifications (
                user_id, type, title, message, data, is_read, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            userId,
            'achievement_unlocked',
            '🏆 Nouveau Succès!',
            `Félicitations! Vous avez débloqué "${achievementData.name}" et gagné ${achievementData.points} points!`,
            JSON.stringify({
                achievement_id: achievementData.id,
                achievement_name: achievementData.name,
                points: achievementData.points,
                badge_url: achievementData.badge_url
            }),
            false,
            new Date()
        ];

        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Create achievement notification error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les achievements d'un utilisateur
     */
    async getUserAchievements(userId, page = 1, perPage = 20) {
        const offset = (page - 1) * perPage;
        
        const query = `
            SELECT 
                a.*,
                (SELECT COUNT(*) FROM achievements WHERE user_id = $1) as total_count
            FROM achievements a
            WHERE a.user_id = $1
            ORDER BY a.unlocked_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await this.db.query(query, [userId, perPage, offset]);
            const achievements = result.rows;
            const totalCount = achievements.length > 0 ? achievements[0].total_count : 0;
            
            // Supprimer le champ total_count de chaque achievement
            achievements.forEach(a => delete a.total_count);
            
            return {
                achievements: achievements,
                pagination: {
                    page: page,
                    per_page: perPage,
                    total: totalCount,
                    total_pages: Math.ceil(totalCount / perPage)
                }
            };
        } catch (error) {
            console.error('Get user achievements error:', error);
            throw error;
        }
    }

    /**
     * Obtenir le classement des utilisateurs
     */
    async getLeaderboard(type = 'points', limit = 50) {
        let orderBy = '';
        let selectFields = '';
        
        switch (type) {
            case 'points':
                orderBy = 'u.gamification_points DESC';
                selectFields = 'u.gamification_points as score, COUNT(a.id) as achievements_count';
                break;
            case 'sales':
                orderBy = 'u.total_sales DESC';
                selectFields = 'u.total_sales as score, u.total_revenue as revenue';
                break;
            case 'revenue':
                orderBy = 'u.total_revenue DESC';
                selectFields = 'u.total_revenue as score, u.total_sales as sales_count';
                break;
            default:
                orderBy = 'u.gamification_points DESC';
                selectFields = 'u.gamification_points as score, COUNT(a.id) as achievements_count';
        }

        const query = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.rank,
                u.avatar_url,
                ${selectFields},
                ROW_NUMBER() OVER (ORDER BY ${orderBy}) as position
            FROM users u
            LEFT JOIN achievements a ON u.id = a.user_id
            WHERE u.role = 'vendor' 
            AND u.status = 'active'
            GROUP BY u.id, u.username, u.full_name, u.rank, u.avatar_url
            ORDER BY ${orderBy}
            LIMIT $1
        `;

        try {
            const result = await this.db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Get leaderboard error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les achievements disponibles
     */
    getAvailableAchievements() {
        return this.achievements;
    }

    /**
     * Obtenir les quêtes actives pour un utilisateur
     */
    async getActiveQuests(userId) {
        // Pour l'instant, retourner des quêtes prédéfinies
        // En production, implémenter un système de quêtes dynamiques
        
        const userStats = await this.getUserStats(userId);
        
        const quests = [
            {
                id: 'daily_sales',
                name: 'Ventes Quotidiennes',
                description: 'Effectuez 3 ventes aujourd\'hui',
                progress: userStats.daily_sales || 0,
                target: 3,
                reward: 50,
                expires_at: new Date().setHours(23, 59, 59, 999)
            },
            {
                id: 'weekly_revenue',
                name: 'Revenu Hebdomadaire',
                description: 'Atteignez 50,000 FCFA de revenus cette semaine',
                progress: userStats.weekly_revenue || 0,
                target: 50000,
                reward: 200,
                expires_at: new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))
            },
            {
                id: 'perfect_week',
                name: 'Semaine Parfaite',
                description: 'Maintenez une note de 5 étoiles toute la semaine',
                progress: userStats.perfect_week_days || 0,
                target: 7,
                reward: 300,
                expires_at: new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))
            }
        ];

        return quests;
    }

    /**
     * Compléter une quête
     */
    async completeQuest(userId, questId) {
        try {
            // Vérifier si la quête est valide et complétée
            const activeQuests = await this.getActiveQuests(userId);
            const quest = activeQuests.find(q => q.id === questId);
            
            if (!quest) {
                throw new Error('Quête non trouvée');
            }
            
            if (quest.progress < quest.target) {
                throw new Error('Quête non complétée');
            }
            
            // Donner la récompense
            await this.updateUserPoints(userId, quest.reward);
            
            // Créer une notification
            await this.createQuestNotification(userId, quest);
            
            // Marquer la quête comme complétée
            await this.markQuestCompleted(userId, questId);
            
            return {
                success: true,
                quest: quest,
                reward: quest.reward
            };
            
        } catch (error) {
            console.error('Complete quest error:', error);
            throw error;
        }
    }

    /**
     * Créer une notification pour une quête
     */
    async createQuestNotification(userId, questData) {
        const query = `
            INSERT INTO notifications (
                user_id, type, title, message, data, is_read, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            userId,
            'quest_completed',
            '🎯 Quête Terminée!',
            `Excellent! Vous avez complété "${questData.name}" et gagné ${questData.reward} points!`,
            JSON.stringify({
                quest_id: questData.id,
                quest_name: questData.name,
                reward: questData.reward
            }),
            false,
            new Date()
        ];

        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Create quest notification error:', error);
            throw error;
        }
    }

    /**
     * Marquer une quête comme complétée
     */
    async markQuestCompleted(userId, questId) {
        // Pour l'instant, implémentation simple
        // En production, avoir une table dédiée pour les quêtes
        
        console.log(`Quest ${questId} marked as completed for user ${userId}`);
        return true;
    }

    /**
     * Obtenir les statistiques de gamification
     */
    async getGamificationStats(userId) {
        try {
            const userStats = await this.getUserStats(userId);
            const achievements = await this.getUserAchievements(userId, 1, 100);
            const activeQuests = await this.getActiveQuests(userId);
            
            const totalAvailableAchievements = Object.keys(this.achievements).length;
            const completionRate = (achievements.achievements.length / totalAvailableAchievements) * 100;
            
            return {
                userStats: userStats,
                achievements: achievements,
                activeQuests: activeQuests,
                stats: {
                    totalPoints: userStats.total_points || 0,
                    achievementsUnlocked: achievements.achievements.length,
                    totalAchievements: totalAvailableAchievements,
                    completionRate: Math.round(completionRate),
                    leaderboardPosition: userStats.leaderboard_position || null,
                    currentRank: userStats.rank || 'Bronze'
                }
            };
            
        } catch (error) {
            console.error('Get gamification stats error:', error);
            throw error;
        }
    }

    /**
     * Réinitialiser les points de gamification (admin seulement)
     */
    async resetGamificationPoints(userId) {
        const query = `
            UPDATE users 
            SET gamification_points = 0, updated_at = $1
            WHERE id = $2
            RETURNING id, gamification_points
        `;

        try {
            const result = await this.db.query(query, [new Date(), userId]);
            
            // Supprimer les achievements
            await this.db.query('DELETE FROM achievements WHERE user_id = $1', [userId]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Reset gamification points error:', error);
            throw error;
        }
    }
}

module.exports = GamificationService;
