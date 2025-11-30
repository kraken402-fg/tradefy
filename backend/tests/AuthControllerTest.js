const AuthController = require('../controllers/AuthController');
const User = require('../models/User');
const Security = require('../utils/Security');

/**
 * Tests pour AuthController
 */
class AuthControllerTest {
    constructor() {
        this.mockDb = {
            query: jest.fn()
        };
        this.authController = new AuthController(this.mockDb);
        this.testResults = [];
    }

    /**
     * Test d'inscription valide
     */
    async testValidRegistration() {
        try {
            console.log('🧪 Test: Inscription valide...');
            
            const userData = {
                email: 'test@example.com',
                password: 'Password123!',
                username: 'testuser',
                full_name: 'Test User',
                phone: '+237123456789'
            };

            // Mock de la base de données
            this.mockDb.query.mockResolvedValueOnce({ rows: [] }); // Email non existant
            this.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Utilisateur créé

            const result = await this.authController.register(userData);

            this.assert(result.success === true, 'L\'inscription devrait réussir');
            this.assert(result.status === 201, 'Le statut devrait être 201');
            this.assert(result.data.user.email === userData.email, 'L\'email devrait correspondre');

            this.addTestResult('Inscription valide', true);
            console.log('✅ Test inscription valide réussi');

        } catch (error) {
            this.addTestResult('Inscription valide', false, error.message);
            console.error('❌ Test inscription valide échoué:', error.message);
        }
    }

    /**
     * Test d'inscription avec email invalide
     */
    async testInvalidEmailRegistration() {
        try {
            console.log('🧪 Test: Inscription email invalide...');
            
            const userData = {
                email: 'invalid-email',
                password: 'Password123!',
                username: 'testuser',
                full_name: 'Test User'
            };

            const result = await this.authController.register(userData);

            this.assert(result.success === false, 'L\'inscription devrait échouer');
            this.assert(result.status === 400, 'Le statut devrait être 400');

            this.addTestResult('Inscription email invalide', true);
            console.log('✅ Test email invalide réussi');

        } catch (error) {
            this.addTestResult('Inscription email invalide', false, error.message);
            console.error('❌ Test email invalide échoué:', error.message);
        }
    }

    /**
     * Test de mot de passe faible
     */
    async testWeakPasswordRegistration() {
        try {
            console.log('🧪 Test: Inscription mot de passe faible...');
            
            const userData = {
                email: 'test@example.com',
                password: '123',
                username: 'testuser',
                full_name: 'Test User'
            };

            const result = await this.authController.register(userData);

            this.assert(result.success === false, 'L\'inscription devrait échouer');
            this.assert(result.status === 400, 'Le statut devrait être 400');

            this.addTestResult('Inscription mot de passe faible', true);
            console.log('✅ Test mot de passe faible réussi');

        } catch (error) {
            this.addTestResult('Inscription mot de passe faible', false, error.message);
            console.error('❌ Test mot de passe faible échoué:', error.message);
        }
    }

    /**
     * Test de connexion valide
     */
    async testValidLogin() {
        try {
            console.log('🧪 Test: Connexion valide...');
            
            const loginData = {
                email: 'test@example.com',
                password: 'Password123!'
            };

            // Mock utilisateur existant
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password_hash: '$2b$10$hashedpassword',
                status: 'active'
            };

            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
            jest.spyOn(Security, 'comparePassword').mockResolvedValue(true);
            jest.spyOn(Security, 'generateTokens').mockReturnValue({
                accessToken: 'access_token',
                refreshToken: 'refresh_token'
            });

            const result = await this.authController.login(loginData);

            this.assert(result.success === true, 'La connexion devrait réussir');
            this.assert(result.status === 200, 'Le statut devrait être 200');
            this.assert(result.data.tokens, 'Les tokens devraient être présents');

            this.addTestResult('Connexion valide', true);
            console.log('✅ Test connexion valide réussi');

        } catch (error) {
            this.addTestResult('Connexion valide', false, error.message);
            console.error('❌ Test connexion valide échoué:', error.message);
        }
    }

    /**
     * Test de connexion avec mauvais mot de passe
     */
    async testInvalidPasswordLogin() {
        try {
            console.log('🧪 Test: Connexion mot de passe invalide...');
            
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password_hash: '$2b$10$hashedpassword',
                status: 'active'
            };

            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
            jest.spyOn(Security, 'comparePassword').mockResolvedValue(false);

            const result = await this.authController.login(loginData);

            this.assert(result.success === false, 'La connexion devrait échouer');
            this.assert(result.status === 401, 'Le statut devrait être 401');

            this.addTestResult('Connexion mot de passe invalide', true);
            console.log('✅ Test mot de passe invalide réussi');

        } catch (error) {
            this.addTestResult('Connexion mot de passe invalide', false, error.message);
            console.error('❌ Test mot de passe invalide échoué:', error.message);
        }
    }

    /**
     * Test de rafraîchissement de token
     */
    async testTokenRefresh() {
        try {
            console.log('🧪 Test: Rafraîchissement token...');
            
            const refreshData = {
                refresh_token: 'valid_refresh_token'
            };

            jest.spyOn(Security, 'verifyRefreshToken').mockReturnValue({ user_id: 1 });
            jest.spyOn(Security, 'generateTokens').mockReturnValue({
                accessToken: 'new_access_token',
                refreshToken: 'new_refresh_token'
            });

            const result = await this.authController.refreshToken(refreshData);

            this.assert(result.success === true, 'Le rafraîchissement devrait réussir');
            this.assert(result.status === 200, 'Le statut devrait être 200');

            this.addTestResult('Rafraîchissement token', true);
            console.log('✅ Test rafraîchissement token réussi');

        } catch (error) {
            this.addTestResult('Rafraîchissement token', false, error.message);
            console.error('❌ Test rafraîchissement token échoué:', error.message);
        }
    }

    /**
     * Test de récupération de profil
     */
    async testGetProfile() {
        try {
            console.log('🧪 Test: Récupération profil...');
            
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                username: 'testuser',
                full_name: 'Test User'
            };

            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

            const result = await this.authController.getProfile({ user_id: 1 });

            this.assert(result.success === true, 'La récupération devrait réussir');
            this.assert(result.data.user.email === mockUser.email, 'L\'email devrait correspondre');

            this.addTestResult('Récupération profil', true);
            console.log('✅ Test récupération profil réussi');

        } catch (error) {
            this.addTestResult('Récupération profil', false, error.message);
            console.error('❌ Test récupération profil échoué:', error.message);
        }
    }

    /**
     * Test de changement de mot de passe
     */
    async testChangePassword() {
        try {
            console.log('🧪 Test: Changement mot de passe...');
            
            const passwordData = {
                current_password: 'OldPassword123!',
                new_password: 'NewPassword123!'
            };

            const mockUser = {
                id: 1,
                password_hash: '$2b$10$hashedpassword'
            };

            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
            jest.spyOn(Security, 'comparePassword').mockResolvedValue(true);
            jest.spyOn(Security, 'hashPassword').mockResolvedValue('new_hashed_password');

            const result = await this.authController.changePassword({ user_id: 1 }, passwordData);

            this.assert(result.success === true, 'Le changement devrait réussir');
            this.assert(result.status === 200, 'Le statut devrait être 200');

            this.addTestResult('Changement mot de passe', true);
            console.log('✅ Test changement mot de passe réussi');

        } catch (error) {
            this.addTestResult('Changement mot de passe', false, error.message);
            console.error('❌ Test changement mot de passe échoué:', error.message);
        }
    }

    /**
     * Test de mot de passe oublié
     */
    async testForgotPassword() {
        try {
            console.log('🧪 Test: Mot de passe oublié...');
            
            const emailData = {
                email: 'test@example.com'
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com'
            };

            this.mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
            jest.spyOn(Security, 'generateResetToken').mockReturnValue('reset_token');

            const result = await this.authController.forgotPassword(emailData);

            this.assert(result.success === true, 'La demande devrait réussir');
            this.assert(result.status === 200, 'Le statut devrait être 200');

            this.addTestResult('Mot de passe oublié', true);
            console.log('✅ Test mot de passe oublié réussi');

        } catch (error) {
            this.addTestResult('Mot de passe oublié', false, error.message);
            console.error('❌ Test mot de passe oublié échoué:', error.message);
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
        console.log('🚀 Démarrage des tests AuthController...\n');

        const tests = [
            () => this.testValidRegistration(),
            () => this.testInvalidEmailRegistration(),
            () => this.testWeakPasswordRegistration(),
            () => this.testValidLogin(),
            () => this.testInvalidPasswordLogin(),
            () => this.testTokenRefresh(),
            () => this.testGetProfile(),
            () => this.testChangePassword(),
            () => this.testForgotPassword()
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
        console.log('📋 RÉSULTATS DES TESTS AUTHCONTROLLER');
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
    const test = new AuthControllerTest();
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = AuthControllerTest;
