const { validateOrder, validateProduct } = require('../../utils/Validators');

/**
 * Tests pour le modèle Order
 */
class OrderTest {
    constructor() {
        this.testResults = [];
        this.mockDb = this.createMockDb();
        this.order = this.createOrderModel();
    }

    /**
     * Créer une base de données mock
     */
    createMockDb() {
        return {
            query: jest.fn().mockImplementation((query, values) => {
                // Simuler différentes réponses selon la requête
                if (query.includes('INSERT INTO orders')) {
                    return Promise.resolve({
                        rows: [{
                            id: 1,
                            order_number: 'ORD-20231201-1234',
                            customer_id: 1,
                            vendor_id: 2,
                            status: 'pending',
                            total_amount: 10000,
                            created_at: new Date()
                        }]
                    });
                }
                if (query.includes('SELECT * FROM orders WHERE id =')) {
                    return Promise.resolve({
                        rows: [{
                            id: 1,
                            order_number: 'ORD-20231201-1234',
                            customer_id: 1,
                            vendor_id: 2,
                            status: 'pending',
                            total_amount: 10000,
                            payment_status: 'pending',
                            created_at: new Date(),
                            updated_at: new Date()
                        }]
                    });
                }
                if (query.includes('UPDATE orders')) {
                    return Promise.resolve({
                        rows: [{
                            id: 1,
                            order_number: 'ORD-20231201-1234',
                            status: 'confirmed',
                            updated_at: new Date()
                        }]
                    });
                }
                if (query.includes('SELECT COUNT(*) as count')) {
                    return Promise.resolve({ rows: [{ count: 1 }] });
                }
                if (query.includes('INSERT INTO order_items')) {
                    return Promise.resolve({
                        rows: [{
                            id: 1,
                            order_id: 1,
                            product_id: 1,
                            quantity: 2,
                            unit_price: 5000,
                            total_price: 10000
                        }]
                    });
                }
                
                return Promise.resolve({ rows: [] });
            })
        };
    }

    /**
     * Créer un modèle Order
     */
    createOrderModel() {
        const Order = require('../src/Models/Order');
        return new Order(this.mockDb);
    }

    /**
     * Test création commande
     */
    testCreateOrder() {
        try {
            console.log('🧪 Test: Création commande...');

            const orderData = {
                order_number: 'ORD-20231201-1234',
                customer_id: 1,
                vendor_id: 2,
                status: 'pending',
                subtotal: 10000,
                tax_amount: 1925,
                shipping_amount: 1000,
                total_amount: 12925,
                commission_amount: 581,
                payment_status: 'pending',
                payment_method: 'mobile_money',
                shipping_address: '{"city":"Douala","country":"Cameroun"}',
                billing_address: '{"city":"Douala","country":"Cameroun"}',
                notes: 'Test order',
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = this.order.create(orderData);

            this.assert(result !== undefined, 'Le résultat ne doit pas être undefined');
            this.assert(typeof result.then === 'function', 'Le résultat doit être une promesse');

            result.then(order => {
                this.assert(order.id === 1, 'L\'ID doit être 1');
                this.assert(order.order_number === 'ORD-20231201-1234', 'Le numéro de commande doit correspondre');
                this.assert(order.customer_id === 1, 'L\'ID client doit correspondre');
                this.assert(order.vendor_id === 2, 'L\'ID vendeur doit correspondre');
                this.assert(order.status === 'pending', 'Le statut doit être pending');
                this.assert(order.total_amount === 12925, 'Le montant total doit correspondre');
            });

            this.addTestResult('Création commande', true);
            console.log('✅ Test création commande réussi');

        } catch (error) {
            this.addTestResult('Création commande', false, error.message);
            console.error('❌ Test création commande échoué:', error.message);
        }
    }

    /**
     * Test recherche commande par ID
     */
    testFindById() {
        try {
            console.log('🧪 Test: Recherche commande par ID...');

            const orderId = 1;
            const result = this.order.findById(orderId);

            result.then(order => {
                this.assert(order !== null, 'La commande ne doit pas être null');
                this.assert(order.id === orderId, 'L\'ID doit correspondre');
                this.assert(order.order_number === 'ORD-20231201-1234', 'Le numéro de commande doit correspondre');
                this.assert(order.status === 'pending', 'Le statut doit être pending');
            });

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
    testFindByIdWithDetails() {
        try {
            console.log('🧪 Test: Recherche commande avec détails...');

            const orderId = 1;
            
            // Simuler une réponse avec détails
            this.mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    order_number: 'ORD-20231201-1234',
                    customer_id: 1,
                    vendor_id: 2,
                    status: 'pending',
                    total_amount: 12925,
                    customer_name: 'John Doe',
                    vendor_name: 'Jane Smith',
                    items: [
                        {
                            id: 1,
                            product_id: 1,
                            quantity: 2,
                            unit_price: 5000,
                            total_price: 10000,
                            product_name: 'Test Product'
                        }
                    ]
                }]
            });

            const result = this.order.findByIdWithDetails(orderId);

            result.then(order => {
                this.assert(order !== null, 'La commande ne doit pas être null');
                this.assert(order.customer_name === 'John Doe', 'Le nom du client doit être inclus');
                this.assert(order.vendor_name === 'Jane Smith', 'Le nom du vendeur doit être inclus');
                this.assert(Array.isArray(order.items), 'Les items doivent être un tableau');
                this.assert(order.items.length === 1, 'Un item doit être présent');
            });

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
    testUpdate() {
        try {
            console.log('🧪 Test: Mise à jour commande...');

            const orderId = 1;
            const updateData = {
                status: 'confirmed',
                payment_status: 'paid',
                updated_at: new Date()
            };

            const result = this.order.update(orderId, updateData);

            result.then(order => {
                this.assert(order !== null, 'La commande ne doit pas être null');
                this.assert(order.status === 'confirmed', 'Le statut doit être mis à jour');
                this.assert(order.payment_status === 'paid', 'Le statut de paiement doit être mis à jour');
            });

            this.addTestResult('Mise à jour commande', true);
            console.log('✅ Test mise à jour commande réussi');

        } catch (error) {
            this.addTestResult('Mise à jour commande', false, error.message);
            console.error('❌ Test mise à jour commande échoué:', error.message);
        }
    }

    /**
     * Test recherche commandes
     */
    testSearch() {
        try {
            console.log('🧪 Test: Recherche commandes...');

            const filters = {
                customer_id: 1,
                status: 'pending',
                min_amount: 5000,
                max_amount: 15000
            };

            // Simuler des résultats de recherche
            this.mockDb.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, order_number: 'ORD-20231201-1234', total_amount: 12925 },
                    { id: 2, order_number: 'ORD-20231201-1235', total_amount: 8000 }
                ]
            });

            const result = this.order.search(filters, 20, 0);

            result.then(orders => {
                this.assert(Array.isArray(orders), 'Le résultat doit être un tableau');
                this.assert(orders.length >= 2, 'Au moins 2 commandes doivent être trouvées');
                this.assert(orders[0].total_amount >= 5000, 'Le montant doit respecter le filtre min');
                this.assert(orders[0].total_amount <= 15000, 'Le montant doit respecter le filtre max');
            });

            this.addTestResult('Recherche commandes', true);
            console.log('✅ Test recherche commandes réussi');

        } catch (error) {
            this.addTestResult('Recherche commandes', false, error.message);
            console.error('❌ Test recherche commandes échoué:', error.message);
        }
    }

    /**
     * Test comptage commandes
     */
    testCount() {
        try {
            console.log('🧪 Test: Comptage commandes...');

            const filters = { status: 'pending' };
            
            // Simuler un comptage
            this.mockDb.query.mockResolvedValueOnce({ rows: [{ count: 5 }] });

            const result = this.order.count(filters);

            result.then(count => {
                this.assert(typeof count === 'number', 'Le comptage doit être un nombre');
                this.assert(count === 5, 'Le comptage doit correspondre');
            });

            this.addTestResult('Comptage commandes', true);
            console.log('✅ Test comptage commandes réussi');

        } catch (error) {
            this.addTestResult('Comptage commandes', false, error.message);
            console.error('❌ Test comptage commandes échoué:', error.message);
        }
    }

    /**
     * Test création item de commande
     */
    testCreateOrderItem() {
        try {
            console.log('🧪 Test: Création item commande...');

            const itemData = {
                order_id: 1,
                product_id: 1,
                quantity: 2,
                unit_price: 5000,
                total_price: 10000,
                product_snapshot: '{"name":"Test Product","price":5000}',
                created_at: new Date()
            };

            const result = this.order.createOrderItem(itemData);

            result.then(item => {
                this.assert(item.id === 1, 'L\'ID doit être 1');
                this.assert(item.order_id === 1, 'L\'ID de commande doit correspondre');
                this.assert(item.product_id === 1, 'L\'ID de produit doit correspondre');
                this.assert(item.quantity === 2, 'La quantité doit correspondre');
                this.assert(item.unit_price === 5000, 'Le prix unitaire doit correspondre');
                this.assert(item.total_price === 10000, 'Le prix total doit correspondre');
            });

            this.addTestResult('Création item commande', true);
            console.log('✅ Test création item commande réussi');

        } catch (error) {
            this.addTestResult('Création item commande', false, error.message);
            console.error('❌ Test création item commande échoué:', error.message);
        }
    }

    /**
     * Test obtention items de commande
     */
    testGetOrderItems() {
        try {
            console.log('🧪 Test: Obtention items commande...');

            const orderId = 1;

            // Simuler des items
            this.mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        product_id: 1,
                        quantity: 2,
                        unit_price: 5000,
                        total_price: 10000,
                        product_name: 'Test Product 1'
                    },
                    {
                        id: 2,
                        product_id: 2,
                        quantity: 1,
                        unit_price: 3000,
                        total_price: 3000,
                        product_name: 'Test Product 2'
                    }
                ]
            });

            const result = this.order.getOrderItems(orderId);

            result.then(items => {
                this.assert(Array.isArray(items), 'Les items doivent être un tableau');
                this.assert(items.length === 2, 'Deux items doivent être trouvés');
                this.assert(items[0].product_name === 'Test Product 1', 'Le nom du premier produit doit correspondre');
                this.assert(items[1].quantity === 1, 'La quantité du deuxième item doit correspondre');
            });

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
    testUpdateProductStock() {
        try {
            console.log('🧪 Test: Mise à jour stock produit...');

            const productId = 1;
            const quantityChange = -2;

            const result = this.order.updateProductStock(productId, quantityChange);

            result.then(() => {
                // Vérifier que la requête a été appelée
                expect(this.mockDb.query).toHaveBeenCalledWith(
                    expect.stringContaining('UPDATE products'),
                    expect.arrayContaining([quantityChange, expect.any(Date), productId])
                );
            });

            this.addTestResult('Mise à jour stock produit', true);
            console.log('✅ Test mise à jour stock produit réussi');

        } catch (error) {
            this.addTestResult('Mise à jour stock produit', false, error.message);
            console.error('❌ Test mise à jour stock produit échoué:', error.message);
        }
    }

    /**
     * Test mise à jour totaux vendeur
     */
    testUpdateVendorTotals() {
        try {
            console.log('🧪 Test: Mise à jour totaux vendeur...');

            const vendorId = 2;
            const amount = 12925;

            const result = this.order.updateVendorTotals(vendorId, amount);

            result.then(() => {
                // Vérifier que la requête a été appelée
                expect(this.mockDb.query).toHaveBeenCalledWith(
                    expect.stringContaining('UPDATE users'),
                    expect.arrayContaining([amount, expect.any(Date), vendorId])
                );
            });

            this.addTestResult('Mise à jour totaux vendeur', true);
            console.log('✅ Test mise à jour totaux vendeur réussi');

        } catch (error) {
            this.addTestResult('Mise à jour totaux vendeur', false, error.message);
            console.error('❌ Test mise à jour totaux vendeur échoué:', error.message);
        }
    }

    /**
     * Test vérification commandes actives
     */
    testHasActiveOrders() {
        try {
            console.log('🧪 Test: Vérification commandes actives...');

            const productId = 1;

            // Simuler aucune commande active
            this.mockDb.query.mockResolvedValueOnce({ rows: [{ count: 0 }] });

            const result = this.order.hasActiveOrders(productId);

            result.then(hasActive => {
                this.assert(typeof hasActive === 'boolean', 'Le résultat doit être un booléen');
                this.assert(hasActive === false, 'Ne doit pas avoir de commandes actives');
            });

            this.addTestResult('Vérification commandes actives', true);
            console.log('✅ Test vérification commandes actives réussi');

        } catch (error) {
            this.addTestResult('Vérification commandes actives', false, error.message);
            console.error('❌ Test vérification commandes actives échoué:', error.message);
        }
    }

    /**
     * Test création avis
     */
    testCreateReview() {
        try {
            console.log('🧪 Test: Création avis...');

            const reviewData = {
                product_id: 1,
                order_id: 1,
                customer_id: 1,
                rating: 5,
                title: 'Excellent produit',
                content: 'Je suis très satisfait',
                is_verified: true,
                is_public: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Simuler la création d'avis
            this.mockDb.query.mockResolvedValueOnce({
                rows: [{ id: 1, rating: 5, title: 'Excellent produit' }]
            });

            const result = this.order.createReview(reviewData);

            result.then(review => {
                this.assert(review.id === 1, 'L\'ID doit être 1');
                this.assert(review.rating === 5, 'La note doit correspondre');
                this.assert(review.title === 'Excellent produit', 'Le titre doit correspondre');
            });

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
    testGetOrderReview() {
        try {
            console.log('🧪 Test: Obtention avis commande...');

            const orderId = 1;

            // Simuler un avis
            this.mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    order_id: 1,
                    rating: 5,
                    title: 'Excellent produit',
                    content: 'Je suis très satisfait'
                }]
            });

            const result = this.order.getOrderReview(orderId);

            result.then(review => {
                this.assert(review !== null, 'L\'avis ne doit pas être null');
                this.assert(review.order_id === orderId, 'L\'ID de commande doit correspondre');
                this.assert(review.rating === 5, 'La note doit correspondre');
            });

            this.addTestResult('Obtention avis commande', true);
            console.log('✅ Test obtention avis commande réussi');

        } catch (error) {
            this.addTestResult('Obtention avis commande', false, error.message);
            console.error('❌ Test obtention avis commande échoué:', error.message);
        }
    }

    /**
     * Test obtention statistiques vendeur
     */
    testGetVendorStats() {
        try {
            console.log('🧪 Test: Obtention statistiques vendeur...');

            const vendorId = 2;

            // Simuler des statistiques
            this.mockDb.query.mockResolvedValueOnce({
                rows: [{
                    total_orders: 10,
                    total_revenue: 100000,
                    average_order_value: 10000,
                    pending_orders: 2,
                    completed_orders: 8,
                    cancelled_orders: 0
                }]
            });

            const result = this.order.getVendorStats(vendorId);

            result.then(stats => {
                this.assert(stats.total_orders === 10, 'Le total de commandes doit correspondre');
                this.assert(stats.total_revenue === 100000, 'Le revenu total doit correspondre');
                this.assert(stats.average_order_value === 10000, 'La valeur moyenne doit correspondre');
                this.assert(stats.completed_orders === 8, 'Les commandes complétées doivent correspondre');
            });

            this.addTestResult('Obtention statistiques vendeur', true);
            console.log('✅ Test obtention statistiques vendeur réussi');

        } catch (error) {
            this.addTestResult('Obtention statistiques vendeur', false, error.message);
            console.error('❌ Test obtention statistiques vendeur échoué:', error.message);
        }
    }

    /**
     * Test génération numéro de commande
     */
    testGenerateOrderNumber() {
        try {
            console.log('🧪 Test: Génération numéro commande...');

            const orderNumber1 = this.order.generateOrderNumber();
            const orderNumber2 = this.order.generateOrderNumber();

            this.assert(typeof orderNumber1 === 'string', 'Le numéro doit être une chaîne');
            this.assert(orderNumber1.startsWith('ORD-'), 'Le numéro doit commencer par ORD-');
            this.assert(orderNumber1.length > 15, 'Le numéro doit avoir une longueur suffisante');
            this.assert(orderNumber1 !== orderNumber2, 'Les numéros doivent être uniques');

            // Vérifier le format
            const regex = /^ORD-\d{8}-\d{4}$/;
            this.assert(regex.test(orderNumber1), 'Le format doit être correct');

            this.addTestResult('Génération numéro commande', true);
            console.log('✅ Test génération numéro commande réussi');

        } catch (error) {
            this.addTestResult('Génération numéro commande', false, error.message);
            console.error('❌ Test génération numéro commande échoué:', error.message);
        }
    }

    /**
     * Test calcul frais de livraison
     */
    testCalculateShipping() {
        try {
            console.log('🧪 Test: Calcul frais livraison...');

            const weight = 500; // 500g
            const address = { city: 'Douala', country: 'Cameroun' };

            const shippingCost = this.order.calculateShipping(weight, address);

            this.assert(typeof shippingCost === 'number', 'Les frais doivent être un nombre');
            this.assert(shippingCost > 0, 'Les frais doivent être positifs');

            // Test avec poids plus élevé
            const heavyWeight = 2000; // 2kg
            const heavyShippingCost = this.order.calculateShipping(heavyWeight, address);
            this.assert(heavyShippingCost > shippingCost, 'Les frais doivent augmenter avec le poids');

            // Test avec ville éloignée
            const remoteAddress = { city: 'Bamenda', country: 'Cameroun' };
            const remoteShippingCost = this.order.calculateShipping(weight, remoteAddress);
            this.assert(remoteShippingCost >= shippingCost, 'Les frais pour ville éloignée doivent être supérieurs ou égaux');

            this.addTestResult('Calcul frais livraison', true);
            console.log('✅ Test calcul frais livraison réussi');

        } catch (error) {
            this.addTestResult('Calcul frais livraison', false, error.message);
            console.error('❌ Test calcul frais livraison échoué:', error.message);
        }
    }

    /**
     * Test validation statut commande
     */
    testValidateStatus() {
        try {
            console.log('🧪 Test: Validation statut commande...');

            const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

            for (const status of validStatuses) {
                const isValid = this.order.validateStatus(status);
                this.assert(isValid === true, `Le statut ${status} doit être valide`);
            }

            const invalidStatuses = ['invalid', 'test', '', null, undefined];
            for (const status of invalidStatuses) {
                const isValid = this.order.validateStatus(status);
                this.assert(isValid === false, `Le statut ${status} doit être invalide`);
            }

            this.addTestResult('Validation statut commande', true);
            console.log('✅ Test validation statut commande réussi');

        } catch (error) {
            this.addTestResult('Validation statut commande', false, error.message);
            console.error('❌ Test validation statut commande échoué:', error.message);
        }
    }

    /**
     * Test calcul commission
     */
    testCalculateCommission() {
        try {
            console.log('🧪 Test: Calcul commission...');

            const totalAmount = 12925;
            const commissionRate = 450; // 4.5%

            const commission = this.order.calculateCommission(totalAmount, commissionRate);

            this.assert(typeof commission === 'number', 'La commission doit être un nombre');
            this.assert(commission > 0, 'La commission doit être positive');

            const expectedCommission = Math.round(totalAmount * (commissionRate / 10000));
            this.assert(commission === expectedCommission, 'La commission doit être calculée correctement');

            // Test avec différents taux
            const silverCommission = this.order.calculateCommission(totalAmount, 425); // 4.25%
            this.assert(silverCommission < commission, 'La commission Silver doit être inférieure');

            this.addTestResult('Calcul commission', true);
            console.log('✅ Test calcul commission réussi');

        } catch (error) {
            this.addTestResult('Calcul commission', false, error.message);
            console.error('❌ Test calcul commission échoué:', error.message);
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
        console.log('🚀 Démarrage des tests Order...\n');

        const tests = [
            () => this.testCreateOrder(),
            () => this.testFindById(),
            () => this.testFindByIdWithDetails(),
            () => this.testUpdate(),
            () => this.testSearch(),
            () => this.testCount(),
            () => this.testCreateOrderItem(),
            () => this.testGetOrderItems(),
            () => this.testUpdateProductStock(),
            () => this.testUpdateVendorTotals(),
            () => this.testHasActiveOrders(),
            () => this.testCreateReview(),
            () => this.testGetOrderReview(),
            () => this.testGetVendorStats(),
            () => this.testGenerateOrderNumber(),
            () => this.testCalculateShipping(),
            () => this.testValidateStatus(),
            () => this.testCalculateCommission()
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
    test.runAllTests();
}

module.exports = OrderTest;
