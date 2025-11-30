const GamificationService = require('../services/GamificationService');

/**
 * Tests pour GamificationService
 */
class GamificationServiceTest {
    constructor() {
        this.mockDb = {
            query: jest.fn()
        };
        this.gamificationService = new GamificationService(this.mockDb);
        this.testResults = [];
    }

    /**
     * Test débloquer première vente achievement
     */
    async testUnlockFirstSaleAchievement() {
        try {
            console.log('🧪 Test: Déblocage achievement première vente...');

            const userId = 1;
            
            // Mock statistiques utilisateur avec 1 vente
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    id: userId,
                    total_sales: 1,
                    average_rating: 0,
                    leaderboard_position: 50
                }] 
            });

            // Mock achievement non débloqué
            this.mockDb.query.mockResolvedValueOnce({ rows: [] });

            // Mock insertion achievement
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, type: 'first_sale' }] 
            });

            // Mock mise à jour points
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: userId, gamification_points: 100 }] 
            });

            // Mock notification
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1 }] 
            });

            const result = await this.gamificationService.checkAndUnlockAchievements(userId);

            this.assert(result.success === true, 'Le déblocage devrait réussir');
            this.assert(result.unlockedAchievements.length > 0, 'Achievement débloqué');
            this.assert(result.totalPoints > 0, 'Points gagnés');

            this.addTestResult('Achievement première vente', true);
            console.log('✅ Test achievement première vente réussi');

        } catch (error) {
            this.addTestResult('Achievement première vente', false, error.message);
            console.error('❌ Test achievement première vente échoué:', error.message);
        }
    }

    /**
     * Test débloc achievement rang Silver
     */
    async testUnlockSilverRankAchievement() {
        try {
            console.log('🧪 Test: Déblocage achievement rang Silver...');

            const userId = 1;
            
            // Mock statistiques utilisateur avec rang Silver
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    id: userId,
                    rank: 'Silver',
                    total_sales: 15,
                    average_rating: 4.5,
                    leaderboard_position: 20
                }] 
            });

            // Mock achievement non débloqué
            this.mockDb.query.mockResolvedValueOnce({ rows: [] });

            // Mock insertion achievement
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 2, type: 'silver_rank' }] 
            });

            // Mock mise à jour points et notification
            this.mockDb.query.mockResolvedValueOnce({ rows: [{ id: userId }] });
            this.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const result = await this.gamificationService.checkAndUnlockAchievements(userId);

            this.assert(result.success === true, 'Le déblocage devrait réussir');
            const silverAchievement = result.unlockedAchievements.find(a => a.id === 'silver_rank');
            this.assert(silverAchievement, 'Achievement Silver débloqué');

            this.addTestResult('Achievement rang Silver', true);
            console.log('✅ Test achievement rang Silver réussi');

        } catch (error) {
            this.addTestResult('Achievement rang Silver', false, error.message);
            console.error('❌ Test achievement rang Silver échoué:', error.message);
        }
    }

    /**
     * Test obtention statistiques utilisateur
     */
    async testGetUserStats() {
        try {
            console.log('🧪 Test: Obtention statistiques utilisateur...');

            const userId = 1;
            
            // Mock statistiques complètes
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    id: userId,
                    username: 'testuser',
                    rank: 'Gold',
                    total_sales: 30,
                    total_revenue: 300000,
                    average_rating: 4.8,
                    order_count: 30,
                    achievements_count: 5,
                    total_points: 1500,
                    leaderboard_position: 10
                }] 
            });

            const stats = await this.gamificationService.getUserStats(userId);

            this.assert(stats.id === userId, 'ID utilisateur correct');
            this.assert(stats.rank === 'Gold', 'Rang Gold');
            this.assert(stats.total_sales === 30, '30 ventes');
            this.assert(stats.average_rating === 4.8, 'Note moyenne 4.8');
            this.assert(stats.total_points === 1500, '1500 points');
            this.assert(stats.leaderboard_position === 10, 'Position 10');

            this.addTestResult('Statistiques utilisateur', true);
            console.log('✅ Test statistiques utilisateur réussi');

        } catch (error) {
            this.addTestResult('Statistiques utilisateur', false, error.message);
            console.error('❌ Test statistiques utilisateur échoué:', error.message);
        }
    }

    /**
     * Test obtention achievements utilisateur
     */
    async testGetUserAchievements() {
        try {
            console.log('🧪 Test: Obtention achievements utilisateur...');

            const userId = 1;
            const page = 1;
            const perPage = 10;
            
            // Mock achievements
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { 
                        id: 1, 
                        type: 'first_sale', 
                        title: 'Première Vente',
                        unlocked_at: new Date(),
                        total_count: 3
                    },
                    { 
                        id: 2, 
                        type: 'silver_rank', 
                        title: 'Rang Silver',
                        unlocked_at: new Date(),
                        total_count: 3
                    }
                ] 
            });

            const result = await this.gamificationService.getUserAchievements(userId, page, perPage);

            this.assert(result.achievements.length === 2, '2 achievements récupérés');
            this.assert(result.pagination.total === 3, 'Total de 3 achievements');
            this.assert(result.pagination.page === 1, 'Page 1');
            this.assert(result.pagination.per_page === 10, '10 par page');

            this.addTestResult('Achievements utilisateur', true);
            console.log('✅ Test achievements utilisateur réussi');

        } catch (error) {
            this.addTestResult('Achievements utilisateur', false, error.message);
            console.error('❌ Test achievements utilisateur échoué:', error.message);
        }
    }

    /**
     * Test obtention classement
     */
    async testGetLeaderboard() {
        try {
            console.log('🧪 Test: Obtention classement...');

            const type = 'points';
            const limit = 10;
            
            // Mock classement
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    {
                        id: 1,
                        username: 'topuser',
                        full_name: 'Top User',
                        rank: 'Senior',
                        score: 5000,
                        achievements_count: 15,
                        position: 1
                    },
                    {
                        id: 2,
                        username: 'seconduser',
                        full_name: 'Second User',
                        rank: 'Diamond',
                        score: 4500,
                        achievements_count: 12,
                        position: 2
                    }
                ] 
            });

            const leaderboard = await this.gamificationService.getLeaderboard(type, limit);

            this.assert(leaderboard.length === 2, '2 utilisateurs dans le classement');
            this.assert(leaderboard[0].position === 1, 'Premier utilisateur position 1');
            this.assert(leaderboard[0].score === 5000, 'Score 5000 pour le premier');
            this.assert(leaderboard[1].position === 2, 'Deuxième utilisateur position 2');

            this.addTestResult('Classement', true);
            console.log('✅ Test classement réussi');

        } catch (error) {
            this.addTestResult('Classement', false, error.message);
            console.error('❌ Test classement échoué:', error.message);
        }
    }

    /**
     * Test obtention quêtes actives
     */
    async testGetActiveQuests() {
        try {
            console.log('🧪 Test: Obtention quêtes actives...');

            const userId = 1;
            
            // Mock statistiques utilisateur pour quêtes
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    id: userId,
                    daily_sales: 2,
                    weekly_revenue: 30000,
                    perfect_week_days: 3
                }] 
            });

            const quests = await this.gamificationService.getActiveQuests(userId);

            this.assert(Array.isArray(quests), 'Quêtes retournées en tableau');
            this.assert(quests.length > 0, 'Quêtes disponibles');
            
            const dailyQuest = quests.find(q => q.id === 'daily_sales');
            this.assert(dailyQuest, 'Quête ventes quotidiennes présente');
            this.assert(dailyQuest.target === 3, 'Objectif de 3 ventes quotidiennes');
            this.assert(dailyQuest.progress === 2, 'Progression de 2 ventes');

            this.addTestResult('Quêtes actives', true);
            console.log('✅ Test quêtes actives réussi');

        } catch (error) {
            this.addTestResult('Quêtes actives', false, error.message);
            console.error('❌ Test quêtes actives échoué:', error.message);
        }
    }

    /**
     * Test complétion quête
     */
    async testCompleteQuest() {
        try {
            console.log('🧪 Test: Complétion quête...');

            const userId = 1;
            const questId = 'daily_sales';
            
            // Mock quêtes actives (complétées)
            jest.spyOn(this.gamificationService, 'getActiveQuests').mockResolvedValue([
                {
                    id: questId,
                    name: 'Ventes Quotidiennes',
                    progress: 3,
                    target: 3,
                    reward: 50
                }
            ]);

            // Mock mise à jour points
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: userId, gamification_points: 150 }] 
            });

            // Mock notification
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1 }] 
            });

            const result = await this.gamificationService.completeQuest(userId, questId);

            this.assert(result.success === true, 'La complétion devrait réussir');
            this.assert(result.reward === 50, 'Récompense de 50 points');
            this.assert(result.quest.id === questId, 'Quête correcte');

            this.addTestResult('Complétion quête', true);
            console.log('✅ Test complétion quête réussi');

        } catch (error) {
            this.addTestResult('Complétion quête', false, error.message);
            console.error('❌ Test complétion quête échoué:', error.message);
        }
    }

    /**
     * Test statistiques gamification complètes
     */
    async testGetGamificationStats() {
        try {
            console.log('🧪 Test: Statistiques gamification complètes...');

            const userId = 1;
            
            // Mock statistiques utilisateur
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    id: userId,
                    username: 'testuser',
                    rank: 'Gold',
                    total_sales: 30,
                    total_points: 1500,
                    leaderboard_position: 10
                }] 
            });

            // Mock achievements
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, type: 'first_sale' },
                    { id: 2, type: 'silver_rank' }
                ] 
            });

            // Mock quêtes
            jest.spyOn(this.gamificationService, 'getActiveQuests').mockResolvedValue([
                { id: 'daily_sales', progress: 2, target: 3 }
            ]);

            const stats = await this.gamificationService.getGamificationStats(userId);

            this.assert(stats.userStats.id === userId, 'Stats utilisateur présentes');
            this.assert(stats.achievements.achievements.length === 2, '2 achievements');
            this.assert(stats.activeQuests.length === 1, '1 quête active');
            this.assert(stats.stats.totalPoints === 1500, '1500 points totaux');
            this.assert(stats.stats.achievementsUnlocked === 2, '2 achievements débloqués');
            this.assert(stats.stats.completionRate > 0, 'Taux de complétion calculé');

            this.addTestResult('Statistiques gamification complètes', true);
            console.log('✅ Test statistiques gamification complètes réussi');

        } catch (error) {
            this.addTestResult('Statistiques gamification complètes', false, error.message);
            console.error('❌ Test statistiques gamification complètes échoué:', error.message);
        }
    }

    /**
     * Test évaluation condition achievement
     */
    testEvaluateAchievementCondition() {
        try {
            console.log('🧪 Test: Évaluation condition achievement...');

            const userStats = {
                total_sales: 15,
                rank: 'Silver',
                average_rating: 4.5,
                leaderboard_position: 10
            };

            // Test condition première vente
            let condition = 'total_sales >= 1';
            let result = this.gamificationService.checkAchievementCondition(condition, userStats);
            this.assert(result === true, 'Condition première vente vraie');

            // Test condition 10 ventes
            condition = 'total_sales >= 10';
            result = this.gamificationService.checkAchievementCondition(condition, userStats);
            this.assert(result === true, 'Condition 10 ventes vraie');

            // Test condition 50 ventes (faux)
            condition = 'total_sales >= 50';
            result = this.gamificationService.checkAchievementCondition(condition, userStats);
            this.assert(result === false, 'Condition 50 ventes fausse');

            // Test condition rang
            condition = 'rank = "Silver"';
            result = this.gamificationService.checkAchievementCondition(condition, userStats);
            this.assert(result === true, 'Condition rang Silver vraie');

            // Test condition classement
            condition = 'leaderboard_position <= 10';
            result = this.gamificationService.checkAchievementCondition(condition, userStats);
            this.assert(result === true, 'Condition classement vraie');

            this.addTestResult('Évaluation condition achievement', true);
            console.log('✅ Test évaluation condition achievement réussi');

        } catch (error) {
            this.addTestResult('Évaluation condition achievement', false, error.message);
            console.error('❌ Test évaluation condition achievement échoué:', error.message);
        }
    }

    /**
     * Test création notification achievement
     */
    async testCreateAchievementNotification() {
        try {
            console.log('🧪 Test: Création notification achievement...');

            const userId = 1;
            const achievementData = {
                id: 'first_sale',
                name: 'Première Vente',
                points: 100,
                badge_url: '/assets/badges/first-sale.png'
            };
            
            // Mock insertion notification
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, type: 'achievement_unlocked' }] 
            });

            const notification = await this.gamificationService.createAchievementNotification(userId, achievementData);

            this.assert(notification.id === 1, 'Notification créée');
            this.assert(notification.type === 'achievement_unlocked', 'Type correct');
            this.assert(notification.user_id === userId, 'Utilisateur correct');

            this.addTestResult('Création notification achievement', true);
            console.log('✅ Test création notification achievement réussi');

        } catch (error) {
            this.addTestResult('Création notification achievement', false, error.message);
            console.error('❌ Test création notification achievement échoué:', error.message);
        }
    }

    /**
     * Test réinitialisation points gamification
     */
    async testResetGamificationPoints() {
        try {
            console.log('🧪 Test: Réinitialisation points gamification...');

            const userId = 1;
            
            // Mock mise à jour points
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: userId, gamification_points: 0 }] 
            });

            // Mock suppression achievements
            this.mockDb.query.mockResolvedValueOnce({ rows: [] });

            const result = await this.gamificationService.resetGamificationPoints(userId);

            this.assert(result.id === userId, 'Utilisateur correct');
            this.assert(result.gamification_points === 0, 'Points réinitialisés à 0');

            this.addTestResult('Réinitialisation points gamification', true);
            console.log('✅ Test réinitialisation points gamification réussi');

        } catch (error) {
            this.addTestResult('Réinitialisation points gamification', false, error.message);
            console.error('❌ Test réinitialisation points gamification échoué:', error.message);
        }
    }

    /**
     * Assertion helper
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    /**
     * Ajouter un résultat de test
     */
    addTestResult(testName, success, error = null) {
        this.testResults.push({
            test: testName,
            success: success,
            error: error,
            timestamp: new Date()
        });
    }

    /**
     * Exécuter tous les tests
     */
    async runAllTests() {
        console.log('🚀 Démarrage des tests GamificationService...\n');

        const tests = [
            () => this.testUnlockFirstSaleAchievement(),
            () => this.testUnlockSilverRankAchievement(),
            () => this.testGetUserStats(),
            () => this.testGetUserAchievements(),
            () => this.testGetLeaderboard(),
            () => this.testGetActiveQuests(),
            () => this.testCompleteQuest(),
            () => this.testGetGamificationStats(),
            () => this.testEvaluateAchievementCondition(),
            () => this.testCreateAchievementNotification(),
            () => this.testResetGamificationPoints()
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error('Erreur inattendue:', error.message);
            }
        }

        this.printResults();
    }

    /**
     * Afficher les résultats
     */
    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RÉSULTATS DES TESTS GAMIFICATION');
        console.log('='.repeat(60));

        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;

        console.log(`✅ Tests réussis: ${successfulTests}/${totalTests}`);
        console.log(`❌ Tests échoués: ${failedTests}/${totalTests}`);

        if (failedTests > 0) {
            console.log('\n❌ Détails des échecs:');
            this.testResults
                .filter(r => !r.success)
                .forEach(result => {
                    console.log(`  - ${result.test}: ${result.error}`);
                });
        }

        console.log('='.repeat(60));
        console.log(`🎯 Taux de réussite: ${Math.round((successfulTests / totalTests) * 100)}%`);

        return {
            total: totalTests,
            successful: successfulTests,
            failed: failedTests,
            results: this.testResults
        };
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    const test = new GamificationServiceTest();
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = GamificationServiceTest;
