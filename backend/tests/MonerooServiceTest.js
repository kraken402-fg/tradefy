const MonerooService = require('../services/MonerooService');

/**
 * Tests pour MonerooService
 */
class MonerooServiceTest {
    constructor() {
        this.monerooService = new MonerooService();
        this.testResults = [];
    }

    /**
     * Test initialisation paiement valide
     */
    async testInitializePayment() {
        try {
            console.log('🧪 Test: Initialisation paiement valide...');

            const paymentData = {
                amount: 10000,
                currency: 'XAF',
                customer: {
                    email: 'test@example.com',
                    name: 'Test Customer',
                    phone: '+237123456789'
                },
                metadata: {
                    order_id: 123,
                    product_name: 'Test Product'
                }
            };

            // Mock axios pour l'API Moneroo
            const mockAxiosResponse = {
                data: {
                    success: true,
                    data: {
                        payment_id: 'pay_123456',
                        payment_url: 'https://pay.moneroo.com/pay_123456',
                        status: 'pending'
                    }
                }
            };

            jest.spyOn(require('axios'), 'post').mockResolvedValue(mockAxiosResponse);

            const result = await this.monerooService.initializePayment(paymentData);

            this.assert(result.success === true, 'L\'initialisation devrait réussir');
            this.assert(result.data.payment_id, 'Payment ID présent');
            this.assert(result.data.payment_url, 'Payment URL présent');
            this.assert(result.data.status === 'pending', 'Statut pending');

            this.addTestResult('Initialisation paiement valide', true);
            console.log('✅ Test initialisation paiement valide réussi');

        } catch (error) {
            this.addTestResult('Initialisation paiement valide', false, error.message);
            console.error('❌ Test initialisation paiement valide échoué:', error.message);
        }
    }

    /**
     * Test initialisation paiement avec montant invalide
     */
    async testInitializePaymentInvalidAmount() {
        try {
            console.log('🧪 Test: Initialisation paiement montant invalide...');

            const paymentData = {
                amount: -1000, // Montant négatif
                currency: 'XAF',
                customer: {
                    email: 'test@example.com'
                }
            };

            const result = await this.monerooService.initializePayment(paymentData);

            this.assert(result.success === false, 'L\'initialisation devrait échouer');
            this.assert(result.status === 400, 'Statut 400');

            this.addTestResult('Initialisation paiement montant invalide', true);
            console.log('✅ Test initialisation paiement montant invalide réussi');

        } catch (error) {
            this.addTestResult('Initialisation paiement montant invalide', false, error.message);
            console.error('❌ Test initialisation paiement montant invalide échoué:', error.message);
        }
    }

    /**
     * Test vérification paiement réussi
     */
    async testVerifyPayment() {
        try {
            console.log('🧪 Test: Vérification paiement réussi...');

            const paymentId = 'pay_123456';

            // Mock réponse API Moneroo
            const mockAxiosResponse = {
                data: {
                    success: true,
                    data: {
                        payment_id: paymentId,
                        status: 'completed',
                        amount: 10000,
                        currency: 'XAF',
                        paid_at: '2023-12-01T10:00:00Z'
                    }
                }
            };

            jest.spyOn(require('axios'), 'get').mockResolvedValue(mockAxiosResponse);

            const result = await this.monerooService.verifyPayment(paymentId);

            this.assert(result.success === true, 'La vérification devrait réussir');
            this.assert(result.data.status === 'completed', 'Statut completed');
            this.assert(result.data.amount === 10000, 'Montant correct');

            this.addTestResult('Vérification paiement réussi', true);
            console.log('✅ Test vérification paiement réussi réussi');

        } catch (error) {
            this.addTestResult('Vérification paiement réussi', false, error.message);
            console.error('❌ Test vérification paiement réussi échoué:', error.message);
        }
    }

    /**
     * Test traitement webhook Moneroo
     */
    async testProcessMonerooWebhook() {
        try {
            console.log('🧪 Test: Traitement webhook Moneroo...');

            const webhookData = {
                event: 'payment.completed',
                data: {
                    payment_id: 'pay_123456',
                    status: 'completed',
                    amount: 10000,
                    currency: 'XAF',
                    customer: {
                        email: 'test@example.com'
                    },
                    metadata: {
                        order_id: 123
                    }
                }
            };

            // Mock vérification signature
            jest.spyOn(this.monerooService, 'verifyWebhookSignature').mockReturnValue(true);

            // Mock base de données pour mise à jour commande
            const mockDb = {
                query: jest.fn()
            };
            mockDb.query.mockResolvedValueOnce({ rows: [{ id: 123 }] });

            const result = await this.monerooService.processWebhook(webhookData, mockDb);

            this.assert(result.success === true, 'Le traitement devrait réussir');
            this.assert(result.event === 'payment.completed', 'Événement correct');

            this.addTestResult('Traitement webhook Moneroo', true);
            console.log('✅ Test traitement webhook Moneroo réussi');

        } catch (error) {
            this.addTestResult('Traitement webhook Moneroo', false, error.message);
            console.error('❌ Test traitement webhook Moneroo échoué:', error.message);
        }
    }

    /**
     * Test remboursement paiement
     */
    async testRefundPayment() {
        try {
            console.log('🧪 Test: Remboursement paiement...');

            const paymentId = 'pay_123456';
            const refundData = {
                amount: 5000,
                reason: 'Customer request'
            };

            // Mock réponse API Moneroo
            const mockAxiosResponse = {
                data: {
                    success: true,
                    data: {
                        refund_id: 'refund_123456',
                        payment_id: paymentId,
                        amount: 5000,
                        status: 'processed'
                    }
                }
            };

            jest.spyOn(require('axios'), 'post').mockResolvedValue(mockAxiosResponse);

            const result = await this.monerooService.refundPayment(paymentId, refundData);

            this.assert(result.success === true, 'Le remboursement devrait réussir');
            this.assert(result.data.refund_id, 'Refund ID présent');
            this.assert(result.data.status === 'processed', 'Statut processed');

            this.addTestResult('Remboursement paiement', true);
            console.log('✅ Test remboursement paiement réussi');

        } catch (error) {
            this.addTestResult('Remboursement paiement', false, error.message);
            console.error('❌ Test remboursement paiement échoué:', error.message);
        }
    }

    /**
     * Test obtention statistiques paiements
     */
    async testGetPaymentStats() {
        try {
            console.log('🧪 Test: Statistiques paiements...');

            const mockDb = {
                query: jest.fn()
            };

            // Mock statistiques
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    total_payments: 100,
                    successful_payments: 95,
                    failed_payments: 5,
                    total_amount: 1000000,
                    success_rate: 95.0
                }]
            });

            const stats = await this.monerooService.getPaymentStats(mockDb);

            this.assert(stats.total_payments === 100, '100 paiements totaux');
            this.assert(stats.successful_payments === 95, '95 paiements réussis');
            this.assert(stats.success_rate === 95.0, 'Taux de réussite 95%');

            this.addTestResult('Statistiques paiements', true);
            console.log('✅ Test statistiques paiements réussi');

        } catch (error) {
            this.addTestResult('Statistiques paiements', false, error.message);
            console.error('❌ Test statistiques paiements échoué:', error.message);
        }
    }

    /**
     * Test validation signature webhook
     */
    testVerifyWebhookSignature() {
        try {
            console.log('🧪 Test: Validation signature webhook...');

            const payload = '{"event":"payment.completed","data":{"payment_id":"pay_123"}}';
            const signature = 'valid_signature';

            // Mock validation réussie
            jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('valid_signature')
            });

            const result = this.monerooService.verifyWebhookSignature(payload, signature);

            this.assert(result === true, 'Signature valide');

            this.addTestResult('Validation signature webhook', true);
            console.log('✅ Test validation signature webhook réussi');

        } catch (error) {
            this.addTestResult('Validation signature webhook', false, error.message);
            console.error('❌ Test validation signature webhook échoué:', error.message);
        }
    }

    /**
     * Test création lien paiement
     */
    async testCreatePaymentLink() {
        try {
            console.log('🧪 Test: Création lien paiement...');

            const linkData = {
                amount: 10000,
                currency: 'XAF',
                description: 'Test payment link',
                expires_in: 3600 // 1 heure
            };

            // Mock réponse API
            const mockAxiosResponse = {
                data: {
                    success: true,
                    data: {
                        link_id: 'link_123456',
                        payment_url: 'https://pay.moneroo.com/link_123456',
                        expires_at: '2023-12-01T11:00:00Z'
                    }
                }
            };

            jest.spyOn(require('axios'), 'post').mockResolvedValue(mockAxiosResponse);

            const result = await this.monerooService.createPaymentLink(linkData);

            this.assert(result.success === true, 'La création devrait réussir');
            this.assert(result.data.link_id, 'Link ID présent');
            this.assert(result.data.payment_url, 'Payment URL présent');

            this.addTestResult('Création lien paiement', true);
            console.log('✅ Test création lien paiement réussi');

        } catch (error) {
            this.addTestResult('Création lien paiement', false, error.message);
            console.error('❌ Test création lien paiement échoué:', error.message);
        }
    }

    /**
     * Test obtention détails paiement
     */
    async testGetPaymentDetails() {
        try {
            console.log('🧪 Test: Détails paiement...');

            const paymentId = 'pay_123456';

            // Mock réponse API
            const mockAxiosResponse = {
                data: {
                    success: true,
                    data: {
                        payment_id: paymentId,
                        status: 'completed',
                        amount: 10000,
                        currency: 'XAF',
                        created_at: '2023-12-01T10:00:00Z',
                        paid_at: '2023-12-01T10:05:00Z',
                        customer: {
                            email: 'test@example.com',
                            name: 'Test Customer'
                        }
                    }
                }
            };

            jest.spyOn(require('axios'), 'get').mockResolvedValue(mockAxiosResponse);

            const result = await this.monerooService.getPaymentDetails(paymentId);

            this.assert(result.success === true, 'La récupération devrait réussir');
            this.assert(result.data.payment_id === paymentId, 'Payment ID correct');
            this.assert(result.data.status === 'completed', 'Statut completed');

            this.addTestResult('Détails paiement', true);
            console.log('✅ Test détails paiement réussi');

        } catch (error) {
            this.addTestResult('Détails paiement', false, error.message);
            console.error('❌ Test détails paiement échoué:', error.message);
        }
    }

    /**
     * Test validation montant
     */
    testValidateAmount() {
        try {
            console.log('🧪 Test: Validation montant...');

            // Test montant valide
            let result = this.monerooService.validateAmount(10000);
            this.assert(result.valid === true, '10000 valide');

            // Test montant trop bas
            result = this.monerooService.validateAmount(0);
            this.assert(result.valid === false, '0 invalide');

            result = this.monerooService.validateAmount(-1000);
            this.assert(result.valid === false, '-1000 invalide');

            // Test montant trop haut
            result = this.monerooService.validateAmount(10000000);
            this.assert(result.valid === false, '10M invalide');

            // Test type invalide
            result = this.monerooService.validateAmount('invalid');
            this.assert(result.valid === false, 'Type invalide');

            this.addTestResult('Validation montant', true);
            console.log('✅ Test validation montant réussi');

        } catch (error) {
            this.addTestResult('Validation montant', false, error.message);
            console.error('❌ Test validation montant échoué:', error.message);
        }
    }

    /**
     * Test validation email client
     */
    testValidateCustomerEmail() {
        try {
            console.log('🧪 Test: Validation email client...');

            // Test email valide
            let result = this.monerooService.validateCustomerEmail('test@example.com');
            this.assert(result.valid === true, 'Email valide');

            // Test email invalide
            result = this.monerooService.validateCustomerEmail('invalid-email');
            this.assert(result.valid === false, 'Email invalide');

            // Test email vide
            result = this.monerooService.validateCustomerEmail('');
            this.assert(result.valid === false, 'Email vide invalide');

            // Test email trop long
            result = this.monerooService.validateCustomerEmail('a'.repeat(300) + '@example.com');
            this.assert(result.valid === false, 'Email trop long invalide');

            this.addTestResult('Validation email client', true);
            console.log('✅ Test validation email client réussi');

        } catch (error) {
            this.addTestResult('Validation email client', false, error.message);
            console.error('❌ Test validation email client échoué:', error.message);
        }
    }

    /**
     * Test formatage devise
     */
    testFormatCurrency() {
        try {
            console.log('🧪 Test: Formatage devise...');

            // Test XAF
            let result = this.monerooService.formatCurrency(10000, 'XAF');
            this.assert(result === '10,000 XAF', 'Format XAF correct');

            // Test USD
            result = this.monerooService.formatCurrency(100.50, 'USD');
            this.assert(result === '$100.50', 'Format USD correct');

            // Test EUR
            result = this.monerooService.formatCurrency(1000, 'EUR');
            this.assert(result === '€1,000.00', 'Format EUR correct');

            // Test devise inconnue
            result = this.monerooService.formatCurrency(1000, 'UNKNOWN');
            this.assert(result.includes('1000'), 'Contient le montant');

            this.addTestResult('Formatage devise', true);
            console.log('✅ Test formatage devise réussi');

        } catch (error) {
            this.addTestResult('Formatage devise', false, error.message);
            console.error('❌ Test formatage devise échoué:', error.message);
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
        console.log('🚀 Démarrage des tests MonerooService...\n');

        const tests = [
            () => this.testInitializePayment(),
            () => this.testInitializePaymentInvalidAmount(),
            () => this.testVerifyPayment(),
            () => this.testProcessMonerooWebhook(),
            () => this.testRefundPayment(),
            () => this.testGetPaymentStats(),
            () => this.testVerifyWebhookSignature(),
            () => this.testCreatePaymentLink(),
            () => this.testGetPaymentDetails(),
            () => this.testValidateAmount(),
            () => this.testValidateCustomerEmail(),
            () => this.testFormatCurrency()
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
        console.log('📋 RÉSULTATS DES TESTS MONEROO');
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
    const test = new MonerooServiceTest();
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = MonerooServiceTest;
