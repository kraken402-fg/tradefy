const ProductController = require('../controllers/ProductController');
const Product = require('../models/Product');

/**
 * Tests pour ProductController
 */
class ProductControllerTest {
    constructor() {
        this.mockDb = {
            query: jest.fn()
        };
        this.productController = new ProductController(this.mockDb);
        this.testResults = [];
    }

    /**
     * Test création produit valide
     */
    async testCreateValidProduct() {
        try {
            console.log('🧪 Test: Création produit valide...');

            const user = { user_id: 1, role: 'vendor' };
            const productData = {
                name: 'Test Product',
                description: 'Test description',
                price: 10000,
                category_id: 1,
                inventory_quantity: 50,
                weight: 500
            };

            // Mock création produit
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, ...productData, vendor_id: user.user_id }] 
            });

            const result = await this.productController.create(user, productData);

            this.assert(result.success === true, 'La création devrait réussir');
            this.assert(result.status === 201, 'Statut 201');
            this.assert(result.data.product.name === productData.name, 'Nom correct');

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
    async testCreateInvalidProduct() {
        try {
            console.log('🧪 Test: Création produit données invalides...');

            const user = { user_id: 1, role: 'vendor' };
            const productData = {
                name: '', // Nom vide
                price: -1000, // Prix négatif
                description: 'a'.repeat(3000) // Description trop longue
            };

            const result = await this.productController.create(user, productData);

            this.assert(result.success === false, 'La création devrait échouer');
            this.assert(result.status === 400, 'Statut 400');

            this.addTestResult('Création produit données invalides', true);
            console.log('✅ Test création produit données invalides réussi');

        } catch (error) {
            this.addTestResult('Création produit données invalides', false, error.message);
            console.error('❌ Test création produit données invalides échoué:', error.message);
        }
    }

    /**
     * Test obtention produit par ID
     */
    async testGetProductById() {
        try {
            console.log('🧪 Test: Obtention produit par ID...');

            const productId = 1;
            const mockProduct = {
                id: productId,
                name: 'Test Product',
                price: 10000,
                vendor_id: 1,
                status: 'active'
            };

            // Mock recherche produit
            this.mockDb.query.mockResolvedValueOnce({ rows: [mockProduct] });

            const result = await this.productController.getProduct(productId);

            this.assert(result.success === true, 'La recherche devrait réussir');
            this.assert(result.data.product.id === productId, 'ID correct');
            this.assert(result.data.product.name === mockProduct.name, 'Nom correct');

            this.addTestResult('Obtention produit par ID', true);
            console.log('✅ Test obtention produit par ID réussi');

        } catch (error) {
            this.addTestResult('Obtention produit par ID', false, error.message);
            console.error('❌ Test obtention produit par ID échoué:', error.message);
        }
    }

    /**
     * Test mise à jour produit
     */
    async testUpdateProduct() {
        try {
            console.log('🧪 Test: Mise à jour produit...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;
            const updateData = {
                name: 'Updated Product',
                price: 15000,
                description: 'Updated description'
            };

            // Mock vérification propriétaire
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ vendor_id: user.user_id }] 
            });

            // Mock mise à jour
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: productId, ...updateData }] 
            });

            const result = await this.productController.updateProduct(user, productId, updateData);

            this.assert(result.success === true, 'La mise à jour devrait réussir');
            this.assert(result.data.product.name === updateData.name, 'Nom mis à jour');

            this.addTestResult('Mise à jour produit', true);
            console.log('✅ Test mise à jour produit réussi');

        } catch (error) {
            this.addTestResult('Mise à jour produit', false, error.message);
            console.error('❌ Test mise à jour produit échoué:', error.message);
        }
    }

    /**
     * Test suppression produit
     */
    async testDeleteProduct() {
        try {
            console.log('🧪 Test: Suppression produit...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;

            // Mock vérification propriétaire
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ vendor_id: user.user_id }] 
            });

            // Mock suppression
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: productId }] 
            });

            const result = await this.productController.deleteProduct(user, productId);

            this.assert(result.success === true, 'La suppression devrait réussir');
            this.assert(result.status === 200, 'Statut 200');

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
    async testSearchProducts() {
        try {
            console.log('🧪 Test: Recherche produits...');

            const filters = {
                search: 'test',
                category_id: 1,
                min_price: 1000,
                max_price: 20000
            };
            const page = 1;
            const perPage = 20;

            // Mock recherche
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, name: 'Test Product 1', price: 10000 },
                    { id: 2, name: 'Test Product 2', price: 15000 }
                ] 
            });

            // Mock comptage
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ count: 2 }] 
            });

            const result = await this.productController.searchProducts(filters, page, perPage);

            this.assert(result.success === true, 'La recherche devrait réussir');
            this.assert(result.data.products.length === 2, '2 produits trouvés');
            this.assert(result.data.pagination.total === 2, 'Total de 2 produits');

            this.addTestResult('Recherche produits', true);
            console.log('✅ Test recherche produits réussi');

        } catch (error) {
            this.addTestResult('Recherche produits', false, error.message);
            console.error('❌ Test recherche produits échoué:', error.message);
        }
    }

    /**
     * Test obtention produits vendeur
     */
    async testGetVendorProducts() {
        try {
            console.log('🧪 Test: Obtention produits vendeur...');

            const user = { user_id: 1, role: 'vendor' };
            const page = 1;
            const perPage = 20;

            // Mock produits vendeur
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, name: 'Vendor Product 1', vendor_id: user.user_id },
                    { id: 2, name: 'Vendor Product 2', vendor_id: user.user_id }
                ] 
            });

            // Mock comptage
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ count: 2 }] 
            });

            const result = await this.productController.getVendorProducts(user, page, perPage);

            this.assert(result.success === true, 'La recherche devrait réussir');
            this.assert(result.data.products.length === 2, '2 produits trouvés');
            this.assert(result.data.products[0].vendor_id === user.user_id, 'Produit du vendeur');

            this.addTestResult('Obtention produits vendeur', true);
            console.log('✅ Test obtention produits vendeur réussi');

        } catch (error) {
            this.addTestResult('Obtention produits vendeur', false, error.message);
            console.error('❌ Test obtention produits vendeur échoué:', error.message);
        }
    }

    /**
     * Test mise à jour stock
     */
    async testUpdateStock() {
        try {
            console.log('🧪 Test: Mise à jour stock...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;
            const stockData = {
                inventory_quantity: 100,
                operation: 'set'
            };

            // Mock vérification propriétaire
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ vendor_id: user.user_id }] 
            });

            // Mock mise à jour stock
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: productId, inventory_quantity: 100 }] 
            });

            const result = await this.productController.updateStock(user, productId, stockData);

            this.assert(result.success === true, 'La mise à jour devrait réussir');
            this.assert(result.data.product.inventory_quantity === 100, 'Stock mis à jour');

            this.addTestResult('Mise à jour stock', true);
            console.log('✅ Test mise à jour stock réussi');

        } catch (error) {
            this.addTestResult('Mise à jour stock', false, error.message);
            console.error('❌ Test mise à jour stock échoué:', error.message);
        }
    }

    /**
     * Test upload image
     */
    async testUploadImage() {
        try {
            console.log('🧪 Test: Upload image...');

            const user = { user_id: 1, role: 'vendor' };
            const imageData = {
                product_id: 1,
                image_url: 'https://example.com/image.jpg',
                alt_text: 'Product image'
            };

            // Mock vérification propriétaire
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ vendor_id: user.user_id }] 
            });

            // Mock insertion image
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ id: 1, ...imageData }] 
            });

            const result = await this.productController.uploadImage(user, imageData);

            this.assert(result.success === true, 'L\'upload devrait réussir');
            this.assert(result.data.image.image_url === imageData.image_url, 'URL image correcte');

            this.addTestResult('Upload image', true);
            console.log('✅ Test upload image réussi');

        } catch (error) {
            this.addTestResult('Upload image', false, error.message);
            console.error('❌ Test upload image échoué:', error.message);
        }
    }

    /**
     * Test suppression image
     */
    async testDeleteImage() {
        try {
            console.log('🧪 Test: Suppression image...');

            const user = { user_id: 1, role: 'vendor' };
            const productId = 1;
            const imageUrl = 'https://example.com/image.jpg';

            // Mock vérification propriétaire
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [{ vendor_id: user.user_id }] 
            });

            // Mock suppression image
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [] 
            });

            const result = await this.productController.deleteImage(user, productId, imageUrl);

            this.assert(result.success === true, 'La suppression devrait réussir');
            this.assert(result.status === 200, 'Statut 200');

            this.addTestResult('Suppression image', true);
            console.log('✅ Test suppression image réussi');

        } catch (error) {
            this.addTestResult('Suppression image', false, error.message);
            console.error('❌ Test suppression image échoué:', error.message);
        }
    }

    /**
     * Test obtention catégories
     */
    async testGetCategories() {
        try {
            console.log('🧪 Test: Obtention catégories...');

            // Mock catégories
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, name: 'Électronique', description: 'Produits électroniques' },
                    { id: 2, name: 'Vêtements', description: 'Vêtements et accessoires' }
                ] 
            });

            const result = await this.productController.getCategories();

            this.assert(result.success === true, 'La recherche devrait réussir');
            this.assert(result.data.categories.length === 2, '2 catégories trouvées');
            this.assert(result.data.categories[0].name === 'Électronique', 'Première catégorie correcte');

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
    async testGetPopularProducts() {
        try {
            console.log('🧪 Test: Produits populaires...');

            const limit = 10;

            // Mock produits populaires
            this.mockDb.query.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, name: 'Popular Product 1', sales_count: 100 },
                    { id: 2, name: 'Popular Product 2', sales_count: 85 }
                ] 
            });

            const result = await this.productController.getPopularProducts(limit);

            this.assert(result.success === true, 'La recherche devrait réussir');
            this.assert(result.data.products.length === 2, '2 produits populaires');
            this.assert(result.data.products[0].sales_count === 100, '100 ventes pour le premier');

            this.addTestResult('Produits populaires', true);
            console.log('✅ Test produits populaires réussi');

        } catch (error) {
            this.addTestResult('Produits populaires', false, error.message);
            console.error('❌ Test produits populaires échoué:', error.message);
        }
    }

    /**
     * Test validation prix
     */
    testValidatePrice() {
        try {
            console.log('🧪 Test: Validation prix...');

            // Test prix valide
            let result = this.productController.validatePrice(10000);
            this.assert(result.valid === true, '10000 valide');

            // Test prix négatif
            result = this.productController.validatePrice(-1000);
            this.assert(result.valid === false, 'Prix négatif invalide');

            // Test prix trop élevé
            result = this.productController.validatePrice(10000000);
            this.assert(result.valid === false, 'Prix trop élevé invalide');

            // Test type invalide
            result = this.productController.validatePrice('invalid');
            this.assert(result.valid === false, 'Type invalide');

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

            // Test nom valide
            let result = this.productController.validateProductName('Test Product');
            this.assert(result.valid === true, 'Nom valide');

            // Test nom vide
            result = this.productController.validateProductName('');
            this.assert(result.valid === false, 'Nom vide invalide');

            // Test nom trop court
            result = this.productController.validateProductName('A');
            this.assert(result.valid === false, 'Nom trop court invalide');

            // Test nom trop long
            result = this.productController.validateProductName('A'.repeat(300));
            this.assert(result.valid === false, 'Nom trop long invalide');

            this.addTestResult('Validation nom produit', true);
            console.log('✅ Test validation nom produit réussi');

        } catch (error) {
            this.addTestResult('Validation nom produit', false, error.message);
            console.error('❌ Test validation nom produit échoué:', error.message);
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
        console.log('🚀 Démarrage des tests ProductController...\n');

        const tests = [
            () => this.testCreateValidProduct(),
            () => this.testCreateInvalidProduct(),
            () => this.testGetProductById(),
            () => this.testUpdateProduct(),
            () => this.testDeleteProduct(),
            () => this.testSearchProducts(),
            () => this.testGetVendorProducts(),
            () => this.testUpdateStock(),
            () => this.testUploadImage(),
            () => this.testDeleteImage(),
            () => this.testGetCategories(),
            () => this.testGetPopularProducts(),
            () => this.testValidatePrice(),
            () => this.testValidateProductName()
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
        console.log('📋 RÉSULTATS DES TESTS PRODUCTCONTROLLER');
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
    test.runAllTests().catch(error => {
        console.error('Erreur lors des tests:', error);
        process.exit(1);
    });
}

module.exports = ProductControllerTest;
