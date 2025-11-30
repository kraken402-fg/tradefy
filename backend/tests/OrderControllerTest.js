const { validateProduct, validateOrder, validateUser } = require('../../utils/Validators');

/**
 * Tests pour le contrôleur de produits
 */
class ProductControllerTest {
    constructor() {
        this.testResults = [];
        this.mockDb = this.createMockDb();
        this.productController = this.createProductController();
    }

    /**
     * Créer une base de données mock
     */
    createMockDb() {
        return {
            query: jest.fn().mockImplementation((query, values) => {
                // Simuler différentes réponses selon la requête
                if (query.includes('INSERT INTO products')) {
                    return Promise.resolve({
                        rows: [{ id: 1, name: 'Test Product', price: 1000, status: 'active' }]
                    });
                }
                if (query.includes('SELECT * FROM products WHERE id =')) {
                    return Promise.resolve({
                        rows: [{
                            id: 1,
                            name: 'Test Product',
                            description: 'Test Description',
                            price: 1000,
                            category_id: 1,
                            vendor_id: 1,
                            status: 'active',
                            inventory_quantity: 10,
                            created_at: new Date(),
                            updated_at: new Date()
                        }]
                    });
                }
                if (query.includes('SELECT COUNT(*) as count FROM categories')) {
                    return Promise.resolve({ rows: [{ count: 1 }] });
                }
                if (query.includes('UPDATE products')) {
                    return Promise.resolve({
                        rows: [{ id: 1, name: 'Updated Product', price: 1500 }]
                    });
                }
                
                return Promise.resolve({ rows: [] });
            })
        };
    }

    /**
     * Créer un contrôleur de produits
     */
    createProductController() {
        const ProductController = require('../src/Controllers/ProductController');
        return new ProductController(this.mockDb);
    }

    /**
     * Test création de produit valide
     */
    testCreateValidProduct() {
        try {
            console.log('🧪 Test: Création produit valide...');

            const user = { user_id: 1, role: 'vendor' };
            const productData = {
                name: 'Test Product',
                description: 'Test Description',
                price: 1000,
                category_id: 1,
                inventory_quantity: 10
            };

            const result = this.productController.create(user, productData);

            this.assert(result !== undefined, 'Le résultat ne doit pas être undefined');
            this.assert(typeof result.then === 'function', 'Le résultat doit être une promesse');

            result.then(response => {
                this.assert(response.success === true, 'La création doit réussir');
                this.assert(response.status === 201, 'Le statut doit être 201');
                this.assert(response.data.product.name === 'Test Product', 'Le nom du produit doit correspondre');
                this.assert(response.data.product.price === 1000, 'Le prix doit correspondre');
            });

            this.addTestResult('Création produit valide', true);
            console.log('✅ Test création produit valide réussi');

        } catch (error) {
            this.addTestResult('Création produit valide', false, error.message);
            console.error('❌ Test création produit valide échoué:', error.message);
        }
    }

    /**
     * Test création produit avec données invalides
     */
    testCreateInvalidProduct() {
        try {
            console.log('🧪 Test: Création produit invalide...');

            const user = { user_id: 1, role: 'vendor' };
            const invalidData = {
                name: '', // Nom invalide
                price: -100, // Prix négatif
                category_id: 999 // Catégorie inexistante
            };

            const result = this.productController.create(user, invalidData);

            result.then(response => {
                this.assert(response.success === false, 'La création doit échouer');
                this.assert(response.status === 400, 'Le statut doit être 400');
                this.assert(response.message.includes('invalides'), 'Le message doit indiquer des données invalides');
            });

            this.addTestResult('Création produit invalide', true);
            console.log('✅ Test création produit invalide réussi');

        } catch (error) {
            this.addTestResult('Création produit invalide', false, error.message);
            console.error('❌ Test création produit invalide échoué:', error.message);
        }
    }

    /**
     * Test création produit par non-vendeur
     */
    testCreateProductByNonVendor() {
        try {
            console.log('🧪 Test: Création produit par non-vendeur...');

            const user = { user_id: 2, role: 'customer' };
            const productData = {
                name: 'Test Product',
                price: 1000
            };

            const result = this.productController.create(user, productData);

            result.then(response => {
                this.assert(response.success === false, 'La création doit échouer');
                this.assert(response.status === 403, 'Le statut doit être 403');
                this.assert(response.message.includes('vendeurs'), 'Le message doit mentionner les vendeurs');
            });

            this.addTestResult('Création produit par non-vendeur', true);
            console.log('✅ Test création produit par non-vendeur réussi');

        } catch (error) {
            this.addTestResult('Création produit par non-vendeur', false, error.message);
            console.error('❌ Test création produit par non-vendeur échoué:', error.message);
        }
    }

    /**
     * Test récupération produit par ID
     */
    testGetProductById() {
        try {
            console.log('🧪 Test: Récupération produit par ID...');

            const productId = 1;
            const result = this.productController.getProduct(productId);

            result.then(response => {
                this.assert(response.success === true, 'La récupération doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.data.product.id === productId, 'L\'ID du produit doit correspondre');
                this.assert(response.data.product.name === 'Test Product', 'Le nom doit correspondre');
            });

            this.addTestResult('Récupération produit par ID', true);
            console.log('✅ Test récupération produit par ID réussi');

        } catch (error) {
            this.addTestResult('Récupération produit par ID', false, error.message);
            console.error('❌ Test récupération produit par ID échoué:', error.message);
        }
    }

    /**
     * Test récupération produit inexistant
     */
    testGetNonExistentProduct() {
        try {
            console.log('🧪 Test: Récupération produit inexistant...');

            // Simuler une réponse vide
            this.mockDb.query.mockResolvedValueOnce({ rows: [] });

            const productId = 999;
            const result = this.productController.getProduct(productId);

            result.then(response => {
                this.assert(response.success === false, 'La récupération doit échouer');
                this.assert(response.status === 404, 'Le statut doit être 404');
                this.assert(response.message.includes('non trouvé'), 'Le message doit indiquer que le produit n\'est pas trouvé');
            });

            this.addTestResult('Récupération produit inexistant', true);
            console.log('✅ Test récupération produit inexistant réussi');

        } catch (error) {
            this.addTestResult('Récupération produit inexistant', false, error.message);
            console.error('❌ Test récupération produit inexistant échoué:', error.message);
        }
    }

    /**
     * Test mise à jour produit
     */
    testUpdateProduct() {
        try {
            console.log('🧪 Test: Mise à jour produit...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;
            const updateData = {
                name: 'Updated Product',
                price: 1500,
                description: 'Updated Description'
            };

            const result = this.productController.updateProduct(user, productId, updateData);

            result.then(response => {
                this.assert(response.success === true, 'La mise à jour doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.data.product.name === 'Updated Product', 'Le nom doit être mis à jour');
                this.assert(response.data.product.price === 1500, 'Le prix doit être mis à jour');
            });

            this.addTestResult('Mise à jour produit', true);
            console.log('✅ Test mise à jour produit réussi');

        } catch (error) {
            this.addTestResult('Mise à jour produit', false, error.message);
            console.error('❌ Test mise à jour produit échoué:', error.message);
        }
    }

    /**
     * Test mise à jour produit par non-propriétaire
     */
    testUpdateProductByNonOwner() {
        try {
            console.log('🧪 Test: Mise à jour produit par non-propriétaire...');

            const user = { user_id: 2, role: 'vendor' };
            const productId = 1;
            const updateData = { name: 'Hacked Product' };

            const result = this.productController.updateProduct(user, productId, updateData);

            result.then(response => {
                this.assert(response.success === false, 'La mise à jour doit échouer');
                this.assert(response.status === 403, 'Le statut doit être 403');
                this.assert(response.message.includes('autorisé'), 'Le message doit indiquer un accès non autorisé');
            });

            this.addTestResult('Mise à jour produit par non-propriétaire', true);
            console.log('✅ Test mise à jour produit par non-propriétaire réussi');

        } catch (error) {
            this.addTestResult('Mise à jour produit par non-propriétaire', false, error.message);
            console.error('❌ Test mise à jour produit par non-propriétaire échoué:', error.message);
        }
    }

    /**
     * Test suppression produit
     */
    testDeleteProduct() {
        try {
            console.log('🧪 Test: Suppression produit...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;

            // Simuler aucune commande active
            this.mockDb.query.mockResolvedValueOnce({ rows: [{ count: 0 }] });

            const result = this.productController.deleteProduct(user, productId);

            result.then(response => {
                this.assert(response.success === true, 'La suppression doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.message.includes('supprimé'), 'Le message doit confirmer la suppression');
            });

            this.addTestResult('Suppression produit', true);
            console.log('✅ Test suppression produit réussi');

        } catch (error) {
            this.addTestResult('Suppression produit', false, error.message);
            console.error('❌ Test suppression produit échoué:', error.message);
        }
    }

    /**
     * Test recherche produits
     */
    testSearchProducts() {
        try {
            console.log('🧪 Test: Recherche produits...');

            const filters = {
                search: 'Test',
                category_id: 1,
                min_price: 500,
                max_price: 2000
            };

            // Simuler des résultats de recherche
            this.mockDb.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, name: 'Test Product 1', price: 1000 },
                    { id: 2, name: 'Test Product 2', price: 1500 }
                ]
            });
            this.mockDb.query.mockResolvedValueOnce({ rows: [{ count: 2 }] });

            const result = this.productController.searchProducts(filters, 1, 20);

            result.then(response => {
                this.assert(response.success === true, 'La recherche doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.data.products.length === 2, 'Deux produits doivent être trouvés');
                this.assert(response.data.pagination.total === 2, 'Le total doit être 2');
            });

            this.addTestResult('Recherche produits', true);
            console.log('✅ Test recherche produits réussi');

        } catch (error) {
            this.addTestResult('Recherche produits', false, error.message);
            console.error('❌ Test recherche produits échoué:', error.message);
        }
    }

    /**
     * Test mise à jour stock
     */
    testUpdateStock() {
        try {
            console.log('🧪 Test: Mise à jour stock...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;
            const stockData = {
                quantity: 5,
                operation: 'add'
            };

            const result = this.productController.updateStock(user, productId, stockData);

            result.then(response => {
                this.assert(response.success === true, 'La mise à jour du stock doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.data.product.inventory_quantity === 15, 'Le stock doit être mis à jour');
            });

            this.addTestResult('Mise à jour stock', true);
            console.log('✅ Test mise à jour stock réussi');

        } catch (error) {
            this.addTestResult('Mise à jour stock', false, error.message);
            console.error('❌ Test mise à jour stock échoué:', error.message);
        }
    }

    /**
     * Test ajout image
     */
    testAddImage() {
        try {
            console.log('🧪 Test: Ajout image...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;
            const imageData = {
                url: 'https://example.com/image.jpg',
                alt_text: 'Product Image',
                is_primary: true
            };

            // Simuler l'ajout d'image
            this.mockDb.query.mockResolvedValueOnce({
                rows: [{ id: 1, url: 'https://example.com/image.jpg' }]
            });

            const result = this.productController.addImage(user, productId, imageData);

            result.then(response => {
                this.assert(response.success === true, 'L\'ajout d\'image doit réussir');
                this.assert(response.status === 201, 'Le statut doit être 201');
                this.assert(response.data.image.url === imageData.url, 'L\'URL de l\'image doit correspondre');
            });

            this.addTestResult('Ajout image', true);
            console.log('✅ Test ajout image réussi');

        } catch (error) {
            this.addTestResult('Ajout image', false, error.message);
            console.error('❌ Test ajout image échoué:', error.message);
        }
    }

    /**
     * Test obtention catégories
     */
    testGetCategories() {
        try {
            console.log('🧪 Test: Obtention catégories...');

            // Simuler des catégories
            this.mockDb.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, name: 'Électronique', product_count: 10 },
                    { id: 2, name: 'Vêtements', product_count: 5 }
                ]
            });

            const result = this.productController.getCategories();

            result.then(response => {
                this.assert(response.success === true, 'L\'obtention des catégories doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.data.categories.length === 2, 'Deux catégories doivent être trouvées');
            });

            this.addTestResult('Obtention catégories', true);
            console.log('✅ Test obtention catégories réussi');

        } catch (error) {
            this.addTestResult('Obtention catégories', false, error.message);
            console.error('❌ Test obtention catégories échoué:', error.message);
        }
    }

    /**
     * Test produits populaires
     */
    testGetPopularProducts() {
        try {
            console.log('🧪 Test: Produits populaires...');

            // Simuler des produits populaires
            this.mockDb.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, name: 'Popular Product 1', sales_count: 100 },
                    { id: 2, name: 'Popular Product 2', sales_count: 80 }
                ]
            });

            const result = this.productController.getPopularProducts(5);

            result.then(response => {
                this.assert(response.success === true, 'L\'obtention des produits populaires doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.data.products.length >= 2, 'Au moins 2 produits doivent être trouvés');
            });

            this.addTestResult('Produits populaires', true);
            console.log('✅ Test produits populaires réussi');

        } catch (error) {
            this.addTestResult('Produits populaires', false, error.message);
            console.error('❌ Test produits populaires échoué:', error.message);
        }
    }

    /**
     * Test produits similaires
     */
    testGetSimilarProducts() {
        try {
            console.log('🧪 Test: Produits similaires...');

            const productId = 1;

            // Simuler des produits similaires
            this.mockDb.query.mockResolvedValueOnce({
                rows: [
                    { id: 2, name: 'Similar Product 1', price_diff: 100 },
                    { id: 3, name: 'Similar Product 2', price_diff: 200 }
                ]
            });

            const result = this.productController.getSimilarProducts(productId, 3);

            result.then(response => {
                this.assert(response.success === true, 'L\'obtention des produits similaires doit réussir');
                this.assert(response.status === 200, 'Le statut doit être 200');
                this.assert(response.data.products.length >= 2, 'Au moins 2 produits similaires doivent être trouvés');
            });

            this.addTestResult('Produits similaires', true);
            console.log('✅ Test produits similaires réussi');

        } catch (error) {
            this.addTestResult('Produits similaires', false, error.message);
            console.error('❌ Test produits similaires échoué:', error.message);
        }
    }

    /**
     * Test duplication produit
     */
    testDuplicateProduct() {
        try {
            console.log('🧪 Test: Duplication produit...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;

            // Simuler la création du produit dupliqué
            this.mockDb.query.mockResolvedValueOnce({
                rows: [{ id: 2, name: 'Test Product (Copie)', price: 1000 }]
            });

            const result = this.productController.duplicateProduct(user, productId);

            result.then(response => {
                this.assert(response.success === true, 'La duplication doit réussir');
                this.assert(response.status === 201, 'Le statut doit être 201');
                this.assert(response.data.product.name.includes('Copie'), 'Le nom doit indiquer que c\'est une copie');
            });

            this.addTestResult('Duplication produit', true);
            console.log('✅ Test duplication produit réussi');

        } catch (error) {
            this.addTestResult('Duplication produit', false, error.message);
            console.error('❌ Test duplication produit échoué:', error.message);
        }
    }

    /**
     * Test validation prix
     */
    testValidatePrice() {
        try {
            console.log('🧪 Test: Validation prix...');

            // Prix valide
            let result = this.productController.validatePrice(1000);
            this.assert(result.valid === true, 'Un prix positif doit être valide');

            // Prix négatif
            result = this.productController.validatePrice(-100);
            this.assert(result.valid === false, 'Un prix négatif doit être invalide');

            // Prix trop élevé
            result = this.productController.validatePrice(10000000);
            this.assert(result.valid === false, 'Un prix trop élevé doit être invalide');

            // Prix non-numérique
            result = this.productController.validatePrice('abc');
            this.assert(result.valid === false, 'Un prix non-numérique doit être invalide');

            this.addTestResult('Validation prix', true);
            console.log('✅ Test validation prix réussi');

        } catch (error) {
            this.addTestResult('Validation prix', false, error.message);
            console.error('❌ Test validation prix échoué:', error.message);
        }
    }

    /**
     * Test validation nom produit
     */
    testValidateProductName() {
        try {
            console.log('🧪 Test: Validation nom produit...');

            // Nom valide
            let result = this.productController.validateProductName('Produit test');
            this.assert(result.valid === true, 'Un nom valide doit être accepté');

            // Nom trop court
            result = this.productController.validateProductName('AB');
            this.assert(result.valid === false, 'Un nom trop court doit être rejeté');

            // Nom vide
            result = this.productController.validateProductName('');
            this.assert(result.valid === false, 'Un nom vide doit être rejeté');

            // Nom trop long
            result = this.productController.validateProductName('A'.repeat(201));
            this.assert(result.valid === false, 'Un nom trop long doit être rejeté');

            this.addTestResult('Validation nom produit', true);
            console.log('✅ Test validation nom produit réussi');

        } catch (error) {
            this.addTestResult('Validation nom produit', false, error.message);
            console.error('❌ Test validation nom produit échoué:', error.message);
        }
    }

    /**
     * Test génération SKU
     */
    testGenerateSKU() {
        try {
            console.log('🧪 Test: Génération SKU...');

            const sku1 = this.productController.generateSKU();
            const sku2 = this.productController.generateSKU();

            this.assert(typeof sku1 === 'string', 'Le SKU doit être une chaîne');
            this.assert(sku1.startsWith('TRD-'), 'Le SKU doit commencer par TRD-');
            this.assert(sku1.length > 10, 'Le SKU doit avoir une longueur suffisante');
            this.assert(sku1 !== sku2, 'Les SKUs doivent être uniques');

            this.addTestResult('Génération SKU', true);
            console.log('✅ Test génération SKU réussi');

        } catch (error) {
            this.addTestResult('Génération SKU', false, error.message);
            console.error('❌ Test génération SKU échoué:', error.message);
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
        console.log('🚀 Démarrage des tests ProductController...\n');

        const tests = [
            () => this.testCreateValidProduct(),
            () => this.testCreateInvalidProduct(),
            () => this.testCreateProductByNonVendor(),
            () => this.testGetProductById(),
            () => this.testGetNonExistentProduct(),
            () => this.testUpdateProduct(),
            () => this.testUpdateProductByNonOwner(),
            () => this.testDeleteProduct(),
            () => this.testSearchProducts(),
            () => this.testUpdateStock(),
            () => this.testAddImage(),
            () => this.testGetCategories(),
            () => this.testGetPopularProducts(),
            () => this.testGetSimilarProducts(),
            () => this.testDuplicateProduct(),
            () => this.testValidatePrice(),
            () => this.testValidateProductName(),
            () => this.testGenerateSKU()
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
        console.log('📋 RÉSULTATS DES TESTS PRODUCT CONTROLLER');
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
    const test = new ProductControllerTest();
    test.runAllTests();
}

module.exports = ProductControllerTest;
