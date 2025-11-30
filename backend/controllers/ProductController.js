const { config, isProduction } = require('../config/platforms');
const Product = require('../models/Product');
const SupabaseService = require('../services/SupabaseService');

class ProductController {
    constructor(db) {
        this.db = db;
        this.productModel = new Product(db);
        this.supabaseService = new SupabaseService();
    }

    /**
     * Créer un nouveau produit
     */
    async create(userData, productData) {
        try {
            // Validation des données
            const validation = this.validateProductData(productData);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: validation.message,
                        code: 'VALIDATION_ERROR'
                    },
                    timestamp: Date.now()
                };
            }

            // Ajouter les informations du vendeur
            const completeProductData = {
                vendor_id: userData.user_id,
                name: productData.name,
                description: productData.description || '',
                price: parseFloat(productData.price),
                compare_price: productData.compare_price ? parseFloat(productData.compare_price) : null,
                sku: productData.sku || this.generateSKU(),
                barcode: productData.barcode || null,
                track_inventory: productData.track_inventory !== false,
                inventory_quantity: parseInt(productData.inventory_quantity) || 0,
                inventory_policy: productData.inventory_policy || 'deny',
                weight: productData.weight ? parseFloat(productData.weight) : null,
                requires_shipping: productData.requires_shipping !== false,
                taxable: productData.taxable !== false,
                status: productData.status || 'active',
                featured: productData.featured || false,
                category_id: productData.category_id || null,
                tags: productData.tags || [],
                seo_title: productData.seo_title || productData.name,
                seo_description: productData.seo_description || productData.description,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Créer le produit
            const product = await this.productModel.create(completeProductData);

            // Gérer les images si fournies
            if (productData.images && productData.images.length > 0) {
                await this.handleProductImages(product.id, productData.images);
            }

            return {
                success: true,
                status: 201,
                data: {
                    product: product,
                    message: 'Produit créé avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Create product error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'CREATE_PRODUCT_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Mettre à jour un produit
     */
    async updateProduct(userData, productId, updateData) {
        try {
            // Vérifier que le produit existe et appartient à l'utilisateur
            const existingProduct = await this.productModel.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Produit non trouvé',
                        code: 'PRODUCT_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            if (existingProduct.vendor_id !== userData.user_id && userData.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            // Validation des données
            const validation = this.validateProductData(updateData, true);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: validation.message,
                        code: 'VALIDATION_ERROR'
                    },
                    timestamp: Date.now()
                };
            }

            // Préparer les données de mise à jour
            const updateFields = {
                ...updateData,
                price: updateData.price ? parseFloat(updateData.price) : existingProduct.price,
                compare_price: updateData.compare_price ? parseFloat(updateData.compare_price) : existingProduct.compare_price,
                inventory_quantity: updateData.inventory_quantity ? parseInt(updateData.inventory_quantity) : existingProduct.inventory_quantity,
                weight: updateData.weight ? parseFloat(updateData.weight) : existingProduct.weight,
                updated_at: new Date()
            };

            // Mettre à jour le produit
            const updatedProduct = await this.productModel.update(productId, updateFields);

            // Gérer les images si fournies
            if (updateData.images) {
                await this.handleProductImages(productId, updateData.images);
            }

            return {
                success: true,
                status: 200,
                data: {
                    product: updatedProduct,
                    message: 'Produit mis à jour avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Update product error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'UPDATE_PRODUCT_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Supprimer un produit
     */
    async deleteProduct(userData, productId) {
        try {
            // Vérifier que le produit existe et appartient à l'utilisateur
            const existingProduct = await this.productModel.findById(productId);
            if (!existingProduct) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Produit non trouvé',
                        code: 'PRODUCT_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            if (existingProduct.vendor_id !== userData.user_id && userData.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            // Archiver les images du produit
            const images = await this.productModel.getProductImages(productId);
            for (const image of images) {
                await this.supabaseService.deleteFile(image.url);
            }

            // Supprimer le produit
            await this.productModel.delete(productId);

            return {
                success: true,
                status: 200,
                data: {
                    message: 'Produit supprimé avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Delete product error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'DELETE_PRODUCT_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir un produit par ID
     */
    async getProduct(productId) {
        try {
            const product = await this.productModel.findByIdWithDetails(productId);
            
            if (!product) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Produit non trouvé',
                        code: 'PRODUCT_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            if (product.status !== 'active') {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Produit non disponible',
                        code: 'PRODUCT_UNAVAILABLE'
                    },
                    timestamp: Date.now()
                };
            }

            return {
                success: true,
                status: 200,
                data: {
                    product: product
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get product error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_PRODUCT_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Rechercher des produits
     */
    async searchProducts(filters = {}, page = 1, perPage = 20) {
        try {
            const searchFilters = {
                status: 'active',
                search: filters.search || null,
                category_id: filters.category_id || null,
                min_price: filters.min_price ? parseFloat(filters.min_price) : null,
                max_price: filters.max_price ? parseFloat(filters.max_price) : null,
                vendor_id: filters.vendor_id || null,
                featured: filters.featured || null,
                tags: filters.tags || null,
                sort_by: filters.sort_by || 'created_at',
                sort_order: filters.sort_order || 'desc'
            };

            const offset = (page - 1) * perPage;
            
            const products = await this.productModel.search(searchFilters, perPage, offset);
            const total = await this.productModel.count(searchFilters);

            return {
                success: true,
                status: 200,
                data: {
                    products: products,
                    pagination: {
                        page: page,
                        per_page: perPage,
                        total: total,
                        total_pages: Math.ceil(total / perPage),
                        has_next: page * perPage < total,
                        has_prev: page > 1
                    }
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Search products error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'SEARCH_PRODUCTS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les produits d'un vendeur
     */
    async getVendorProducts(userData, page = 1, perPage = 20) {
        try {
            const filters = {
                vendor_id: userData.user_id,
                status: 'active'
            };

            const offset = (page - 1) * perPage;
            
            const products = await this.productModel.search(filters, perPage, offset);
            const total = await this.productModel.count(filters);

            return {
                success: true,
                status: 200,
                data: {
                    products: products,
                    pagination: {
                        page: page,
                        per_page: perPage,
                        total: total,
                        total_pages: Math.ceil(total / perPage)
                    }
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get vendor products error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_VENDOR_PRODUCTS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les produits avec stock faible
     */
    async getLowStockProducts(userData, threshold = 5) {
        try {
            const products = await this.productModel.getLowStock(userData.user_id, threshold);

            return {
                success: true,
                status: 200,
                data: {
                    products: products,
                    threshold: threshold
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get low stock products error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_LOW_STOCK_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Mettre à jour le stock d'un produit
     */
    async updateStock(userData, productId, stockData) {
        try {
            // Vérifier que le produit appartient à l'utilisateur
            const product = await this.productModel.findById(productId);
            if (!product) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Produit non trouvé',
                        code: 'PRODUCT_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            if (product.vendor_id !== userData.user_id && userData.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            const newQuantity = parseInt(stockData.inventory_quantity);
            if (newQuantity < 0) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'La quantité ne peut pas être négative',
                        code: 'INVALID_QUANTITY'
                    },
                    timestamp: Date.now()
                };
            }

            const updatedProduct = await this.productModel.updateStock(productId, newQuantity);

            return {
                success: true,
                status: 200,
                data: {
                    product: updatedProduct,
                    message: 'Stock mis à jour avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Update stock error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'UPDATE_STOCK_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Uploader une image de produit
     */
    async uploadImage(userData, imageData) {
        try {
            // Vérifier que le produit appartient à l'utilisateur
            const product = await this.productModel.findById(imageData.product_id);
            if (!product) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Produit non trouvé',
                        code: 'PRODUCT_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            if (product.vendor_id !== userData.user_id && userData.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            if (!imageData.image) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Aucune image fournie',
                        code: 'NO_IMAGE_PROVIDED'
                    },
                    timestamp: Date.now()
                };
            }

            // Uploader l'image sur Supabase
            const uploadResult = await this.supabaseService.uploadProductImage(
                imageData.image, 
                imageData.product_id, 
                imageData.is_main || false
            );

            if (!uploadResult.success) {
                return uploadResult;
            }

            // Sauvegarder l'image dans la base de données
            const savedImage = await this.productModel.saveProductImage({
                product_id: imageData.product_id,
                url: uploadResult.data.url,
                alt_text: imageData.alt_text || product.name,
                position: imageData.position || 0,
                is_main: imageData.is_main || false
            });

            return {
                success: true,
                status: 201,
                data: {
                    image: savedImage,
                    message: 'Image uploadée avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Upload image error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'UPLOAD_IMAGE_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Supprimer une image de produit
     */
    async deleteImage(userData, productId, imageUrl) {
        try {
            // Vérifier que le produit appartient à l'utilisateur
            const product = await this.productModel.findById(productId);
            if (!product) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Produit non trouvé',
                        code: 'PRODUCT_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            if (product.vendor_id !== userData.user_id && userData.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            // Supprimer l'image de Supabase
            const deleteResult = await this.supabaseService.deleteProductImage(imageUrl);
            if (!deleteResult.success) {
                return deleteResult;
            }

            // Supprimer l'image de la base de données
            await this.productModel.deleteProductImage(productId, imageUrl);

            return {
                success: true,
                status: 200,
                data: {
                    message: 'Image supprimée avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Delete image error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'DELETE_IMAGE_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les catégories
     */
    async getCategories() {
        try {
            const categories = await this.productModel.getCategories();

            return {
                success: true,
                status: 200,
                data: {
                    categories: categories
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get categories error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_CATEGORIES_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les produits populaires
     */
    async getPopularProducts(limit = 10) {
        try {
            const products = await this.productModel.getPopularProducts(limit);

            return {
                success: true,
                status: 200,
                data: {
                    products: products
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get popular products error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_POPULAR_PRODUCTS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    // ====================
    // 🔧 MÉTHODES PRIVÉES
    // ====================

    /**
     * Valider les données de produit
     */
    validateProductData(data, isUpdate = false) {
        if (!isUpdate && !data.name) {
            return {
                valid: false,
                message: 'Le nom du produit est requis'
            };
        }

        if (!isUpdate && !data.price) {
            return {
                valid: false,
                message: 'Le prix du produit est requis'
            };
        }

        if (data.price && (parseFloat(data.price) < config.app.products.minPrice || parseFloat(data.price) > config.app.products.maxPrice)) {
            return {
                valid: false,
                message: `Le prix doit être entre ${config.app.products.minPrice} et ${config.app.products.maxPrice}`
            };
        }

        if (data.inventory_quantity && parseInt(data.inventory_quantity) < 0) {
            return {
                valid: false,
                message: 'La quantité ne peut pas être négative'
            };
        }

        if (data.weight && parseFloat(data.weight) < 0) {
            return {
                valid: false,
                message: 'Le poids ne peut pas être négatif'
            };
        }

        return { valid: true };
    }

    /**
     * Générer un SKU unique
     */
    generateSKU() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `TRF-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Gérer les images d'un produit
     */
    async handleProductImages(productId, images) {
        for (const imageData of images) {
            if (imageData.file) {
                await this.supabaseService.uploadProductImage(imageData.file, productId, imageData.is_main || false);
            }
        }
    }

    /**
     * Gérer l'upload de fichiers
     */
    async handleFileUploads(req) {
        return new Promise((resolve, reject) => {
            const multer = require('multer');
            const upload = multer({ dest: 'tmp/' }).single('image');
            
            upload(req, {}, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(req.file);
                }
            });
        });
    }
}

module.exports = ProductController;
