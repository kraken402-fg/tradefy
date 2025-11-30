const Order = require('../models/Order');

/**
 * Tests pour Order model
 */
class OrderTest {
    constructor() {
        this.mockDb = {
            query: jest.fn()
        };
        this.order = new Order(this.mockDb);
        this.testResults = [];
    }

    /**
     * Test création commande valide
     */
    async testCreateOrder() {
        try {
            console.log('🧪 Test: Création commande valide...');

            const orderData = {
                order_number: 'ORD-2023-001',
                customer_id: 1,
                vendor_id: 2,
                status: 'pending',
                currency: 'XAF',
                subtotal: 10000,
                tax_amount: 500,
                shipping_amount: 1000,
                total_amount: 11500,
                commission_amount: 450,
                payment_status: 'pending',
                payment_method: 'mobile_money',
                shipping_address: {
                    street: '123 Test St',
                    city: 'Douala',
                    country: 'Cameroon'
                },
                billing_address: {
                    street: '123 Test St',
                    city: 'Douala',
                    country: 'Cameroon'
                },
                notes: 'Test order',
                created_at: new Date(),
                updated_at: new Date()
            };

            // Mock insertion commande
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, ...orderData }] 
            });

            const result = await this.order.create(orderData);

            this.assert(result.id === 1, 'ID commande généré');
            this.assert(result.order_number === orderData.order_number, 'Numéro commande correct');
            this.assert(result.total_amount === orderData.total_amount, 'Montant total correct');

            this.addTestResult('Création commande valide', true);
            console.log('✅ Test création commande valide réussi');

        } catch (error) {
            this.addTestResult('Création commande valide', false, error.message);
            console.error('❌ Test création commande valide échoué:', error.message);
        }
    }

    /**
     * Test création ligne de commande
     */
    async testCreateOrderItem() {
        try {
            console.log('🧪 Test: Création ligne de commande...');

            const itemData = {
                order_id: 1,
                product_id: 1,
                quantity: 2,
                unit_price: 5000,
                total_price: 10000,
                product_snapshot: {
                    name: 'Test Product',
                    price: 5000
                },
                created_at: new Date()
            };

            // Mock insertion ligne
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, ...itemData }] 
            });

            const result = await this.order.createOrderItem(itemData);

            this.assert(result.id === 1, 'ID ligne généré');
            this.assert(result.order_id === itemData.order_id, 'ID commande correct');
            this.assert(result.quantity === itemData.quantity, 'Quantité correcte');

            this.addTestResult('Création ligne de commande', true);
            console.log('✅ Test création ligne de commande réussi');

        } catch (error) {
            this.addTestResult('Création ligne de commande', false, error.message);
            console.error('❌ Test création ligne de commande échoué:', error.message);
        }
    }

    /**
     * Test recherche commande par ID
     */
    async testFindById() {
        try {
            console.log('🧪 Test: Recherche commande par ID...');

            const orderId = 1;
            const mockOrder = {
                id: orderId,
                order_number: 'ORD-2023-001',
                status: 'pending',
                total_amount: 11500
            };

            // Mock recherche
            this.mockDb.query.mockResolvedValueOnce({ rows: [mockOrder] });

            const result = await this.order.findById(orderId);

            this.assert(result.id === orderId, 'ID commande correct');
            this.assert(result.order_number === mockOrder.order_number, 'Numéro commande correct');

            this.addTestResult('Recherche commande par ID', true);
            console.log('✅ Test recherche commande par ID réussi');

        } catch (error) {
            this.addTestResult('Recherche commande par ID', false, error.message);
            console.error('❌ Test recherche commande par ID échoué:', error.message);
        }
    }

    /**
     * Test recherche commande avec détails
     */
    async testFindByIdWithDetails() {
        try {
            console.log('🧪 Test: Recherche commande avec détails...');

            const orderId = 1;
            
            // Mock commande avec détails
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    id: orderId,
                    order_number: 'ORD-2023-001',
                    customer_name: 'Test Customer',
                    vendor_name: 'Test Vendor',
                    shipping_address: JSON.stringify({ street: '123 Test St' }),
                    billing_address: JSON.stringify({ street: '123 Test St' }),
                    item_count: 2
                }] 
            });

            // Mock items
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, product_id: 1, quantity: 2, product_snapshot: JSON.stringify({ name: 'Product 1' }) },
                    { id: 2, product_id: 2, quantity: 1, product_snapshot: JSON.stringify({ name: 'Product 2' }) }
                ] 
            });

            const result = await this.order.findByIdWithDetails(orderId);

            this.assert(result.id === orderId, 'ID commande correct');
            this.assert(result.customer_name === 'Test Customer', 'Nom client correct');
            this.assert(Array.isArray(result.items), 'Items en tableau');
            this.assert(result.items.length === 2, '2 items');

            this.addTestResult('Recherche commande avec détails', true);
            console.log('✅ Test recherche commande avec détails réussi');

        } catch (error) {
            this.addTestResult('Recherche commande avec détails', false, error.message);
            console.error('❌ Test recherche commande avec détails échoué:', error.message);
        }
    }

    /**
     * Test mise à jour commande
     */
    async testUpdateOrder() {
        try {
            console.log('🧪 Test: Mise à jour commande...');

            const orderId = 1;
            const updateData = {
                status: 'confirmed',
                payment_status: 'paid',
                notes: 'Updated order'
            };

            // Mock mise à jour
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: orderId, ...updateData, updated_at: new Date() }] 
            });

            const result = await this.order.update(orderId, updateData);

            this.assert(result.id === orderId, 'ID commande correct');
            this.assert(result.status === updateData.status, 'Statut mis à jour');
            this.assert(result.payment_status === updateData.payment_status, 'Statut paiement mis à jour');

            this.addTestResult('Mise à jour commande', true);
            console.log('✅ Test mise à jour commande réussi');

        } catch (error) {
            this.addTestResult('Mise à jour commande', false, error.message);
            console.error('❌ Test mise à jour commande échoué:', error.message);
        }
    }

    /**
     * Test obtention commandes avec filtres
     */
    async testGetOrdersWithDetails() {
        try {
            console.log('🧪 Test: Obtention commandes avec filtres...');

            const filters = {
                customer_id: 1,
                status: 'pending',
                start_date: '2023-12-01',
                end_date: '2023-12-31'
            };
            const limit = 20;
            const offset = 0;

            // Mock commandes
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, order_number: 'ORD-001', customer_name: 'Customer 1', shipping_address: '{}' },
                    { id: 2, order_number: 'ORD-002', customer_name: 'Customer 2', shipping_address: '{}' }
                ] 
            });

            // Mock items pour chaque commande
            this.mockDb.query.mockResolvedValue({ rows: [] });

            const result = await this.order.getOrdersWithDetails(filters, limit, offset);

            this.assert(Array.isArray(result), 'Résultat en tableau');
            this.assert(result.length === 2, '2 commandes trouvées');

            this.addTestResult('Obtention commandes avec filtres', true);
            console.log('✅ Test obtention commandes avec filtres réussi');

        } catch (error) {
            this.addTestResult('Obtention commandes avec filtres', false, error.message);
            console.error('❌ Test obtention commandes avec filtres échoué:', error.message);
        }
    }

    /**
     * Test comptage commandes
     */
    async testCountOrders() {
        try {
            console.log('🧪 Test: Comptage commandes...');

            const filters = {
                status: 'pending',
                customer_id: 1
            };

            // Mock comptage
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ count: '15' }] 
            });

            const result = await this.order.count(filters);

            this.assert(result === 15, '15 commandes comptées');

            this.addTestResult('Comptage commandes', true);
            console.log('✅ Test comptage commandes réussi');

        } catch (error) {
            this.addTestResult('Comptage commandes', false, error.message);
            console.error('❌ Test comptage commandes échoué:', error.message);
        }
    }

    /**
     * Test obtention items commande
     */
    async testGetOrderItems() {
        try {
            console.log('🧪 Test: Obtention items commande...');

            const orderId = 1;

            // Mock items
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { 
                        id: 1, 
                        product_id: 1, 
                        quantity: 2, 
                        product_snapshot: JSON.stringify({ name: 'Product 1' }),
                        current_product_name: 'Current Product 1'
                    },
                    { 
                        id: 2, 
                        product_id: 2, 
                        quantity: 1, 
                        product_snapshot: JSON.stringify({ name: 'Product 2' }),
                        current_product_name: 'Current Product 2'
                    }
                ] 
            });

            const result = await this.order.getOrderItems(orderId);

            this.assert(Array.isArray(result), 'Résultat en tableau');
            this.assert(result.length === 2, '2 items trouvés');
            this.assert(result[0].quantity === 2, 'Quantité premier item correcte');

            this.addTestResult('Obtention items commande', true);
            console.log('✅ Test obtention items commande réussi');

        } catch (error) {
            this.addTestResult('Obtention items commande', false, error.message);
            console.error('❌ Test obtention items commande échoué:', error.message);
        }
    }

    /**
     * Test mise à jour stock produit
     */
    async testUpdateProductStock() {
        try {
            console.log('🧪 Test: Mise à jour stock produit...');

            const productId = 1;
            const quantityChange = -2; // Retirer 2 unités

            // Mock mise à jour stock
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: productId, inventory_quantity: 48 }] 
            });

            const result = await this.order.updateProductStock(productId, quantityChange);

            this.assert(result.id === productId, 'ID produit correct');
            this.assert(result.inventory_quantity === 48, 'Stock mis à jour');

            this.addTestResult('Mise à jour stock produit', true);
            console.log('✅ Test mise à jour stock produit réussi');

        } catch (error) {
            this.addTestResult('Mise à jour stock produit', false, error.message);
            console.error('❌ Test mise à jour stock produit échoué:', error.message);
        }
    }

    /**
     * Test statistiques vendeur
     */
    async testGetVendorStats() {
        try {
            console.log('🧪 Test: Statistiques vendeur...');

            const vendorId = 1;

            // Mock statistiques
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{
                    total_orders: 50,
                    delivered_orders: 40,
                    pending_orders: 5,
                    processing_orders: 5,
                    shipped_orders: 0,
                    total_revenue: 500000,
                    paid_revenue: 400000,
                    average_order_value: 10000,
                    total_commissions: 20000,
                    first_order_date: '2023-01-01',
                    last_order_date: '2023-12-01'
                }] 
            });

            const result = await this.order.getVendorStats(vendorId);

            this.assert(result.total_orders === 50, '50 commandes totales');
            this.assert(result.delivered_orders === 40, '40 commandes livrées');
            this.assert(result.total_revenue === 500000, '500,000 FCFA de revenus');
            this.assert(result.average_order_value === 10000, '10,000 FCFA moyenne');

            this.addTestResult('Statistiques vendeur', true);
            console.log('✅ Test statistiques vendeur réussi');

        } catch (error) {
            this.addTestResult('Statistiques vendeur', false, error.message);
            console.error('❌ Test statistiques vendeur échoué:', error.message);
        }
    }

    /**
     * Test mise à jour totaux vendeur
     */
    async testUpdateVendorTotals() {
        try {
            console.log('🧪 Test: Mise à jour totaux vendeur...');

            const vendorId = 1;
            const amount = 10000;

            // Mock mise à jour totaux
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: vendorId, total_sales: 51, total_revenue: 510000 }] 
            });

            const result = await this.order.updateVendorTotals(vendorId, amount);

            this.assert(result.id === vendorId, 'ID vendeur correct');
            this.assert(result.total_sales === 51, 'Total ventes mis à jour');
            this.assert(result.total_revenue === 510000, 'Total revenus mis à jour');

            this.addTestResult('Mise à jour totaux vendeur', true);
            console.log('✅ Test mise à jour totaux vendeur réussi');

        } catch (error) {
            this.addTestResult('Mise à jour totaux vendeur', false, error.message);
            console.error('❌ Test mise à jour totaux vendeur échoué:', error.message);
        }
    }

    /**
     * Test création avis
     */
    async testCreateReview() {
        try {
            console.log('🧪 Test: Création avis...');

            const reviewData = {
                product_id: 1,
                order_id: 1,
                customer_id: 1,
                rating: 5,
                title: 'Excellent product',
                content: 'Very satisfied with my purchase',
                is_verified: true,
                is_public: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Mock insertion avis
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, ...reviewData }] 
            });

            const result = await this.order.createReview(reviewData);

            this.assert(result.id === 1, 'ID avis généré');
            this.assert(result.rating === 5, 'Note correcte');
            this.assert(result.is_verified === true, 'Avis vérifié');

            this.addTestResult('Création avis', true);
            console.log('✅ Test création avis réussi');

        } catch (error) {
            this.addTestResult('Création avis', false, error.message);
            console.error('❌ Test création avis échoué:', error.message);
        }
    }

    /**
     * Test obtention avis commande
     */
    async testGetOrderReview() {
        try {
            console.log('🧪 Test: Obtention avis commande...');

            const orderId = 1;
            const mockReview = {
                id: 1,
                order_id: orderId,
                rating: 5,
                title: 'Excellent product'
            };

            // Mock recherche avis
            this.mockDb.query.mockResolvedValueOnce({ rows: [mockReview] });

            const result = await this.order.getOrderReview(orderId);

            this.assert(result.id === 1, 'ID avis correct');
            this.assert(result.order_id === orderId, 'ID commande correct');
            this.assert(result.rating === 5, 'Note correcte');

            this.addTestResult('Obtention avis commande', true);
            console.log('✅ Test obtention avis commande réussi');

        } catch (error) {
            this.addTestResult('Obtention avis commande', false, error.message);
            console.error('❌ Test obtention avis commande échoué:', error.message);
        }
    }

    /**
     * Test revenus par période
     */
    async testGetRevenueByPeriod() {
        try {
            console.log('🧪 Test: Revenus par période...');

            const vendorId = 1;
            const startDate = '2023-12-01';
            const endDate = '2023-12-31';

            // Mock revenus par période
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { date: '2023-12-01', order_count: 5, daily_revenue: 50000, average_order_value: 10000 },
                    { date: '2023-12-02', order_count: 3, daily_revenue: 30000, average_order_value: 10000 }
                ] 
            });

            const result = await this.order.getRevenueByPeriod(vendorId, startDate, endDate);

            this.assert(Array.isArray(result), 'Résultat en tableau');
            this.assert(result.length === 2, '2 jours de données');
            this.assert(result[0].order_count === 5, '5 commandes premier jour');

            this.addTestResult('Revenus par période', true);
            console.log('✅ Test revenus par période réussi');

        } catch (error) {
            this.addTestResult('Revenus par période', false, error.message);
            console.error('❌ Test revenus par période échoué:', error.message);
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
        console.log('🚀 Démarrage des tests Order...\n');

        const tests = [
            () => this.testCreateOrder(),
            () => this.testCreateOrderItem(),
            () => this.testFindById(),
            () => this.testFindByIdWithDetails(),
            () => this.testUpdateOrder(),
            () => this.testGetOrdersWithDetails(),
            () => this.testCountOrders(),
            () => this.testGetOrderItems(),
            () => this.testUpdateProductStock(),
            () => this.testGetVendorStats(),
            () => this.testUpdateVendorTotals(),
            () => this.testCreateReview(),
            () => this.testGetOrderReview(),
            () => this.testGetRevenueByPeriod()
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
        console.log('📋 RÉSULTATS DES TESTS ORDER');
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
    const test = new OrderTest();
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = OrderTest;
