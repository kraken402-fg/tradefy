/**
 * Script principal pour exécuter tous les tests
 */

const AuthControllerTest = require('./AuthControllerTest');
const CommissionTest = require('./CommissionTest');
const GamificationServiceTest = require('./GamificationServiceTest');
const MonerooServiceTest = require('./MonerooServiceTest');
const ProductControllerTest = require('./ProductControllerTest');
const OrderTest = require('./OrderTest');
const UserTest = require('./UserTest');
const ValidatorsTest = require('./ValidatorsTest');
const IntegrationTest = require('./IntegrationTest');
const SettingsTest = require('./SettingsTest');

/**
 * Suite de tests complète pour le backend Tradefy
 */
class TestSuite {
    constructor() {
        this.testClasses = [
            { name: 'AuthController', class: AuthControllerTest },
            { name: 'Commission', class: CommissionTest },
            { name: 'GamificationService', class: GamificationServiceTest },
            { name: 'MonerooService', class: MonerooServiceTest },
            { name: 'ProductController', class: ProductControllerTest },
            { name: 'Order', class: OrderTest },
            { name: 'User', class: UserTest },
            { name: 'Validators', class: ValidatorsTest },
            { name: 'Integration', class: IntegrationTest },
            { name: 'Settings', class: SettingsTest }
        ];
        this.allResults = [];
    }

    /**
     * Exécuter tous les tests
     */
    async runAllTests() {
        console.log('🚀 DÉMARRAGE DE LA SUITE DE TESTS COMPLÈTE');
        console.log('='.repeat(80));
        console.log(`📋 ${this.testClasses.length} classes de tests à exécuter\n`);

        const startTime = Date.now();
        let totalTests = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;

        for (const testClass of this.testClasses) {
            console.log(`\n📦 Exécution des tests ${testClass.name}...`);
            console.log('-'.repeat(50));

            try {
                const testInstance = new testClass.class();
                let result;

                // Exécuter les tests (async ou sync)
                if (typeof testInstance.runAllTests === 'function') {
                    result = await testInstance.runAllTests();
                } else {
                    result = testInstance.runAllTests();
                }

                // Collecter les résultats
                this.allResults.push({
                    className: testClass.name,
                    ...result
                });

                totalTests += result.total;
                totalSuccessful += result.successful;
                totalFailed += result.failed;

                console.log(`\n✅ Tests ${testClass.name} terminés - ${result.successful}/${result.total} réussis`);

            } catch (error) {
                console.error(`\n❌ Erreur lors des tests ${testClass.name}:`, error.message);
                
                // Ajouter un résultat d'échec
                this.allResults.push({
                    className: testClass.name,
                    total: 0,
                    successful: 0,
                    failed: 1,
                    error: error.message
                });

                totalFailed++;
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Afficher le résumé final
        this.printFinalSummary(totalTests, totalSuccessful, totalFailed, duration);

        return {
            totalTests,
            totalSuccessful,
            totalFailed,
            duration,
            results: this.allResults
        };
    }

    /**
     * Exécuter une classe de tests spécifique
     */
    async runTestClass(className) {
        const testClass = this.testClasses.find(tc => tc.name === className);
        
        if (!testClass) {
            console.error(`❌ Classe de tests "${className}" non trouvée`);
            console.log('Classes disponibles:', this.testClasses.map(tc => tc.name).join(', '));
            return null;
        }

        console.log(`🚀 Exécution des tests ${className}...`);
        console.log('='.repeat(50));

        try {
            const testInstance = new testClass.class();
            let result;

            if (typeof testInstance.runAllTests === 'function') {
                result = await testInstance.runAllTests();
            } else {
                result = testInstance.runAllTests();
            }

            console.log(`\n✅ Tests ${className} terminés - ${result.successful}/${result.total} réussis`);
            return result;

        } catch (error) {
            console.error(`\n❌ Erreur lors des tests ${className}:`, error.message);
            return null;
        }
    }

    /**
     * Exécuter les tests en mode watch
     */
    async runWatchMode() {
        console.log('👁️  Mode watch activé - Les tests se relanceront automatiquement...');
        console.log('Appuyez sur Ctrl+C pour arrêter\n');

        let runCount = 0;
        
        const run = async () => {
            runCount++;
            console.log(`\n🔄 Exécution #${runCount} - ${new Date().toLocaleString()}`);
            
            await this.runAllTests();
            
            console.log('\n⏳ En attente de modifications...');
        };

        // Première exécution
        await run();

        // En mode watch, on pourrait surveiller les fichiers
        // Pour l'instant, on attend simplement
        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt du mode watch');
            process.exit(0);
        });
    }

    /**
     * Afficher le résumé final
     */
    printFinalSummary(totalTests, totalSuccessful, totalFailed, duration) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 RÉSUMÉ FINAL DE LA SUITE DE TESTS');
        console.log('='.repeat(80));

        console.log(`⏱️  Durée totale: ${(duration / 1000).toFixed(2)}s`);
        console.log(`📋 Classes testées: ${this.testClasses.length}`);
        console.log(`🧪 Tests totaux: ${totalTests}`);
        console.log(`✅ Tests réussis: ${totalSuccessful}`);
        console.log(`❌ Tests échoués: ${totalFailed}`);

        const successRate = totalTests > 0 ? Math.round((totalSuccessful / totalTests) * 100) : 0;
        console.log(`🎯 Taux de réussite: ${successRate}%`);

        // Détails par classe
        console.log('\n📋 Détails par classe:');
        console.log('-'.repeat(80));
        
        this.allResults.forEach(result => {
            const rate = result.total > 0 ? Math.round((result.successful / result.total) * 100) : 0;
            const icon = result.failed === 0 ? '✅' : result.successful === 0 ? '❌' : '⚠️';
            console.log(`${icon} ${result.className}: ${result.successful}/${result.total} (${rate}%)`);
            
            if (result.error) {
                console.log(`   Erreur: ${result.error}`);
            }
        });

        // Tests échoués
        const failedTests = this.allResults.filter(r => r.failed > 0);
        if (failedTests.length > 0) {
            console.log('\n❌ Classes avec des échecs:');
            failedTests.forEach(result => {
                console.log(`   - ${result.className}: ${result.failed} échec(s)`);
            });
        }

        // Recommandations
        console.log('\n💡 Recommandations:');
        if (successRate === 100) {
            console.log('🎉 Tous les tests passent! Le backend est prêt pour le déploiement.');
        } else if (successRate >= 80) {
            console.log('👍 Bon taux de réussite. Corrigez les tests échoués avant le déploiement.');
        } else {
            console.log('⚠️  Taux de réussite faible. Des corrections importantes sont nécessaires.');
        }

        console.log('='.repeat(80));
    }

    /**
     * Générer un rapport HTML
     */
    generateHtmlReport() {
        const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Tests - Tradefy Backend</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .success { border-left-color: #28a745; }
        .error { border-left-color: #dc3545; }
        .warning { border-left-color: #ffc107; }
        .test-class { margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .test-header { background: #007bff; color: white; padding: 15px; font-weight: bold; }
        .test-body { padding: 15px; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%); }
        .stats { display: flex; justify-content: space-between; margin: 10px 0; }
        .timestamp { color: #666; font-size: 0.9em; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Rapport de Tests - Tradefy Backend</h1>
        <div class="timestamp">Généré le: ${new Date().toLocaleString()}</div>
        
        <div class="summary">
            <div class="card">
                <h3>📊 Total Tests</h3>
                <div style="font-size: 2em; font-weight: bold;">${this.allResults.reduce((sum, r) => sum + r.total, 0)}</div>
            </div>
            <div class="card success">
                <h3>✅ Succès</h3>
                <div style="font-size: 2em; font-weight: bold;">${this.allResults.reduce((sum, r) => sum + r.successful, 0)}</div>
            </div>
            <div class="card error">
                <h3>❌ Échecs</h3>
                <div style="font-size: 2em; font-weight: bold;">${this.allResults.reduce((sum, r) => sum + r.failed, 0)}</div>
            </div>
            <div class="card warning">
                <h3>🎯 Taux de réussite</h3>
                <div style="font-size: 2em; font-weight: bold;">${this.allResults.length > 0 ? Math.round((this.allResults.reduce((sum, r) => sum + r.successful, 0) / this.allResults.reduce((sum, r) => sum + r.total, 0)) * 100) : 0}%</div>
            </div>
        </div>

        ${this.allResults.map(result => `
            <div class="test-class">
                <div class="test-header">
                    ${result.className} - ${result.successful}/${result.total} tests
                </div>
                <div class="test-body">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(result.successful / result.total) * 100}%"></div>
                    </div>
                    <div class="stats">
                        <span>✅ Réussis: ${result.successful}</span>
                        <span>❌ Échoués: ${result.failed}</span>
                        <span>📊 Taux: ${Math.round((result.successful / result.total) * 100)}%</span>
                    </div>
                    ${result.error ? `<div style="color: #dc3545; margin-top: 10px;"><strong>Erreur:</strong> ${result.error}</div>` : ''}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Sauvegarder le rapport HTML
     */
    saveHtmlReport(filePath = './test-report.html') {
        const fs = require('fs');
        const html = this.generateHtmlReport();
        fs.writeFileSync(filePath, html);
        console.log(`📄 Rapport HTML sauvegardé: ${filePath}`);
    }
}

// Gestion de la ligne de commande
if (require.main === module) {
    const args = process.argv.slice(2);
    const testSuite = new TestSuite();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🧪 Suite de Tests - Tradefy Backend

Usage:
  node run-tests.js                    Exécuter tous les tests
  node run-tests.js [className]        Exécuter une classe de tests spécifique
  node run-tests.js --watch            Mode watch (re-exécution automatique)
  node run-tests.js --report           Générer un rapport HTML
  node run-tests.js --help             Afficher cette aide

Classes de tests disponibles:
${testSuite.testClasses.map(tc => `  - ${tc.name}`).join('\n')}
        `);
        process.exit(0);
    }

    if (args.includes('--watch')) {
        testSuite.runWatchMode();
    } else if (args.includes('--report')) {
        console.log('📊 Génération du rapport de tests...');
        testSuite.runAllTests().then(() => {
            testSuite.saveHtmlReport();
        });
    } else if (args.length > 0) {
        const className = args[0];
        testSuite.runTestClass(className);
    } else {
        testSuite.runAllTests();
    }
}

module.exports = TestSuite;
