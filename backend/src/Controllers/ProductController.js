const Product = require('../../models/Product');
const User = require('../../models/User');
const { validateProduct, validateProductUpdate } = require('../../utils/Validators');

/**
 * Contrôleur pour la gestion des produits
 */
class ProductController {
    constructor(db) {
        this.db = db;
        this.product = new Product(db);
        this.user = new User(db);
    }

    /**
     * Créer un nouveau produit
     */
    async create(user, productData) {
        try {
            // Valider les données
            const validation = validateProduct(productData);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    message: 'Données invalides',
                    errors: validation.errors
                };
            }

            // Vérifier que l'utilisateur est un vendeur
            if (user.role !== 'vendor' && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Seuls les vendeurs peuvent créer des produits'
                };
            }

            // Vérifier que la catégorie existe
            if (productData.category_id) {
                const categoryExists = await this.product.categoryExists(productData.category_id);
                if (!categoryExists) {
                    return {
                        success: false,
                        status: 400,
                        message: 'Catégorie non trouvée'
                    };
                }
            }

            // Créer le produit
            const product = await this.product.create({
                vendor_id: user.user_id,
                name: productData.name,
                description: productData.description,
                price: productData.price,
                category_id: productData.category_id,
                inventory_quantity: productData.inventory_quantity || 0,
                weight: productData.weight,
                dimensions: productData.dimensions ? JSON.stringify(productData.dimensions) : null,
                sku: productData.sku || this.generateSKU(),
                barcode: productData.barcode || null,
                image_url: productData.image_url || null,
                status: productData.status || 'active',
                featured: productData.featured || false,
                tags: productData.tags ? JSON.stringify(productData.tags) : null,
                attributes: productData.attributes ? JSON.stringify(productData.attributes) : null,
                seo_title: productData.seo_title || productData.name,
                seo_description: productData.seo_description || productData.description,
                created_at: new Date(),
                updated_at: new Date()
            });

            return {
                success: true,
                status: 201,
                message: 'Produit créé avec succès',
                data: {
                    product: product
                }
            };

        } catch (error) {
            console.error('Erreur lors de la création du produit:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la création du produit',
                error: error.message
            };
        }
    }

    /**
     * Obtenir un produit par ID
     */
    async getProduct(productId) {
        try {
            const product = await this.product.findByIdWithDetails(productId);
            
            if (!product) {
                return {
                    success: false,
                    status: 404,
                    message: 'Produit non trouvé'
                };
            }

            // Incrémenter le nombre de vues
            await this.product.incrementViewCount(productId);

            return {
                success: true,
                status: 200,
                data: {
                    product: product
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération du produit:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération du produit',
                error: error.message
            };
        }
    }

    /**
     * Mettre à jour un produit
     */
    async updateProduct(user, productId, updateData) {
        try {
            // Valider les données
            const validation = validateProductUpdate(updateData);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    message: 'Données invalides',
                    errors: validation.errors
                };
            }

            // Obtenir le produit existant
            const existingProduct = await this.product.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    message: 'Produit non trouvé'
                };
            }

            // Vérifier les permissions
            if (existingProduct.vendor_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Préparer les données de mise à jour
            const updateFields = {
                ...updateData,
                updated_at: new Date()
            };

            // Convertir les champs JSON
            if (updateData.dimensions) {
                updateFields.dimensions = JSON.stringify(updateData.dimensions);
            }
            if (updateData.tags) {
                updateFields.tags = JSON.stringify(updateData.tags);
            }
            if (updateData.attributes) {
                updateFields.attributes = JSON.stringify(updateData.attributes);
            }

            // Mettre à jour le produit
            const updatedProduct = await this.product.update(productId, updateFields);

            return {
                success: true,
                status: 200,
                message: 'Produit mis à jour avec succès',
                data: {
                    product: updatedProduct
                }
            };

        } catch (error) {
            console.error('Erreur lors de la mise à jour du produit:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la mise à jour du produit',
                error: error.message
            };
        }
    }

    /**
     * Supprimer un produit
     */
    async deleteProduct(user, productId) {
        try {
            // Obtenir le produit existant
            const existingProduct = await this.product.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    message: 'Produit non trouvé'
                };
            }

            // Vérifier les permissions
            if (existingProduct.vendor_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Vérifier que le produit n'est pas dans des commandes actives
            const hasActiveOrders = await this.product.hasActiveOrders(productId);
            if (hasActiveOrders) {
                return {
                    success: false,
                    status: 400,
                    message: 'Impossible de supprimer un produit avec des commandes actives'
                };
            }

            // Supprimer le produit (soft delete)
            await this.product.delete(productId);

            return {
                success: true,
                status: 200,
                message: 'Produit supprimé avec succès'
            };

        } catch (error) {
            console.error('Erreur lors de la suppression du produit:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la suppression du produit',
                error: error.message
            };
        }
    }

    /**
     * Rechercher des produits
     */
    async searchProducts(filters = {}, page = 1, perPage = 20) {
        try {
            const limit = perPage;
            const offset = (page - 1) * perPage;

            const products = await this.product.search(filters, limit, offset);
            const total = await this.product.count(filters);

            return {
                success: true,
                status: 200,
                data: {
                    products: products,
                    pagination: {
                        page: page,
                        per_page: perPage,
                        total: total,
                        pages: Math.ceil(total / perPage)
                    }
                }
            };

        } catch (error) {
            console.error('Erreur lors de la recherche des produits:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la recherche des produits',
                error: error.message
            };
        }
    }

    /**
     * Obtenir les produits d'un vendeur
     */
    async getVendorProducts(user, page = 1, perPage = 20) {
        try {
            const limit = perPage;
            const offset = (page - 1) * perPage;

            const products = await this.product.findByVendor(user.user_id, limit, offset);
            const total = await this.product.countByVendor(user.user_id);

            return {
                success: true,
                status: 200,
                data: {
                    products: products,
                    pagination: {
                        page: page,
                        per_page: perPage,
                        total: total,
                        pages: Math.ceil(total / perPage)
                    }
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des produits du vendeur:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des produits du vendeur',
                error: error.message
            };
        }
    }

    /**
     * Mettre à jour le stock d'un produit
     */
    async updateStock(user, productId, stockData) {
        try {
            // Obtenir le produit existant
            const existingProduct = await this.product.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    message: 'Produit non trouvé'
                };
            }

            // Vérifier les permissions
            if (existingProduct.vendor_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            const { quantity, operation = 'set' } = stockData;
            let newQuantity;

            switch (operation) {
                case 'set':
                    newQuantity = quantity;
                    break;
                case 'add':
                    newQuantity = existingProduct.inventory_quantity + quantity;
                    break;
                case 'subtract':
                    newQuantity = existingProduct.inventory_quantity - quantity;
                    if (newQuantity < 0) {
                        return {
                            success: false,
                            status: 400,
                            message: 'Stock insuffisant'
                        };
                    }
                    break;
                default:
                    return {
                        success: false,
                        status: 400,
                        message: 'Opération invalide'
                    };
            }

            // Mettre à jour le stock
            const updatedProduct = await this.product.update(productId, {
                inventory_quantity: newQuantity,
                updated_at: new Date()
            });

            // Mettre à jour le statut du produit si nécessaire
            let status = existingProduct.status;
            if (newQuantity === 0 && status === 'active') {
                status = 'out_of_stock';
                await this.product.update(productId, { status });
            } else if (newQuantity > 0 && status === 'out_of_stock') {
                status = 'active';
                await this.product.update(productId, { status });
            }

            return {
                success: true,
                status: 200,
                message: 'Stock mis à jour avec succès',
                data: {
                    product: { ...updatedProduct, status }
                }
            };

        } catch (error) {
            console.error('Erreur lors de la mise à jour du stock:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la mise à jour du stock',
                error: error.message
            };
        }
    }

    /**
     * Ajouter une image à un produit
     */
    async addImage(user, productId, imageData) {
        try {
            // Obtenir le produit existant
            const existingProduct = await this.product.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    message: 'Produit non trouvé'
                };
            }

            // Vérifier les permissions
            if (existingProduct.vendor_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Ajouter l'image
            const image = await this.product.addImage(productId, {
                url: imageData.url,
                alt_text: imageData.alt_text || '',
                is_primary: imageData.is_primary || false,
                sort_order: imageData.sort_order || 0,
                created_at: new Date()
            });

            // Si c'est l'image primaire, mettre à jour le produit
            if (imageData.is_primary) {
                await this.product.update(productId, {
                    image_url: imageData.url,
                    updated_at: new Date()
                });
            }

            return {
                success: true,
                status: 201,
                message: 'Image ajoutée avec succès',
                data: {
                    image: image
                }
            };

        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'image:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de l\'ajout de l\'image',
                error: error.message
            };
        }
    }

    /**
     * Supprimer une image d'un produit
     */
    async removeImage(user, productId, imageId) {
        try {
            // Obtenir le produit existant
            const existingProduct = await this.product.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    message: 'Produit non trouvé'
                };
            }

            // Vérifier les permissions
            if (existingProduct.vendor_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Supprimer l'image
            await this.product.removeImage(imageId);

            return {
                success: true,
                status: 200,
                message: 'Image supprimée avec succès'
            };

        } catch (error) {
            console.error('Erreur lors de la suppression de l\'image:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la suppression de l\'image',
                error: error.message
            };
        }
    }

    /**
     * Obtenir les catégories
     */
    async getCategories() {
        try {
            const categories = await this.product.getCategories();

            return {
                success: true,
                status: 200,
                data: {
                    categories: categories
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des catégories:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des catégories',
                error: error.message
            };
        }
    }

    /**
     * Obtenir les produits populaires
     */
    async getPopularProducts(limit = 10) {
        try {
            const products = await this.product.getPopularProducts(limit);

            return {
                success: true,
                status: 200,
                data: {
                    products: products
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des produits populaires:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des produits populaires',
                error: error.message
            };
        }
    }

    /**
     * Obtenir les produits en vedette
     */
    async getFeaturedProducts(limit = 10) {
        try {
            const products = await this.product.getFeaturedProducts(limit);

            return {
                success: true,
                status: 200,
                data: {
                    products: products
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des produits en vedette:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des produits en vedette',
                error: error.message
            };
        }
    }

    /**
     * Obtenir les produits similaires
     */
    async getSimilarProducts(productId, limit = 5) {
        try {
            const products = await this.product.getSimilarProducts(productId, limit);

            return {
                success: true,
                status: 200,
                data: {
                    products: products
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des produits similaires:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des produits similaires',
                error: error.message
            };
        }
    }

    /**
     * Dupliquer un produit
     */
    async duplicateProduct(user, productId) {
        try {
            // Obtenir le produit existant
            const existingProduct = await this.product.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    message: 'Produit non trouvé'
                };
            }

            // Vérifier les permissions
            if (existingProduct.vendor_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Créer la copie
            const duplicatedProduct = await this.product.create({
                vendor_id: existingProduct.vendor_id,
                name: `${existingProduct.name} (Copie)`,
                description: existingProduct.description,
                price: existingProduct.price,
                category_id: existingProduct.category_id,
                inventory_quantity: 0,
                weight: existingProduct.weight,
                dimensions: existingProduct.dimensions,
                sku: this.generateSKU(),
                barcode: null,
                image_url: existingProduct.image_url,
                status: 'draft',
                featured: false,
                tags: existingProduct.tags,
                attributes: existingProduct.attributes,
                seo_title: existingProduct.seo_title,
                seo_description: existingProduct.seo_description,
                created_at: new Date(),
                updated_at: new Date()
            });

            return {
                success: true,
                status: 201,
                message: 'Produit dupliqué avec succès',
                data: {
                    product: duplicatedProduct
                }
            };

        } catch (error) {
            console.error('Erreur lors de la duplication du produit:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la duplication du produit',
                error: error.message
            };
        }
    }

    /**
     * Générer un SKU unique
     */
    generateSKU() {
        const prefix = 'TRD'; // Tradefy
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `${prefix}-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Valider le prix d'un produit
     */
    validatePrice(price) {
        if (typeof price !== 'number' || price < 0) {
            return { valid: false, message: 'Le prix doit être un nombre positif' };
        }
        if (price > 9999999.99) {
            return { valid: false, message: 'Le prix ne peut pas dépasser 9,999,999.99' };
        }
        return { valid: true };
    }

    /**
     * Valider le nom d'un produit
     */
    validateProductName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: 'Le nom est requis' };
        }
        if (name.length < 3) {
            return { valid: false, message: 'Le nom doit contenir au moins 3 caractères' };
        }
        if (name.length > 200) {
            return { valid: false, message: 'Le nom ne peut pas dépasser 200 caractères' };
        }
        return { valid: true };
    }
}

module.exports = ProductController;
