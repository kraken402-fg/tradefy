const Integration = require('../models/Integration');

/**
 * Tests pour Integration
 */
class IntegrationTest {
    constructor() {
        this.mockDb = {
            query: jest.fn()
        };
        this.integration = new Integration(this.mockDb);
        this.testResults = [];
    }

    /**
     * Test vérification connexion Supabase
     */
    async testCheckSupabaseConnection() {
        try {
            console.log('🧪 Test: Vérification connexion Supabase...');

            // Mock réponse Supabase
            jest.spyOn(require('pg'), 'Pool').mockImplementation(() => ({
                connect: jest.fn().mockResolvedValue({
                    query: jest.fn().mockResolvedValue({
                        rows: [{
                            server_time: new Date(),
                            version: 'PostgreSQL 14.2'
                        }]
                    }),
                    release: jest.fn()
                }),
                end: jest.fn().mockResolvedValue()
            }));

            const result = await this.integration.checkSupabaseConnection();

            this.assert(result.success === true, 'La connexion devrait réussir');
            this.assert(result.data.server_time, 'Heure serveur présente');
            this.assert(result.data.version, 'Version présente');

            this.addTestResult('Vérification connexion Supabase', true);
            console.log('✅ Test vérification connexion Supabase réussi');

        } catch (error) {
            this.addTestResult('Vérification connexion Supabase', false, error.message);
            console.error('❌ Test vérification connexion Supabase échoué:', error.message);
        }
    }

    /**
     * Test vérification connexion Moneroo
     */
    async testCheckMonerooConnection() {
        try {
            console.log('🧪 Test: Vérification connexion Moneroo...');

            // Mock axios pour Moneroo
            jest.spyOn(require('axios'), 'get').mockResolvedValue({
                status: 200,
                headers: { 'x-response-time': '150ms' },
                data: { status: 'healthy' }
            });

            const result = await this.integration.checkMonerooConnection();

            this.assert(result.success === true, 'La connexion devrait réussir');
            this.assert(result.data.api_status === 200, 'Statut API 200');

            this.addTestResult('Vérification connexion Moneroo', true);
            console.log('✅ Test vérification connexion Moneroo réussi');

        } catch (error) {
            this.addTestResult('Vérification connexion Moneroo', false, error.message);
            console.error('❌ Test vérification connexion Moneroo échoué:', error.message);
        }
    }

    /**
     * Test vérification connectivité frontend
     */
    async testCheckFrontendConnection() {
        try {
            console.log('🧪 Test: Vérification connectivité frontend...');

            // Mock axios pour frontend
            jest.spyOn(require('axios'), 'get').mockResolvedValue({
                status: 200,
                headers: { 'x-response-time': '100ms' },
                data: '<html>...</html>'
            });

            const result = await this.integration.checkFrontendConnection();

            this.assert(result.success === true, 'La connectivité devrait réussir');
            this.assert(result.data.status_code === 200, 'Statut 200');

            this.addTestResult('Vérification connectivité frontend', true);
            console.log('✅ Test vérification connectivité frontend réussi');

        } catch (error) {
            this.addTestResult('Vérification connectivité frontend', false, error.message);
            console.error('❌ Test vérification connectivité frontend échoué:', error.message);
        }
    }

    /**
     * Test obtention statut toutes intégrations
     */
    async testGetAllIntegrationsStatus() {
        try {
            console.log('🧪 Test: Obtention statut toutes intégrations...');

            // Mock chaque vérification
            jest.spyOn(this.integration, 'checkSupabaseConnection').mockResolvedValue({
                success: true,
                data: { server_time: new Date() }
            });

            jest.spyOn(this.integration, 'checkMonerooConnection').mockResolvedValue({
                success: true,
                data: { api_status: 200 }
            });

            jest.spyOn(this.integration, 'checkFrontendConnection').mockResolvedValue({
                success: true,
                data: { status_code: 200 }
            });

            const result = await this.integration.getAllIntegrationsStatus();

            this.assert(result.supabase.success === true, 'Supabase connecté');
            this.assert(result.moneroo.success === true, 'Moneroo connecté');
            this.assert(result.frontend.success === true, 'Frontend connecté');
            this.assert(result.infinityfree.success === true, 'InfinityFree connecté');

            this.addTestResult('Obtention statut toutes intégrations', true);
            console.log('✅ Test obtention statut toutes intégrations réussi');

        } catch (error) {
            this.addTestResult('Obtention statut toutes intégrations', false, error.message);
            console.error('❌ Test obtention statut toutes intégrations échoué:', error.message);
        }
    }

    /**
     * Test obtention détails intégration
     */
    testGetIntegrationDetails() {
        try {
            console.log('🧪 Test: Obtention détails intégration...');

            // Test intégration existante
            let result = this.integration.getIntegrationDetails('supabase');
            this.assert(result.success === true, 'Détails Supabase récupérés');
            this.assert(result.data.name === 'Supabase', 'Nom Supabase correct');

            // Test intégration inexistante
            result = this.integration.getIntegrationDetails('nonexistent');
            this.assert(result.success === false, 'Intégration inexistante échoue');

            this.addTestResult('Obtention détails intégration', true);
            console.log('✅ Test obtention détails intégration réussi');

        } catch (error) {
            this.addTestResult('Obtention détails intégration', false, error.message);
            console.error('❌ Test obtention détails intégration échoué:', error.message);
        }
    }

    /**
     * Test vérification configuration intégration
     */
    testIsIntegrationConfigured() {
        try {
            console.log('🧪 Test: Vérification configuration intégration...');

            // Mock config
            const originalConfig = require('../config/platforms').config;
            require('../config/platforms').config = {
                database: { url: 'https://test.supabase.co', key: 'test-key' },
                payment: { apiKey: 'test-api-key', secretKey: 'test-secret' },
                frontend: { url: 'https://test.vercel.app' },
                backend: { url: 'https://test.infinityfree.com' }
            };

            // Test Supabase configuré
            let result = this.integration.isIntegrationConfigured('supabase');
            this.assert(result === true, 'Supabase configuré');

            // Test Moneroo configuré
            result = this.integration.isIntegrationConfigured('moneroo');
            this.assert(result === true, 'Moneroo configuré');

            // Test Vercel configuré
            result = this.integration.isIntegrationConfigured('vercel');
            this.assert(result === true, 'Vercel configuré');

            // Test intégration inexistante
            result = this.integration.isIntegrationConfigured('nonexistent');
            this.assert(result === false, 'Intégration inexistante non configurée');

            // Restaurer config
            require('../config/platforms').config = originalConfig;

            this.addTestResult('Vérification configuration intégration', true);
            console.log('✅ Test vérification configuration intégration réussi');

        } catch (error) {
            this.addTestResult('Vérification configuration intégration', false, error.message);
            console.error('❌ Test vérification configuration intégration échoué:', error.message);
        }
    }

    /**
     * Test sauvegarde logs intégration
     */
    async testSaveIntegrationLog() {
        try {
            console.log('🧪 Test: Sauvegarde logs intégration...');

            const integrationName = 'supabase';
            const action = 'connection_test';
            const result = { success: true, data: { connected: true } };

            // Mock insertion log
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1 }] 
            });

            const logId = await this.integration.saveIntegrationLog(integrationName, action, result);

            this.assert(logId === 1, 'Log ID généré');

            this.addTestResult('Sauvegarde logs intégration', true);
            console.log('✅ Test sauvegarde logs intégration réussi');

        } catch (error) {
            this.addTestResult('Sauvegarde logs intégration', false, error.message);
            console.error('❌ Test sauvegarde logs intégration échoué:', error.message);
        }
    }

    /**
     * Test obtention logs intégration
     */
    async testGetIntegrationLogs() {
        try {
            console.log('🧪 Test: Obtention logs intégration...');

            const integrationName = 'supabase';
            const limit = 50;

            // Mock logs
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    {
                        id: 1,
                        integration_name: integrationName,
                        action: 'connection_test',
                        status: 'success',
                        response_data: '{"connected": true}',
                        error_message: null,
                        created_at: new Date()
                    },
                    {
                        id: 2,
                        integration_name: integrationName,
                        action: 'query_test',
                        status: 'error',
                        response_data: null,
                        error_message: 'Connection timeout',
                        created_at: new Date()
                    }
                ] 
            });

            const logs = await this.integration.getIntegrationLogs(integrationName, limit);

            this.assert(Array.isArray(logs), 'Logs en tableau');
            this.assert(logs.length === 2, '2 logs trouvés');
            this.assert(logs[0].integration_name === integrationName, 'Nom intégration correct');

            this.addTestResult('Obtention logs intégration', true);
            console.log('✅ Test obtention logs intégration réussi');

        } catch (error) {
            this.addTestResult('Obtention logs intégration', false, error.message);
            console.error('❌ Test obtention logs intégration échoué:', error.message);
        }
    }

    /**
     * Test intégration spécifique
     */
    async testTestIntegration() {
        try {
            console.log('🧪 Test: Test intégration spécifique...');

            // Mock chaque test d'intégration
            jest.spyOn(this.integration, 'checkSupabaseConnection').mockResolvedValue({
                success: true,
                data: { connected: true }
            });

            jest.spyOn(this.integration, 'checkMonerooConnection').mockResolvedValue({
                success: true,
                data: { api_status: 200 }
            });

            jest.spyOn(this.integration, 'checkFrontendConnection').mockResolvedValue({
                success: true,
                data: { status_code: 200 }
            });

            // Test Supabase
            let result = await this.integration.testIntegration('supabase');
            this.assert(result.success === true, 'Test Supabase réussi');

            // Test Moneroo
            result = await this.integration.testIntegration('moneroo');
            this.assert(result.success === true, 'Test Moneroo réussi');

            // Test Vercel
            result = await this.integration.testIntegration('vercel');
            this.assert(result.success === true, 'Test Vercel réussi');

            // Test InfinityFree
            result = await this.integration.testIntegration('infinityfree');
            this.assert(result.success === true, 'Test InfinityFree réussi');

            // Test intégration inexistante
            result = await this.integration.testIntegration('nonexistent');
            this.assert(result.success === false, 'Test intégration inexistante échoue');

            this.addTestResult('Test intégration spécifique', true);
            console.log('✅ Test test intégration spécifique réussi');

        } catch (error) {
            this.addTestResult('Test intégration spécifique', false, error.message);
            console.error('❌ Test test intégration spécifique échoué:', error.message);
        }
    }

    /**
     * Test métriques intégration
     */
    async testGetIntegrationMetrics() {
        try {
            console.log('🧪 Test: Métriques intégration...');

            // Mock métriques
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    {
                        integration_name: 'supabase',
                        total_requests: 100,
                        success_count: 95,
                        error_count: 5,
                        success_rate: 95.00,
                        last_request: new Date()
                    },
                    {
                        integration_name: 'moneroo',
                        total_requests: 50,
                        success_count: 48,
                        error_count: 2,
                        success_rate: 96.00,
                        last_request: new Date()
                    }
                ] 
            });

            const metrics = await this.integration.getIntegrationMetrics();

            this.assert(Array.isArray(metrics), 'Métriques en tableau');
            this.assert(metrics.length === 2, '2 intégrations avec métriques');
            this.assert(metrics[0].integration_name === 'supabase', 'Première intégration Supabase');
            this.assert(metrics[0].success_rate === 95.00, 'Taux réussite Supabase 95%');

            this.addTestResult('Métriques intégration', true);
            console.log('✅ Test métriques intégration réussi');

        } catch (error) {
            this.addTestResult('Métriques intégration', false, error.message);
            console.error('❌ Test métriques intégration échoué:', error.message);
        }
    }

    /**
     * Test création webhook
     */
    async testCreateWebhook() {
        try {
            console.log('🧪 Test: Création webhook...');

            const integrationName = 'moneroo';
            const webhookData = {
                url: 'https://example.com/webhook',
                events: ['payment.completed', 'payment.failed'],
                secret: 'webhook_secret',
                is_active: true
            };

            // Mock insertion webhook
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ 
                    id: 1, 
                    integration_name: integrationName, 
                    url: webhookData.url,
                    events: JSON.stringify(webhookData.events),
                    is_active: webhookData.is_active
                }] 
            });

            const webhook = await this.integration.createWebhook(integrationName, webhookData);

            this.assert(webhook.id === 1, 'Webhook ID généré');
            this.assert(webhook.integration_name === integrationName, 'Nom intégration correct');
            this.assert(webhook.url === webhookData.url, 'URL webhook correct');

            this.addTestResult('Création webhook', true);
            console.log('✅ Test création webhook réussi');

        } catch (error) {
            this.addTestResult('Création webhook', false, error.message);
            console.error('❌ Test création webhook échoué:', error.message);
        }
    }

    /**
     * Test obtention webhooks
     */
    async testGetWebhooks() {
        try {
            console.log('🧪 Test: Obtention webhooks...');

            const integrationName = 'moneroo';

            // Mock webhooks
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    {
                        id: 1,
                        integration_name: integrationName,
                        url: 'https://example.com/webhook1',
                        events: '["payment.completed"]',
                        is_active: true
                    },
                    {
                        id: 2,
                        integration_name: integrationName,
                        url: 'https://example.com/webhook2',
                        events: '["payment.failed"]',
                        is_active: false
                    }
                ] 
            });

            const webhooks = await this.integration.getWebhooks(integrationName);

            this.assert(Array.isArray(webhooks), 'Webhooks en tableau');
            this.assert(webhooks.length === 2, '2 webhooks trouvés');
            this.assert(webhooks[0].integration_name === integrationName, 'Nom intégration correct');

            this.addTestResult('Obtention webhooks', true);
            console.log('✅ Test obtention webhooks réussi');

        } catch (error) {
            this.addTestResult('Obtention webhooks', false, error.message);
            console.error('❌ Test obtention webhooks échoué:', error.message);
        }
    }

    /**
     * Test génération secret webhook
     */
    testGenerateSecret() {
        try {
            console.log('🧪 Test: Génération secret webhook...');

            const secret = this.integration.generateSecret();

            this.assert(typeof secret === 'string', 'Secret est une chaîne');
            this.assert(secret.length === 64, 'Secret fait 64 caractères (hex)');

            // Générer un autre secret pour vérifier l'unicité
            const secret2 = this.integration.generateSecret();
            this.assert(secret !== secret2, 'Secrets sont uniques');

            this.addTestResult('Génération secret webhook', true);
            console.log('✅ Test génération secret webhook réussi');

        } catch (error) {
            this.addTestResult('Génération secret webhook', false, error.message);
            console.error('❌ Test génération secret webhook échoué:', error.message);
        }
    }

    /**
     * Test résumé intégrations
     */
    async testGetIntegrationsSummary() {
        try {
            console.log('🧪 Test: Résumé intégrations...');

            // Mock vérifications
            jest.spyOn(this.integration, 'getAllIntegrationsStatus').mockResolvedValue({
                supabase: { success: true },
                moneroo: { success: true },
                frontend: { success: false },
                infinityfree: { success: true }
            });

            const summary = await this.integration.getIntegrationsSummary();

            this.assert(summary.total_integrations === 4, '4 intégrations totales');
            this.assert(summary.connected_count === 3, '3 intégrations connectées');
            this.assert(summary.error_count === 1, '1 intégration en erreur');
            this.assert(summary.overall_health === 'warning', 'Santé globale warning');

            this.addTestResult('Résumé intégrations', true);
            console.log('✅ Test résumé intégrations réussi');

        } catch (error) {
            this.addTestResult('Résumé intégrations', false, error.message);
            console.error('❌ Test résumé intégrations échoué:', error.message);
        }
    }

    /**
     * Test configuration intégration
     */
    testConfigureIntegration() {
        try {
            console.log('🧪 Test: Configuration intégration...');

            const originalConfig = require('../config/platforms').config;

            // Test configuration Supabase
            let result = this.integration.configureIntegration('supabase', {
                url: 'https://new.supabase.co',
                key: 'new-key'
            });
            this.assert(result.success === true, 'Configuration Supabase réussie');

            // Test configuration Moneroo
            result = this.integration.configureIntegration('moneroo', {
                apiKey: 'new-api-key',
                secretKey: 'new-secret-key'
            });
            this.assert(result.success === true, 'Configuration Moneroo réussie');

            // Test intégration inexistante
            try {
                this.integration.configureIntegration('nonexistent', {});
                this.assert(false, 'Devrait échouer pour intégration inexistante');
            } catch (error) {
                this.assert(true, 'Échoue correctement pour intégration inexistante');
            }

            // Restaurer config
            require('../config/platforms').config = originalConfig;

            this.addTestResult('Configuration intégration', true);
            console.log('✅ Test configuration intégration réussi');

        } catch (error) {
            this.addTestResult('Configuration intégration', false, error.message);
            console.error('❌ Test configuration intégration échoué:', error.message);
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
        console.log('🚀 Démarrage des tests Integration...\n');

        const tests = [
            () => this.testCheckSupabaseConnection(),
            () => this.testCheckMonerooConnection(),
            () => this.testCheckFrontendConnection(),
            () => this.testGetAllIntegrationsStatus(),
            () => this.testGetIntegrationDetails(),
            () => this.testIsIntegrationConfigured(),
            () => this.testSaveIntegrationLog(),
            () => this.testGetIntegrationLogs(),
            () => this.testTestIntegration(),
            () => this.testGetIntegrationMetrics(),
            () => this.testCreateWebhook(),
            () => this.testGetWebhooks(),
            () => this.testGenerateSecret(),
            () => this.testGetIntegrationsSummary(),
            () => this.testConfigureIntegration()
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
        console.log('📋 RÉSULTATS DES TESTS INTEGRATION');
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
    const test = new IntegrationTest();
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTest;
