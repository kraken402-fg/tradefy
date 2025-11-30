const { config } = require('../../config/platforms');

/**
 * Service de gamification pour Tradefy
 */
class GamificationService {
    constructor(db) {
        this.db = db;
        this.enabled = config.gamification.enabled;
    }

    /**
     * Initialiser la gamification pour un utilisateur
     */
    async initializeUserGamification(userId) {
        try {
            if (!this.enabled) return null;

            // Créer les statistiques de gamification
            const query = `
                INSERT INTO user_gamification_stats (
                    user_id, points, level, current_xp, xp_to_next_level,
                    achievements_unlocked, quests_completed, badges_earned,
                    streak_days, last_active_date, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                )
                ON CONFLICT (user_id) DO NOTHING
                RETURNING *
            `;

            const values = [
                userId,
                0, // points
                1, // level
                0, // current_xp
                100, // xp_to_next_level
                0, // achievements_unlocked
                0, // quests_completed
                0, // badges_earned
                0, // streak_days
                new Date(), // last_active_date
                new Date(), // created_at
                new Date() // updated_at
            ];

            const result = await this.db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la gamification:', error);
            return null;
        }
    }

    /**
     * Ajouter des points à un utilisateur
     */
    async addPoints(userId, points, reason, metadata = {}) {
        try {
            if (!this.enabled) return null;

            // Obtenir les stats actuelles
            const currentStats = await this.getUserStats(userId);
            if (!currentStats) {
                await this.initializeUserGamification(userId);
                return await this.addPoints(userId, points, reason, metadata);
            }

            // Ajouter les points
            const newPoints = currentStats.points + points;
            const newXp = currentStats.current_xp + points;
            let newLevel = currentStats.level;
            let xpToNextLevel = currentStats.xp_to_next_level;

            // Vérifier le passage de niveau
            if (newXp >= xpToNextLevel) {
                newLevel++;
                const levelUpBonus = this.calculateLevelUpBonus(newLevel);
                newXp = newXp - xpToNextLevel;
                xpToNextLevel = this.calculateXpForNextLevel(newLevel);
                
                // Ajouter les points de bonus de niveau
                await this.addPoints(userId, levelUpBonus, 'level_up_bonus', { new_level: newLevel });
            }

            // Mettre à jour les stats
            const updateQuery = `
                UPDATE user_gamification_stats 
                SET points = $1, level = $2, current_xp = $3, xp_to_next_level = $4,
                    updated_at = $5
                WHERE user_id = $6
                RETURNING *
            `;

            const updateResult = await this.db.query(updateQuery, [
                newPoints, newLevel, newXp, xpToNextLevel, new Date(), userId
            ]);

            // Journaliser l'ajout de points
            await this.logPointsTransaction(userId, points, reason, metadata);

            return updateResult.rows[0];

        } catch (error) {
            console.error('Erreur lors de l\'ajout de points:', error);
            return null;
        }
    }

    /**
     * Vérifier et débloquer les achievements
     */
    async checkAndUnlockAchievements(userId) {
        try {
            if (!this.enabled) return null;

            const unlockedAchievements = [];

            // Obtenir les stats de l'utilisateur
            const stats = await this.getUserStats(userId);
            const user = await this.getUserById(userId);

            if (!stats || !user) return null;

            // Liste des achievements à vérifier
            const achievements = await this.getAllAchievements();

            for (const achievement of achievements) {
                // Vérifier si l'achievement n'est pas déjà débloqué
                const isUnlocked = await this.isAchievementUnlocked(userId, achievement.id);
                if (isUnlocked) continue;

                // Vérifier les conditions
                const shouldUnlock = await this.checkAchievementConditions(achievement, stats, user);

                if (shouldUnlock) {
                    await this.unlockAchievement(userId, achievement.id);
                    unlockedAchievements.push(achievement);
                    
                    // Ajouter les points de l'achievement
                    await this.addPoints(userId, achievement.points_reward, 'achievement_unlocked', {
                        achievement_id: achievement.id,
                        achievement_name: achievement.name
                    });
                }
            }

            return unlockedAchievements;

        } catch (error) {
            console.error('Erreur lors de la vérification des achievements:', error);
            return null;
        }
    }

    /**
     * Obtenir les statistiques de gamification d'un utilisateur
     */
    async getUserStats(userId) {
        try {
            const query = `
                SELECT * FROM user_gamification_stats
                WHERE user_id = $1
            `;

            const result = await this.db.query(query, [userId]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la récupération des stats gamification:', error);
            return null;
        }
    }

    /**
     * Obtenir tous les achievements
     */
    async getAllAchievements() {
        try {
            const query = `
                SELECT * FROM achievements
                ORDER BY category, name
            `;

            const result = await this.db.query(query);
            return result.rows;

        } catch (error) {
            console.error('Erreur lors de la récupération des achievements:', error);
            return [];
        }
    }

    /**
     * Vérifier si un achievement est débloqué
     */
    async isAchievementUnlocked(userId, achievementId) {
        try {
            const query = `
                SELECT id FROM user_achievements
                WHERE user_id = $1 AND achievement_id = $2
            `;

            const result = await this.db.query(query, [userId, achievementId]);
            return result.rows.length > 0;

        } catch (error) {
            console.error('Erreur lors de la vérification de l\'achievement:', error);
            return false;
        }
    }

    /**
     * Vérifier les conditions d'un achievement
     */
    async checkAchievementConditions(achievement, stats, user) {
        try {
            const conditions = JSON.parse(achievement.conditions || '{}');

            switch (achievement.type) {
                case 'sales':
                    return await this.checkSalesAchievement(conditions, user);
                case 'points':
                    return this.checkPointsAchievement(conditions, stats);
                case 'level':
                    return this.checkLevelAchievement(conditions, stats);
                case 'streak':
                    return this.checkStreakAchievement(conditions, stats);
                case 'quests':
                    return this.checkQuestsAchievement(conditions, stats);
                case 'reviews':
                    return await this.checkReviewsAchievement(conditions, user);
                default:
                    return false;
            }

        } catch (error) {
            console.error('Erreur lors de la vérification des conditions:', error);
            return false;
        }
    }

    /**
     * Vérifier les achievements de ventes
     */
    async checkSalesAchievement(conditions, user) {
        if (conditions.min_sales && user.total_sales >= conditions.min_sales) {
            return true;
        }
        if (conditions.min_revenue && user.total_revenue >= conditions.min_revenue) {
            return true;
        }
        return false;
    }

    /**
     * Vérifier les achievements de points
     */
    checkPointsAchievement(conditions, stats) {
        return conditions.min_points && stats.points >= conditions.min_points;
    }

    /**
     * Vérifier les achievements de niveau
     */
    checkLevelAchievement(conditions, stats) {
        return conditions.min_level && stats.level >= conditions.min_level;
    }

    /**
     * Vérifier les achievements de streak
     */
    checkStreakAchievement(conditions, stats) {
        return conditions.min_streak && stats.streak_days >= conditions.min_streak;
    }

    /**
     * Vérifier les achievements de quêtes
     */
    checkQuestsAchievement(conditions, stats) {
        return conditions.min_quests && stats.quests_completed >= conditions.min_quests;
    }

    /**
     * Vérifier les achievements de reviews
     */
    async checkReviewsAchievement(conditions, user) {
        try {
            const query = `
                SELECT COUNT(*) as count FROM reviews
                WHERE vendor_id = $1 AND is_public = true
            `;

            const result = await this.db.query(query, [user.id]);
            const reviewCount = parseInt(result.rows[0].count);

            return conditions.min_reviews && reviewCount >= conditions.min_reviews;

        } catch (error) {
            console.error('Erreur lors de la vérification des reviews:', error);
            return false;
        }
    }

    /**
     * Débloquer un achievement
     */
    async unlockAchievement(userId, achievementId) {
        try {
            const query = `
                INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, achievement_id) DO NOTHING
                RETURNING *
            `;

            const result = await this.db.query(query, [userId, achievementId, new Date()]);
            
            // Mettre à jour le compteur d'achievements
            if (result.rows.length > 0) {
                await this.db.query(`
                    UPDATE user_gamification_stats 
                    SET achievements_unlocked = achievements_unlocked + 1, updated_at = $1
                    WHERE user_id = $2
                `, [new Date(), userId]);
            }

            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors du déblocage de l\'achievement:', error);
            return null;
        }
    }

    /**
     * Obtenir les quêtes disponibles
     */
    async getAvailableQuests(userId) {
        try {
            const query = `
                SELECT q.*, 
                       CASE WHEN uq.user_id IS NOT NULL THEN true ELSE false END as accepted,
                       CASE WHEN uq.completed_at IS NOT NULL THEN true ELSE false END as completed
                FROM quests q
                LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $1
                WHERE q.active = true
                ORDER BY q.category, q.name
            `;

            const result = await this.db.query(query, [userId]);
            return result.rows;

        } catch (error) {
            console.error('Erreur lors de la récupération des quêtes:', error);
            return [];
        }
    }

    /**
     * Accepter une quête
     */
    async acceptQuest(userId, questId) {
        try {
            // Vérifier si la quête existe et est active
            const quest = await this.getQuestById(questId);
            if (!quest || !quest.active) {
                throw new Error('Quête non disponible');
            }

            // Vérifier si l'utilisateur n'a pas déjà accepté cette quête
            const existingQuest = await this.getUserQuest(userId, questId);
            if (existingQuest) {
                throw new Error('Quête déjà acceptée');
            }

            const query = `
                INSERT INTO user_quests (user_id, quest_id, accepted_at, progress, status)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;

            const result = await this.db.query(query, [userId, questId, new Date(), 0, 'in_progress']);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de l\'acceptation de la quête:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le progrès d'une quête
     */
    async updateQuestProgress(userId, questId, progress) {
        try {
            const userQuest = await this.getUserQuest(userId, questId);
            if (!userQuest) {
                throw new Error('Quête non acceptée');
            }

            const quest = await this.getQuestById(questId);
            const isCompleted = progress >= quest.target;

            const status = isCompleted ? 'completed' : 'in_progress';
            const completedAt = isCompleted ? new Date() : null;

            const query = `
                UPDATE user_quests 
                SET progress = $1, status = $2, completed_at = $3, updated_at = $4
                WHERE user_id = $5 AND quest_id = $6
                RETURNING *
            `;

            const result = await this.db.query(query, [
                progress, status, completedAt, new Date(), userId, questId
            ]);

            // Si la quête est complétée, donner la récompense
            if (isCompleted) {
                await this.completeQuest(userId, questId);
            }

            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour du progrès:', error);
            throw error;
        }
    }

    /**
     * Compléter une quête
     */
    async completeQuest(userId, questId) {
        try {
            const quest = await this.getQuestById(questId);
            if (!quest) {
                throw new Error('Quête non trouvée');
            }

            // Ajouter les points de récompense
            await this.addPoints(userId, quest.points_reward, 'quest_completed', {
                quest_id: questId,
                quest_name: quest.name
            });

            // Mettre à jour le compteur de quêtes complétées
            await this.db.query(`
                UPDATE user_gamification_stats 
                SET quests_completed = quests_completed + 1, updated_at = $1
                WHERE user_id = $2
            `, [new Date(), userId]);

            return true;

        } catch (error) {
            console.error('Erreur lors de la complétion de la quête:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le streak quotidien
     */
    async updateDailyStreak(userId) {
        try {
            const stats = await this.getUserStats(userId);
            if (!stats) {
                await this.initializeUserGamification(userId);
                return await this.updateDailyStreak(userId);
            }

            const lastActive = new Date(stats.last_active_date);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let newStreak = stats.streak_days;

            // Si la dernière activité était hier, incrémenter le streak
            if (lastActive.toDateString() === yesterday.toDateString()) {
                newStreak++;
            }
            // Si la dernière activité était aujourd'hui, ne rien changer
            else if (lastActive.toDateString() === today.toDateString()) {
                // Pas de changement
            }
            // Sinon, réinitialiser le streak
            else {
                newStreak = 1;
            }

            // Mettre à jour les stats
            await this.db.query(`
                UPDATE user_gamification_stats 
                SET streak_days = $1, last_active_date = $2, updated_at = $3
                WHERE user_id = $4
            `, [newStreak, today, new Date(), userId]);

            // Ajouter des points pour le streak
            if (newStreak > stats.streak_days) {
                const streakPoints = Math.min(newStreak * 10, 100); // Max 100 points par jour
                await this.addPoints(userId, streakPoints, 'daily_streak', {
                    streak_days: newStreak
                });
            }

            return newStreak;

        } catch (error) {
            console.error('Erreur lors de la mise à jour du streak:', error);
            return 0;
        }
    }

    /**
     * Obtenir le leaderboard
     */
    async getLeaderboard(type = 'points', limit = 50) {
        try {
            let orderBy = 'points DESC';
            switch (type) {
                case 'points':
                    orderBy = 'points DESC';
                    break;
                case 'level':
                    orderBy = 'level DESC, points DESC';
                    break;
                case 'sales':
                    orderBy = 'total_sales DESC';
                    break;
                case 'achievements':
                    orderBy = 'achievements_unlocked DESC';
                    break;
            }

            const query = `
                SELECT ugs.*, u.username, u.full_name, u.avatar_url, u.rank,
                       u.total_sales, u.total_revenue
                FROM user_gamification_stats ugs
                JOIN users u ON ugs.user_id = u.id
                WHERE u.deleted_at IS NULL AND u.status = 'active'
                ORDER BY ${orderBy}
                LIMIT $1
            `;

            const result = await this.db.query(query, [limit]);
            return result.rows;

        } catch (error) {
            console.error('Erreur lors de la récupération du leaderboard:', error);
            return [];
        }
    }

    /**
     * Obtenir les notifications de gamification
     */
    async getGamificationNotifications(userId, limit = 20) {
        try {
            const query = `
                SELECT * FROM gamification_notifications
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `;

            const result = await this.db.query(query, [userId, limit]);
            return result.rows;

        } catch (error) {
            console.error('Erreur lors de la récupération des notifications:', error);
            return [];
        }
    }

    /**
     * Créer une notification de gamification
     */
    async createNotification(userId, type, title, message, metadata = {}) {
        try {
            const query = `
                INSERT INTO gamification_notifications (
                    user_id, type, title, message, metadata, read_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const result = await this.db.query(query, [
                userId, type, title, message, 
                JSON.stringify(metadata), null, new Date()
            ]);

            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
            return null;
        }
    }

    /**
     * Marquer une notification comme lue
     */
    async markNotificationAsRead(notificationId) {
        try {
            const query = `
                UPDATE gamification_notifications 
                SET read_at = $1
                WHERE id = $2
            `;

            await this.db.query(query, [new Date(), notificationId]);
            return true;

        } catch (error) {
            console.error('Erreur lors du marquage de la notification:', error);
            return false;
        }
    }

    /**
     * Journaliser une transaction de points
     */
    async logPointsTransaction(userId, points, reason, metadata) {
        try {
            const query = `
                INSERT INTO points_transactions (
                    user_id, points, reason, metadata, created_at
                ) VALUES ($1, $2, $3, $4, $5)
            `;

            await this.db.query(query, [
                userId, points, reason, JSON.stringify(metadata), new Date()
            ]);

        } catch (error) {
            console.error('Erreur lors de la journalisation des points:', error);
        }
    }

    /**
     * Obtenir l'historique des points
     */
    async getPointsHistory(userId, limit = 50) {
        try {
            const query = `
                SELECT * FROM points_transactions
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `;

            const result = await this.db.query(query, [userId, limit]);
            return result.rows;

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique des points:', error);
            return [];
        }
    }

    /**
     * Calculer les XP pour le niveau suivant
     */
    calculateXpForNextLevel(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    /**
     * Calculer le bonus de passage de niveau
     */
    calculateLevelUpBonus(level) {
        return Math.floor(50 * Math.pow(1.2, level - 1));
    }

    /**
     * Obtenir un utilisateur par ID
     */
    async getUserById(userId) {
        try {
            const query = `
                SELECT id, username, full_name, avatar_url, rank,
                       total_sales, total_revenue, average_order_value, customer_rating
                FROM users
                WHERE id = $1 AND deleted_at IS NULL
            `;

            const result = await this.db.query(query, [userId]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error);
            return null;
        }
    }

    /**
     * Obtenir une quête par ID
     */
    async getQuestById(questId) {
        try {
            const query = `
                SELECT * FROM quests
                WHERE id = $1
            `;

            const result = await this.db.query(query, [questId]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la récupération de la quête:', error);
            return null;
        }
    }

    /**
     * Obtenir une quête utilisateur
     */
    async getUserQuest(userId, questId) {
        try {
            const query = `
                SELECT * FROM user_quests
                WHERE user_id = $1 AND quest_id = $2
            `;

            const result = await this.db.query(query, [userId, questId]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la récupération de la quête utilisateur:', error);
            return null;
        }
    }

    /**
     * Réinitialiser les points d'un utilisateur
     */
    async resetUserPoints(userId, reason = 'admin_reset') {
        try {
            const query = `
                UPDATE user_gamification_stats 
                SET points = 0, level = 1, current_xp = 0, xp_to_next_level = 100,
                    achievements_unlocked = 0, quests_completed = 0, badges_earned = 0,
                    streak_days = 0, updated_at = $1
                WHERE user_id = $2
                RETURNING *
            `;

            const result = await this.db.query(query, [new Date(), userId]);

            // Journaliser la réinitialisation
            await this.logPointsTransaction(userId, 0, reason, { reset: true });

            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la réinitialisation des points:', error);
            return null;
        }
    }
}

module.exports = GamificationService;
