const Commission = require('../utils/Commission');

/**
 * Tests pour la classe Commission
 */
class CommissionTest {
    constructor() {
        this.commission = new Commission();
        this.testResults = [];
        this.mockDb = {
            query: jest.fn()
        };
    }

    /**
     * Test calcul commission rang Bronze
     */
    async testBronzeCommissionCalculation() {
        try {
            console.log('🧪 Test: Commission rang Bronze...');
            
            const amount = 10000; // 10,000 FCFA
            const vendorId = 1;
            
            // Mock base de données pour rang Bronze
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ rank: 'Bronze' }] 
            });

            const result = await this.commission.calculateCommission(amount, vendorId, this.mockDb);

            this.assert(result.grossAmount === amount, 'Le montant brut devrait correspondre');
            this.assert(result.vendorRank === 'Bronze', 'Le rang devrait être Bronze');
            this.assert(result.commissionRate === 450, 'Le taux devrait être 450 bps');
            this.assert(result.commissionAmount === 450, 'La commission devrait être 450 FCFA');
            this.assert(result.netAmount === 9550, 'Le montant net devrait être 9550 FCFA');

            this.addTestResult('Commission Bronze', true);
            console.log('✅ Test commission Bronze réussi');

        } catch (error) {
            this.addTestResult('Commission Bronze', false, error.message);
            console.error('❌ Test commission Bronze échoué:', error.message);
        }
    }

    /**
     * Test calcul commission rang Silver
     */
    async testSilverCommissionCalculation() {
        try {
            console.log('🧪 Test: Commission rang Silver...');
            
            const amount = 10000;
            const vendorId = 1;
            
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ rank: 'Silver' }] 
            });

            const result = await this.commission.calculateCommission(amount, vendorId, this.mockDb);

            this.assert(result.vendorRank === 'Silver', 'Le rang devrait être Silver');
            this.assert(result.commissionRate === 425, 'Le taux devrait être 425 bps');
            this.assert(result.commissionAmount === 425, 'La commission devrait être 425 FCFA');
            this.assert(result.netAmount === 9575, 'Le montant net devrait être 9575 FCFA');

            this.addTestResult('Commission Silver', true);
            console.log('✅ Test commission Silver réussi');

        } catch (error) {
            this.addTestResult('Commission Silver', false, error.message);
            console.error('❌ Test commission Silver échoué:', error.message);
        }
    }

    /**
     * Test calcul commission rang Senior
     */
    async testSeniorCommissionCalculation() {
        try {
            console.log('🧪 Test: Commission rang Senior...');
            
            const amount = 10000;
            const vendorId = 1;
            
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ rank: 'Senior' }] 
            });

            const result = await this.commission.calculateCommission(amount, vendorId, this.mockDb);

            this.assert(result.vendorRank === 'Senior', 'Le rang devrait être Senior');
            this.assert(result.commissionRate === 300, 'Le taux devrait être 300 bps');
            this.assert(result.commissionAmount === 300, 'La commission devrait être 300 FCFA');
            this.assert(result.netAmount === 9700, 'Le montant net devrait être 9700 FCFA');

            this.addTestResult('Commission Senior', true);
            console.log('✅ Test commission Senior réussi');

        } catch (error) {
            this.addTestResult('Commission Senior', false, error.message);
            console.error('❌ Test commission Senior échoué:', error.message);
        }
    }

    /**
     * Test obtention rang par ventes
     */
    testGetRankBySales() {
        try {
            console.log('🧪 Test: Obtention rang par ventes...');

            // Test rang Bronze
            let rank = this.commission.getRankBySales(5);
            this.assert(rank.name === 'Bronze', '5 ventes = Bronze');
            this.assert(rank.rate === 450, 'Bronze = 450 bps');

            // Test rang Silver
            rank = this.commission.getRankBySales(15);
            this.assert(rank.name === 'Silver', '15 ventes = Silver');
            this.assert(rank.rate === 425, 'Silver = 425 bps');

            // Test rang Gold
            rank = this.commission.getRankBySales(30);
            this.assert(rank.name === 'Gold', '30 ventes = Gold');
            this.assert(rank.rate === 400, 'Gold = 400 bps');

            // Test rang Senior
            rank = this.commission.getRankBySales(600);
            this.assert(rank.name === 'Senior', '600 ventes = Senior');
            this.assert(rank.rate === 300, 'Senior = 300 bps');

            this.addTestResult('Rang par ventes', true);
            console.log('✅ Test rang par ventes réussi');

        } catch (error) {
            this.addTestResult('Rang par ventes', false, error.message);
            console.error('❌ Test rang par ventes échoué:', error.message);
        }
    }

    /**
     * Test mise à jour rang vendeur
     */
    async testUpdateVendorRank() {
        try {
            console.log('🧪 Test: Mise à jour rang vendeur...');

            const vendorId = 1;
            
            // Mock utilisateur avec 15 ventes (devrait passer à Silver)
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ total_sales: 15, rank: 'Bronze' }] 
            });

            // Mock mise à jour réussie
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ 
                    id: 1, 
                    rank: 'Silver', 
                    commission_rate: 425, 
                    total_sales: 15 
                }] 
            });

            const result = await this.commission.updateVendorRank(vendorId, this.mockDb);

            this.assert(result.updated === true, 'Le rang devrait être mis à jour');
            this.assert(result.newRank.name === 'Silver', 'Nouveau rang = Silver');
            this.assert(result.previousRank === 'Bronze', 'Ancien rang = Bronze');

            this.addTestResult('Mise à jour rang vendeur', true);
            console.log('✅ Test mise à jour rang vendeur réussi');

        } catch (error) {
            this.addTestResult('Mise à jour rang vendeur', false, error.message);
            console.error('❌ Test mise à jour rang vendeur échoué:', error.message);
        }
    }

    /**
     * Test obtention rang suivant
     */
    testGetNextRank() {
        try {
            console.log('🧪 Test: Obtention rang suivant...');

            // Test depuis Bronze
            let nextRank = this.commission.getNextRank('Bronze');
            this.assert(nextRank.name === 'Silver', 'Après Bronze = Silver');
            this.assert(nextRank.minSales === 10, 'Silver = 10 ventes minimum');

            // Test depuis Silver
            nextRank = this.commission.getNextRank('Silver');
            this.assert(nextRank.name === 'Gold', 'Après Silver = Gold');

            // Test depuis Senior (dernier rang)
            nextRank = this.commission.getNextRank('Senior');
            this.assert(nextRank === null, 'Senior est le rang maximum');

            this.addTestResult('Rang suivant', true);
            console.log('✅ Test rang suivant réussi');

        } catch (error) {
            this.addTestResult('Rang suivant', false, error.message);
            console.error('❌ Test rang suivant échoué:', error.message);
        }
    }

    /**
     * Test ventes nécessaires pour rang suivant
     */
    testGetSalesNeededForNextRank() {
        try {
            console.log('🧪 Test: Ventes nécessaires pour rang suivant...');

            // Test besoin de ventes pour Silver
            let result = this.commission.getSalesNeededForNextRank('Bronze', 5);
            this.assert(result.hasNextRank === true, 'Bronze a un rang suivant');
            this.assert(result.salesNeeded === 5, 'Besoin de 5 ventes pour Silver');
            this.assert(result.nextRank.name === 'Silver', 'Rang suivant = Silver');

            // Test déjà prêt pour promotion
            result = this.commission.getSalesNeededForNextRank('Bronze', 15);
            this.assert(result.salesNeeded === 0, 'Prêt pour promotion');
            this.assert(result.message.includes('Prêt'), 'Message de prêt');

            // Test rang maximum
            result = this.commission.getSalesNeededForNextRank('Senior', 600);
            this.assert(result.hasNextRank === false, 'Senior n\'a pas de rang suivant');
            this.assert(result.salesNeeded === 0, 'Pas de ventes nécessaires');

            this.addTestResult('Ventes nécessaires rang suivant', true);
            console.log('✅ Test ventes nécessaires rang suivant réussi');

        } catch (error) {
            this.addTestResult('Ventes nécessaires rang suivant', false, error.message);
            console.error('❌ Test ventes nécessaires rang suivant échoué:', error.message);
        }
    }

    /**
     * Test validation taux de commission
     */
    testValidateCommissionRate() {
        try {
            console.log('🧪 Test: Validation taux de commission...');

            // Test taux valide
            let result = this.commission.validateCommissionRate(400);
            this.assert(result.valid === true, '400 bps est valide');

            // Test trop bas
            result = this.commission.validateCommissionRate(200);
            this.assert(result.valid === false, '200 bps est trop bas');

            // Test trop haut
            result = this.commission.validateCommissionRate(600);
            this.assert(result.valid === false, '600 bps est trop haut');

            // Test type invalide
            result = this.commission.validateCommissionRate('invalid');
            this.assert(result.valid === false, 'Type invalide rejeté');

            this.addTestResult('Validation taux commission', true);
            console.log('✅ Test validation taux commission réussi');

        } catch (error) {
            this.addTestResult('Validation taux commission', false, error.message);
            console.error('❌ Test validation taux commission échoué:', error.message);
        }
    }

    /**
     * Test économies client
     */
    testCalculateCustomerSavings() {
        try {
            console.log('🧪 Test: Calcul économies client...');

            const amount = 10000;
            const vendorRank = 'Gold';

            const result = this.commission.calculateCustomerSavings(amount, vendorRank);

            this.assert(result.originalAmount === amount, 'Montant original correct');
            this.assert(result.commissionRate === 400, 'Taux Gold = 400 bps');
            this.assert(result.commissionAmount === 400, 'Commission = 400 FCFA');
            this.assert(result.vendorEarnings === 9600, 'Vendeur gagne 9600 FCFA');
            this.assert(result.platformFee === 400, 'Platform gagne 400 FCFA');

            this.addTestResult('Calcul économies client', true);
            console.log('✅ Test calcul économies client réussi');

        } catch (error) {
            this.addTestResult('Calcul économies client', false, error.message);
            console.error('❌ Test calcul économies client échoué:', error.message);
        }
    }

    /**
     * Test obtention tous les rangs
     */
    testGetAllRanks() {
        try {
            console.log('🧪 Test: Obtention tous les rangs...');

            const ranks = this.commission.getAllRanks();

            this.assert(typeof ranks === 'object', 'Ranks est un objet');
            this.assert(ranks.Bronze, 'Rang Bronze existe');
            this.assert(ranks.Silver, 'Rang Silver existe');
            this.assert(ranks.Gold, 'Rang Gold existe');
            this.assert(ranks.Senior, 'Rang Senior existe');

            // Vérifier la progression des taux
            this.assert(ranks.Bronze.rate > ranks.Senior.rate, 'Bronze > Senior en taux');
            this.assert(ranks.Silver.rate < ranks.Bronze.rate, 'Silver < Bronze en taux');

            // Vérifier les ventes minimum
            this.assert(ranks.Silver.minSales > ranks.Bronze.minSales, 'Silver nécessite plus de ventes');

            this.addTestResult('Obtention tous rangs', true);
            console.log('✅ Test obtention tous rangs réussi');

        } catch (error) {
            this.addTestResult('Obtention tous rangs', false, error.message);
            console.error('❌ Test obtention tous rangs échoué:', error.message);
        }
    }

    /**
     * Test simulation changement commission
     */
    testSimulateCommissionChange() {
        try {
            console.log('🧪 Test: Simulation changement commission...');

            const vendorId = 1;
            const newRate = 350;

            const result = this.commission.simulateCommissionChange(vendorId, newRate);

            this.assert(result.vendorId === vendorId, 'Vendor ID correct');
            this.assert(result.newRate === newRate, 'Nouveau taux correct');
            this.assert(result.impact.commissionDifference === -100, 'Différence de -100 bps');
            this.assert(result.impact.percentageChange < 0, 'Changement négatif en %');
            this.assert(result.impact.recommendation, 'Recommandation présente');

            this.addTestResult('Simulation changement commission', true);
            console.log('✅ Test simulation changement commission réussi');

        } catch (error) {
            this.addTestResult('Simulation changement commission', false, error.message);
            console.error('❌ Test simulation changement commission échoué:', error.message);
        }
    }

    /**
     * Test statistiques commissions vendeur
     */
    async testGetCommissionStats() {
        try {
            console.log('🧪 Test: Statistiques commissions vendeur...');

            const vendorId = 1;
            
            // Mock statistiques
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    total_orders: 10,
                    total_revenue: 100000,
                    total_commissions: 4000,
                    average_commission: 400,
                    min_commission: 300,
                    max_commission: 450
                }] 
            });

            const result = await this.commission.getCommissionStats(vendorId, this.mockDb);

            this.assert(result.total_orders === 10, '10 commandes');
            this.assert(result.total_revenue === 100000, '100,000 FCFA de revenus');
            this.assert(result.total_commissions === 4000, '4,000 FCFA de commissions');
            this.assert(result.average_commission === 400, '400 FCFA moyenne');

            this.addTestResult('Statistiques commissions vendeur', true);
            console.log('✅ Test statistiques commissions vendeur réussi');

        } catch (error) {
            this.addTestResult('Statistiques commissions vendeur', false, error.message);
            console.error('❌ Test statistiques commissions vendeur échoué:', error.message);
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
        console.log('🚀 Démarrage des tests Commission...\n');

        const tests = [
            () => this.testBronzeCommissionCalculation(),
            () => this.testSilverCommissionCalculation(),
            () => this.testSeniorCommissionCalculation(),
            () => this.testGetRankBySales(),
            () => this.testUpdateVendorRank(),
            () => this.testGetNextRank(),
            () => this.testGetSalesNeededForNextRank(),
            () => this.testValidateCommissionRate(),
            () => this.testCalculateCustomerSavings(),
            () => this.testGetAllRanks(),
            () => this.testSimulateCommissionChange(),
            () => this.testGetCommissionStats()
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
        console.log('📋 RÉSULTATS DES TESTS COMMISSION');
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
    const test = new CommissionTest();
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = CommissionTest;
