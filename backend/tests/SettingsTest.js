const { config } = require('../config/platforms');

/**
 * Tests pour les paramètres et configuration
 */
class SettingsTest {
    constructor() {
        this.testResults = [];
    }

    /**
     * Test configuration plateformes valide
     */
    testValidPlatformConfig() {
        try {
            console.log('🧪 Test: Configuration plateformes valide...');

            // Vérifier que la configuration est chargée
            this.assert(typeof config === 'object', 'La configuration est un objet');
            this.assert(config.frontend, 'Configuration frontend présente');
            this.assert(config.backend, 'Configuration backend présente');
            this.assert(config.database, 'Configuration database présente');
            this.assert(config.payment, 'Configuration payment présente');

            // Vérifier les URLs
            this.assert(typeof config.frontend.url === 'string', 'URL frontend est une chaîne');
            this.assert(typeof config.backend.url === 'string', 'URL backend est une chaîne');

            // Vérifier la configuration de la base de données
            this.assert(config.database.url, 'URL database présente');
            this.assert(config.database.key, 'Clé database présente');

            // Vérifier la configuration de paiement
            this.assert(config.payment.apiKey, 'Clé API paiement présente');
            this.assert(config.payment.secretKey, 'Clé secrète paiement présente');

            this.addTestResult('Configuration plateformes valide', true);
            console.log('✅ Test configuration plateformes valide réussi');

        } catch (error) {
            this.addTestResult('Configuration plateformes valide', false, error.message);
            console.error('❌ Test configuration plateformes valide échoué:', error.message);
        }
    }

    /**
     * Test configuration environnement
     */
    testEnvironmentConfig() {
        try {
            console.log('🧪 Test: Configuration environnement...');

            // Vérifier l'environnement
            this.assert(config.environment, 'Configuration environnement présente');
            this.assert(['development', 'production', 'test'].includes(config.environment), 'Environnement valide');

            // Vérifier la configuration CORS
            this.assert(config.cors, 'Configuration CORS présente');
            this.assert(Array.isArray(config.cors.origins), 'Origines CORS en tableau');

            // Vérifier la configuration rate limiting
            this.assert(config.rateLimit, 'Configuration rate limit présente');
            this.assert(typeof config.rateLimit.windowMs === 'number', 'WindowMs est un nombre');
            this.assert(typeof config.rateLimit.maxRequests === 'number', 'MaxRequests est un nombre');

            this.addTestResult('Configuration environnement', true);
            console.log('✅ Test configuration environnement réussi');

        } catch (error) {
            this.addTestResult('Configuration environnement', false, error.message);
            console.error('❌ Test configuration environnement échoué:', error.message);
        }
    }

    /**
     * Test configuration sécurité
     */
    testSecurityConfig() {
        try {
            console.log('🧪 Test: Configuration sécurité...');

            // Vérifier la configuration JWT
            this.assert(config.security, 'Configuration sécurité présente');
            this.assert(config.security.jwtSecret, 'Secret JWT présent');
            this.assert(typeof config.security.jwtExpiresIn === 'string', 'Expiration JWT est une chaîne');
            this.assert(typeof config.security.refreshExpiresIn === 'string', 'Expiration refresh est une chaîne');

            // Vérifier la configuration mots de passe
            this.assert(config.security.password, 'Configuration mots de passe présente');
            this.assert(typeof config.security.password.minLength === 'number', 'Longueur minimale mot de passe est un nombre');
            this.assert(typeof config.security.password.requireUppercase === 'boolean', 'Exigence majuscule est booléen');
            this.assert(typeof config.security.password.requireNumbers === 'boolean', 'Exigence chiffres est booléen');
            this.assert(typeof config.security.password.requireSpecialChars === 'boolean', 'Exigence caractères spéciaux est booléen');

            this.addTestResult('Configuration sécurité', true);
            console.log('✅ Test configuration sécurité réussi');

        } catch (error) {
            this.addTestResult('Configuration sécurité', false, error.message);
            console.error('❌ Test configuration sécurité échoué:', error.message);
        }
    }

    /**
     * Test configuration application
     */
    testApplicationConfig() {
        try {
            console.log('🧪 Test: Configuration application...');

            // Vérifier la configuration application
            this.assert(config.app, 'Configuration application présente');
            this.assert(typeof config.app.name === 'string', 'Nom application est une chaîne');
            this.assert(typeof config.app.version === 'string', 'Version application est une chaîne');
            this.assert(typeof config.app.port === 'number', 'Port application est un nombre');

            // Vérifier la configuration timeouts
            this.assert(config.timeouts, 'Configuration timeouts présente');
            this.assert(typeof config.timeouts.request === 'number', 'Timeout request est un nombre');
            this.assert(typeof config.timeouts.database === 'number', 'Timeout database est un nombre');

            this.addTestResult('Configuration application', true);
            console.log('✅ Test configuration application réussi');

        } catch (error) {
            this.addTestResult('Configuration application', false, error.message);
            console.error('❌ Test configuration application échoué:', error.message);
        }
    }

    /**
     * Test configuration gamification
     */
    testGamificationConfig() {
        try {
            console.log('🧪 Test: Configuration gamification...');

            // Vérifier la configuration gamification
            this.assert(config.gamification, 'Configuration gamification présente');
            this.assert(typeof config.gamification.enabled === 'boolean', 'Gamification activé est booléen');

            if (config.gamification.enabled) {
                // Vérifier les points par action
                this.assert(config.gamification.points, 'Configuration points présente');
                this.assert(typeof config.gamification.points.firstSale === 'number', 'Points première vente est un nombre');
                this.assert(typeof config.gamification.points.dailyQuest === 'number', 'Points quête quotidienne est un nombre');

                // Vérifier les rangs
                this.assert(config.gamification.ranks, 'Configuration rangs présente');
                this.assert(config.gamification.ranks.Bronze, 'Rang Bronze présent');
                this.assert(config.gamification.ranks.Silver, 'Rang Silver présent');
                this.assert(config.gamification.ranks.Gold, 'Rang Gold présent');
                this.assert(config.gamification.ranks.Senior, 'Rang Senior présent');
            }

            this.addTestResult('Configuration gamification', true);
            console.log('✅ Test configuration gamification réussi');

        } catch (error) {
            this.addTestResult('Configuration gamification', false, error.message);
            console.error('❌ Test configuration gamification échoué:', error.message);
        }
    }

    /**
     * Test configuration email
     */
    testEmailConfig() {
        try {
            console.log('🧪 Test: Configuration email...');

            // Vérifier la configuration email
            this.assert(config.email, 'Configuration email présente');
            this.assert(typeof config.email.enabled === 'boolean', 'Email activé est booléen');

            if (config.email.enabled) {
                this.assert(config.email.smtp, 'Configuration SMTP présente');
                this.assert(config.email.smtp.host, 'Hôte SMTP présent');
                this.assert(typeof config.email.smtp.port === 'number', 'Port SMTP est un nombre');
                this.assert(config.email.smtp.user, 'Utilisateur SMTP présent');
                this.assert(config.email.smtp.pass, 'Mot de passe SMTP présent');

                // Vérifier les adresses email
                this.assert(config.email.from, 'Adresse email expéditeur présente');
                this.assert(config.email.support, 'Adresse email support présente');
            }

            this.addTestResult('Configuration email', true);
            console.log('✅ Test configuration email réussi');

        } catch (error) {
            this.addTestResult('Configuration email', false, error.message);
            console.error('❌ Test configuration email échoué:', error.message);
        }
    }

    /**
     * Test configuration logging
     */
    testLoggingConfig() {
        try {
            console.log('🧪 Test: Configuration logging...');

            // Vérifier la configuration logging
            this.assert(config.logging, 'Configuration logging présente');
            this.assert(typeof config.logging.level === 'string', 'Niveau logging est une chaîne');
            this.assert(['error', 'warn', 'info', 'debug'].includes(config.logging.level), 'Niveau logging valide');

            // Vérifier la configuration fichiers
            this.assert(config.logging.files, 'Configuration fichiers logging présente');
            this.assert(typeof config.logging.files.enabled === 'boolean', 'Fichiers logging activé est booléen');

            if (config.logging.files.enabled) {
                this.assert(config.logging.files.directory, 'Répertoire fichiers logging présent');
                this.assert(typeof config.logging.files.maxSize === 'string', 'Taille maximale fichier est une chaîne');
                this.assert(typeof config.logging.files.maxFiles === 'number', 'Nombre maximal fichiers est un nombre');
            }

            this.addTestResult('Configuration logging', true);
            console.log('✅ Test configuration logging réussi');

        } catch (error) {
            this.addTestResult('Configuration logging', false, error.message);
            console.error('❌ Test configuration logging échoué:', error.message);
        }
    }

    /**
     * Test validation URLs
     */
    testValidateUrls() {
        try {
            console.log('🧪 Test: Validation URLs...');

            // Vérifier que les URLs sont valides
            const urls = [
                config.frontend.url,
                config.backend.url,
                config.database.url
            ];

            urls.forEach(url => {
                try {
                    new URL(url);
                    this.assert(true, `${url} est une URL valide`);
                } catch (error) {
                    this.assert(false, `${url} n'est pas une URL valide`);
                }
            });

            this.addTestResult('Validation URLs', true);
            console.log('✅ Test validation URLs réussi');

        } catch (error) {
            this.addTestResult('Validation URLs', false, error.message);
            console.error('❌ Test validation URLs échoué:', error.message);
        }
    }

    /**
     * Test configuration commission
     */
    testCommissionConfig() {
        try {
            console.log('🧪 Test: Configuration commission...');

            // Vérifier la configuration commission
            this.assert(config.commission, 'Configuration commission présente');

            // Vérifier les rangs de commission
            const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Magnat', 'Senior'];
            ranks.forEach(rank => {
                this.assert(config.commission[rank], `Rang commission ${rank} présent`);
                this.assert(typeof config.commission[rank].rate === 'number', `Taux commission ${rank} est un nombre`);
                this.assert(typeof config.commission[rank].minSales === 'number', `Ventes minimales ${rank} est un nombre`);
            });

            // Vérifier la progression décroissante des taux
            this.assert(config.commission.Bronze.rate > config.commission.Senior.rate, 'Taux Bronze > Senior');

            this.addTestResult('Configuration commission', true);
            console.log('✅ Test configuration commission réussi');

        } catch (error) {
            this.addTestResult('Configuration commission', false, error.message);
            console.error('❌ Test configuration commission échoué:', error.message);
        }
    }

    /**
     * Test configuration monitoring
     */
    testMonitoringConfig() {
        try {
            console.log('🧪 Test: Configuration monitoring...');

            // Vérifier la configuration monitoring
            this.assert(config.monitoring, 'Configuration monitoring présente');
            this.assert(typeof config.monitoring.enabled === 'boolean', 'Monitoring activé est booléen');

            if (config.monitoring.enabled) {
                // Vérifier la configuration analytics
                this.assert(config.monitoring.analytics, 'Configuration analytics présente');
                this.assert(typeof config.monitoring.analytics.enabled === 'boolean', 'Analytics activé est booléen');

                if (config.monitoring.analytics.enabled) {
                    this.assert(config.monitoring.analytics.trackingId, 'ID tracking analytics présent');
                }

                // Vérifier la configuration performance
                this.assert(config.monitoring.performance, 'Configuration performance présente');
                this.assert(typeof config.monitoring.performance.enabled === 'boolean', 'Performance activé est booléen');
            }

            this.addTestResult('Configuration monitoring', true);
            console.log('✅ Test configuration monitoring réussi');

        } catch (error) {
            this.addTestResult('Configuration monitoring', false, error.message);
            console.error('❌ Test configuration monitoring échoué:', error.message);
        }
    }

    /**
     * Test configuration testing
     */
    testTestingConfig() {
        try {
            console.log('🧪 Test: Configuration testing...');

            // Vérifier la configuration testing
            this.assert(config.testing, 'Configuration testing présente');
            this.assert(typeof config.testing.enabled === 'boolean', 'Testing activé est booléen');

            if (config.testing.enabled) {
                // Vérifier la configuration mock
                this.assert(config.testing.mock, 'Configuration mock présente');
                this.assert(typeof config.testing.mock.enabled === 'boolean', 'Mock activé est booléen');

                // Vérifier la configuration coverage
                this.assert(config.testing.coverage, 'Configuration coverage présente');
                this.assert(typeof config.testing.coverage.threshold === 'number', 'Seuil coverage est un nombre');
            }

            this.addTestResult('Configuration testing', true);
            console.log('✅ Test configuration testing réussi');

        } catch (error) {
            this.addTestResult('Configuration testing', false, error.message);
            console.error('❌ Test configuration testing échoué:', error.message);
        }
    }

    /**
     * Test configuration third-party
     */
    testThirdPartyConfig() {
        try {
            console.log('🧪 Test: Configuration third-party...');

            // Vérifier la configuration third-party
            this.assert(config.thirdParty, 'Configuration third-party présente');

            // Vérifier la configuration Supabase
            this.assert(config.thirdParty.supabase, 'Configuration Supabase présente');
            this.assert(config.thirdParty.supabase.url, 'URL Supabase présente');
            this.assert(config.thirdParty.supabase.anonKey, 'Clé anon Supabase présente');

            // Vérifier la configuration Moneroo
            this.assert(config.thirdParty.moneroo, 'Configuration Moneroo présente');
            this.assert(config.thirdParty.moneroo.baseUrl, 'URL base Moneroo présente');
            this.assert(config.thirdParty.moneroo.apiKey, 'Clé API Moneroo présente');

            this.addTestResult('Configuration third-party', true);
            console.log('✅ Test configuration third-party réussi');

        } catch (error) {
            this.addTestResult('Configuration third-party', false, error.message);
            console.error('❌ Test configuration third-party échoué:', error.message);
        }
    }

    /**
     * Test configuration cache
     */
    testCacheConfig() {
        try {
            console.log('🧪 Test: Configuration cache...');

            // Vérifier la configuration cache
            this.assert(config.cache, 'Configuration cache présente');
            this.assert(typeof config.cache.enabled === 'boolean', 'Cache activé est booléen');

            if (config.cache.enabled) {
                // Vérifier la configuration Redis
                this.assert(config.cache.redis, 'Configuration Redis présente');
                this.assert(config.cache.redis.host, 'Hôte Redis présent');
                this.assert(typeof config.cache.redis.port === 'number', 'Port Redis est un nombre');
                this.assert(typeof config.cache.redis.db === 'number', 'DB Redis est un nombre');

                // Vérifier la configuration TTL
                this.assert(config.cache.ttl, 'Configuration TTL présente');
                this.assert(typeof config.cache.ttl.default === 'number', 'TTL par défaut est un nombre');
                this.assert(typeof config.cache.ttl.user === 'number', 'TTL utilisateur est un nombre');
                this.assert(typeof config.cache.ttl.product === 'number', 'TTL produit est un nombre');
            }

            this.addTestResult('Configuration cache', true);
            console.log('✅ Test configuration cache réussi');

        } catch (error) {
            this.addTestResult('Configuration cache', false, error.message);
            console.error('❌ Test configuration cache échoué:', error.message);
        }
    }

    /**
     * Test configuration backup
     */
    testBackupConfig() {
        try {
            console.log('🧪 Test: Configuration backup...');

            // Vérifier la configuration backup
            this.assert(config.backup, 'Configuration backup présente');
            this.assert(typeof config.backup.enabled === 'boolean', 'Backup activé est booléen');

            if (config.backup.enabled) {
                // Vérifier la configuration automatique
                this.assert(config.backup.automatic, 'Configuration backup automatique présente');
                this.assert(typeof config.backup.automatic.enabled === 'boolean', 'Backup automatique activé est booléen');

                if (config.backup.automatic.enabled) {
                    this.assert(config.backup.automatic.schedule, 'Schedule backup automatique présent');
                    this.assert(typeof config.backup.automatic.retention === 'number', 'Rétention backup automatique est un nombre');
                }

                // Vérifier la configuration stockage
                this.assert(config.backup.storage, 'Configuration stockage backup présente');
                this.assert(config.backup.storage.type, 'Type stockage backup présent');
                this.assert(config.backup.storage.location, 'Location stockage backup présent');
            }

            this.addTestResult('Configuration backup', true);
            console.log('✅ Test configuration backup réussi');

        } catch (error) {
            this.addTestResult('Configuration backup', false, error.message);
            console.error('❌ Test configuration backup échoué:', error.message);
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
    runAllTests() {
        console.log('🚀 Démarrage des tests Settings...\n');

        const tests = [
            () => this.testValidPlatformConfig(),
            () => this.testEnvironmentConfig(),
            () => this.testSecurityConfig(),
            () => this.testApplicationConfig(),
            () => this.testGamificationConfig(),
            () => this.testEmailConfig(),
            () => this.testLoggingConfig(),
            () => this.testValidateUrls(),
            () => this.testCommissionConfig(),
            () => this.testMonitoringConfig(),
            () => this.testTestingConfig(),
            () => this.testThirdPartyConfig(),
            () => this.testCacheConfig(),
            () => this.testBackupConfig()
        ];

        for (const test of tests) {
            try {
                test();
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
        console.log('📋 RÉSULTATS DES TESTS SETTINGS');
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
    const test = new SettingsTest();
    test.runAllTests();
}

module.exports = SettingsTest;
