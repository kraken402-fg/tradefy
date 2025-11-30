const User = require('../models/User');

/**
 * Tests pour User model
 */
class UserTest {
    constructor() {
        this.mockDb = {
            query: jest.fn()
        };
        this.user = new User(this.mockDb);
        this.testResults = [];
    }

    /**
     * Test création utilisateur valide
     */
    async testCreateUser() {
        try {
            console.log('🧪 Test: Création utilisateur valide...');

            const userData = {
                email: 'test@example.com',
                username: 'testuser',
                password_hash: '$2b$10$hashedpassword',
                full_name: 'Test User',
                phone: '+237123456789',
                role: 'vendor',
                status: 'active',
                rank: 'Bronze',
                commission_rate: 450
            };

            // Mock insertion utilisateur
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, ...userData, created_at: new Date(), updated_at: new Date() }] 
            });

            const result = await this.user.create(userData);

            this.assert(result.id === 1, 'ID utilisateur généré');
            this.assert(result.email === userData.email, 'Email correct');
            this.assert(result.username === userData.username, 'Username correct');
            this.assert(result.role === userData.role, 'Rôle correct');

            this.addTestResult('Création utilisateur valide', true);
            console.log('✅ Test création utilisateur valide réussi');

        } catch (error) {
            this.addTestResult('Création utilisateur valide', false, error.message);
            console.error('❌ Test création utilisateur valide échoué:', error.message);
        }
    }

    /**
     * Test recherche utilisateur par ID
     */
    async testFindById() {
        try {
            console.log('🧪 Test: Recherche utilisateur par ID...');

            const userId = 1;
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                username: 'testuser',
                full_name: 'Test User',
                role: 'vendor'
            };

            // Mock recherche
            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

            const result = await this.user.findById(userId);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.email === mockUser.email, 'Email correct');
            this.assert(result.username === mockUser.username, 'Username correct');

            this.addTestResult('Recherche utilisateur par ID', true);
            console.log('✅ Test recherche utilisateur par ID réussi');

        } catch (error) {
            this.addTestResult('Recherche utilisateur par ID', false, error.message);
            console.error('❌ Test recherche utilisateur par ID échoué:', error.message);
        }
    }

    /**
     * Test recherche utilisateur par email
     */
    async testFindByEmail() {
        try {
            console.log('🧪 Test: Recherche utilisateur par email...');

            const email = 'test@example.com';
            const mockUser = {
                id: 1,
                email: email,
                username: 'testuser',
                full_name: 'Test User'
            };

            // Mock recherche par email
            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

            const result = await this.user.findByEmail(email);

            this.assert(result.email === email, 'Email correct');
            this.assert(result.id === 1, 'ID utilisateur correct');

            this.addTestResult('Recherche utilisateur par email', true);
            console.log('✅ Test recherche utilisateur par email réussi');

        } catch (error) {
            this.addTestResult('Recherche utilisateur par email', false, error.message);
            console.error('❌ Test recherche utilisateur par email échoué:', error.message);
        }
    }

    /**
     * Test recherche utilisateur par username
     */
    async testFindByUsername() {
        try {
            console.log('🧪 Test: Recherche utilisateur par username...');

            const username = 'testuser';
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                username: username,
                full_name: 'Test User'
            };

            // Mock recherche par username
            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

            const result = await this.user.findByUsername(username);

            this.assert(result.username === username, 'Username correct');
            this.assert(result.id === 1, 'ID utilisateur correct');

            this.addTestResult('Recherche utilisateur par username', true);
            console.log('✅ Test recherche utilisateur par username réussi');

        } catch (error) {
            this.addTestResult('Recherche utilisateur par username', false, error.message);
            console.error('❌ Test recherche utilisateur par username échoué:', error.message);
        }
    }

    /**
     * Test mise à jour utilisateur
     */
    async testUpdateUser() {
        try {
            console.log('🧪 Test: Mise à jour utilisateur...');

            const userId = 1;
            const updateData = {
                full_name: 'Updated Name',
                phone: '+237987654321',
                bio: 'Updated bio'
            };

            // Mock mise à jour
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: userId, ...updateData, updated_at: new Date() }] 
            });

            const result = await this.user.update(userId, updateData);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.full_name === updateData.full_name, 'Nom mis à jour');
            this.assert(result.phone === updateData.phone, 'Téléphone mis à jour');

            this.addTestResult('Mise à jour utilisateur', true);
            console.log('✅ Test mise à jour utilisateur réussi');

        } catch (error) {
            this.addTestResult('Mise à jour utilisateur', false, error.message);
            console.error('❌ Test mise à jour utilisateur échoué:', error.message);
        }
    }

    /**
     * Test mise à jour mot de passe
     */
    async testUpdatePassword() {
        try {
            console.log('🧪 Test: Mise à jour mot de passe...');

            const userId = 1;
            const newPasswordHash = '$2b$10$newhashedpassword';

            // Mock mise à jour mot de passe
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: userId, password_hash: newPasswordHash, updated_at: new Date() }] 
            });

            const result = await this.user.updatePassword(userId, newPasswordHash);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.password_hash === newPasswordHash, 'Mot de passe mis à jour');

            this.addTestResult('Mise à jour mot de passe', true);
            console.log('✅ Test mise à jour mot de passe réussi');

        } catch (error) {
            this.addTestResult('Mise à jour mot de passe', false, error.message);
            console.error('❌ Test mise à jour mot de passe échoué:', error.message);
        }
    }

    /**
     * Test mise à jour statut utilisateur
     */
    async testUpdateStatus() {
        try {
            console.log('🧪 Test: Mise à jour statut utilisateur...');

            const userId = 1;
            const newStatus = 'inactive';

            // Mock mise à jour statut
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: userId, status: newStatus, updated_at: new Date() }] 
            });

            const result = await this.user.updateStatus(userId, newStatus);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.status === newStatus, 'Statut mis à jour');

            this.addTestResult('Mise à jour statut utilisateur', true);
            console.log('✅ Test mise à jour statut utilisateur réussi');

        } catch (error) {
            this.addTestResult('Mise à jour statut utilisateur', false, error.message);
            console.error('❌ Test mise à jour statut utilisateur échoué:', error.message);
        }
    }

    /**
     * Test mise à jour statistiques ventes
     */
    async testUpdateSalesStats() {
        try {
            console.log('🧪 Test: Mise à jour statistiques ventes...');

            const userId = 1;
            const salesData = {
                total_sales: 50,
                total_revenue: 500000,
                average_order_value: 10000
            };

            // Mock mise à jour statistiques
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: userId, ...salesData, updated_at: new Date() }] 
            });

            const result = await this.user.updateSalesStats(userId, salesData);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.total_sales === salesData.total_sales, 'Total ventes mis à jour');
            this.assert(result.total_revenue === salesData.total_revenue, 'Total revenus mis à jour');

            this.addTestResult('Mise à jour statistiques ventes', true);
            console.log('✅ Test mise à jour statistiques ventes réussi');

        } catch (error) {
            this.addTestResult('Mise à jour statistiques ventes', false, error.message);
            console.error('❌ Test mise à jour statistiques ventes échoué:', error.message);
        }
    }

    /**
     * Test mise à jour rang utilisateur
     */
    async testUpdateRank() {
        try {
            console.log('🧪 Test: Mise à jour rang utilisateur...');

            const userId = 1;
            const newRank = 'Silver';
            const newCommissionRate = 425;

            // Mock mise à jour rang
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ 
                    id: userId, 
                    rank: newRank, 
                    commission_rate: newCommissionRate, 
                    updated_at: new Date() 
                }] 
            });

            const result = await this.user.updateRank(userId, newRank, newCommissionRate);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.rank === newRank, 'Rang mis à jour');
            this.assert(result.commission_rate === newCommissionRate, 'Taux commission mis à jour');

            this.addTestResult('Mise à jour rang utilisateur', true);
            console.log('✅ Test mise à jour rang utilisateur réussi');

        } catch (error) {
            this.addTestResult('Mise à jour rang utilisateur', false, error.message);
            console.error('❌ Test mise à jour rang utilisateur échoué:', error.message);
        }
    }

    /**
     * Test obtention meilleurs vendeurs
     */
    async testGetTopVendors() {
        try {
            console.log('🧪 Test: Obtention meilleurs vendeurs...');

            const limit = 10;

            // Mock meilleurs vendeurs
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    {
                        id: 1,
                        username: 'vendor1',
                        full_name: 'Vendor One',
                        total_sales: 100,
                        total_revenue: 1000000,
                        average_rating: 4.8
                    },
                    {
                        id: 2,
                        username: 'vendor2',
                        full_name: 'Vendor Two',
                        total_sales: 85,
                        total_revenue: 850000,
                        average_rating: 4.6
                    }
                ] 
            });

            const result = await this.user.getTopVendors(limit);

            this.assert(Array.isArray(result), 'Résultat en tableau');
            this.assert(result.length === 2, '2 vendeurs trouvés');
            this.assert(result[0].total_sales === 100, 'Premier vendeur 100 ventes');

            this.addTestResult('Obtention meilleurs vendeurs', true);
            console.log('✅ Test obtention meilleurs vendeurs réussi');

        } catch (error) {
            this.addTestResult('Obtention meilleurs vendeurs', false, error.message);
            console.error('❌ Test obtention meilleurs vendeurs échoué:', error.message);
        }
    }

    /**
     * Test statistiques utilisateur
     */
    async testGetUserStats() {
        try {
            console.log('🧪 Test: Statistiques utilisateur...');

            const userId = 1;

            // Mock statistiques
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    id: userId,
                    username: 'testuser',
                    total_sales: 50,
                    total_revenue: 500000,
                    average_order_value: 10000,
                    total_products: 25,
                    customer_rating: 4.7,
                    rank: 'Gold'
                }] 
            });

            const result = await this.user.getUserStats(userId);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.total_sales === 50, '50 ventes totales');
            this.assert(result.total_revenue === 500000, '500,000 FCFA revenus');
            this.assert(result.rank === 'Gold', 'Rang Gold');

            this.addTestResult('Statistiques utilisateur', true);
            console.log('✅ Test statistiques utilisateur réussi');

        } catch (error) {
            this.addTestResult('Statistiques utilisateur', false, error.message);
            console.error('❌ Test statistiques utilisateur échoué:', error.message);
        }
    }

    /**
     * Test liste utilisateurs avec pagination
     */
    async testGetUsersWithPagination() {
        try {
            console.log('🧪 Test: Liste utilisateurs avec pagination...');

            const filters = {
                role: 'vendor',
                status: 'active'
            };
            const page = 1;
            const perPage = 20;

            // Mock utilisateurs
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, username: 'vendor1', role: 'vendor', status: 'active' },
                    { id: 2, username: 'vendor2', role: 'vendor', status: 'active' }
                ] 
            });

            // Mock comptage
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ count: '25' }] 
            });

            const result = await this.user.getUsersWithPagination(filters, page, perPage);

            this.assert(Array.isArray(result.users), 'Utilisants en tableau');
            this.assert(result.users.length === 2, '2 utilisateurs trouvés');
            this.assert(result.pagination.total === 25, 'Total de 25 utilisateurs');

            this.addTestResult('Liste utilisateurs avec pagination', true);
            console.log('✅ Test liste utilisateurs avec pagination réussi');

        } catch (error) {
            this.addTestResult('Liste utilisateurs avec pagination', false, error.message);
            console.error('❌ Test liste utilisateurs avec pagination échoué:', error.message);
        }
    }

    /**
     * Test désactivation utilisateur
     */
    async testDeactivateUser() {
        try {
            console.log('🧪 Test: Désactivation utilisateur...');

            const userId = 1;
            const reason = 'Violation des termes';

            // Mock désactivation
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ 
                    id: userId, 
                    status: 'inactive', 
                    deactivation_reason: reason,
                    deactivated_at: new Date() 
                }] 
            });

            const result = await this.user.deactivateUser(userId, reason);

            this.assert(result.id === userId, 'ID utilisateur correct');
            this.assert(result.status === 'inactive', 'Statut inactif');
            this.assert(result.deactivation_reason === reason, 'Raison de désactivation');

            this.addTestResult('Désactivation utilisateur', true);
            console.log('✅ Test désactivation utilisateur réussi');

        } catch (error) {
            this.addTestResult('Désactivation utilisateur', false, error.message);
            console.error('❌ Test désactivation utilisateur échoué:', error.message);
        }
    }

    /**
     * Test vérification email unique
     */
    async testCheckEmailUnique() {
        try {
            console.log('🧪 Test: Vérification email unique...');

            const email = 'new@example.com';
            const excludeUserId = 1;

            // Mock email non existant
            this.mockDb.query.mockResolvedValueOnce({ rows: [] });

            const result = await this.user.checkEmailUnique(email, excludeUserId);

            this.assert(result.isUnique === true, 'Email unique');

            // Mock email existant
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 2, email: email }] 
            });

            const result2 = await this.user.checkEmailUnique(email, excludeUserId);

            this.assert(result2.isUnique === false, 'Email non unique');

            this.addTestResult('Vérification email unique', true);
            console.log('✅ Test vérification email unique réussi');

        } catch (error) {
            this.addTestResult('Vérification email unique', false, error.message);
            console.error('❌ Test vérification email unique échoué:', error.message);
        }
    }

    /**
     * Test vérification username unique
     */
    async testCheckUsernameUnique() {
        try {
            console.log('🧪 Test: Vérification username unique...');

            const username = 'newuser';
            const excludeUserId = 1;

            // Mock username non existant
            this.mockDb.query.mockResolvedValueOnce({ rows: [] });

            const result = await this.user.checkUsernameUnique(username, excludeUserId);

            this.assert(result.isUnique === true, 'Username unique');

            // Mock username existant
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 2, username: username }] 
            });

            const result2 = await this.user.checkUsernameUnique(username, excludeUserId);

            this.assert(result2.isUnique === false, 'Username non unique');

            this.addTestResult('Vérification username unique', true);
            console.log('✅ Test vérification username unique réussi');

        } catch (error) {
            this.addTestResult('Vérification username unique', false, error.message);
            console.error('❌ Test vérification username unique échoué:', error.message);
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
        console.log('🚀 Démarrage des tests User...\n');

        const tests = [
            () => this.testCreateUser(),
            () => this.testFindById(),
            () => this.testFindByEmail(),
            () => this.testFindByUsername(),
            () => this.testUpdateUser(),
            () => this.testUpdatePassword(),
            () => this.testUpdateStatus(),
            () => this.testUpdateSalesStats(),
            () => this.testUpdateRank(),
            () => this.testGetTopVendors(),
            () => this.testGetUserStats(),
            () => this.testGetUsersWithPagination(),
            () => this.testDeactivateUser(),
            () => this.testCheckEmailUnique(),
            () => this.testCheckUsernameUnique()
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
        console.log('📋 RÉSULTATS DES TESTS USER');
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
    const test = new UserTest();
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = UserTest;
