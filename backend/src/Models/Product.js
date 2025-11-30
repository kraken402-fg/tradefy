const { validateProduct, validateProductUpdate } = require('../../utils/Validators');

/**
 * Modèle pour la gestion des produits
 */
class Product {
    constructor(db) {
        this.db = db;
    }

    /**
     * Créer un nouveau produit
     */
    async create(productData) {
        try {
            const query = `
                INSERT INTO products (
                    vendor_id, name, description, price, category_id, 
                    inventory_quantity, weight, dimensions, sku, barcode,
                    image_url, status, featured, tags, attributes,
                    seo_title, seo_description, view_count, sales_count,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19,
                    $20, $21
                ) RETURNING *
            `;

            const values = [
                productData.vendor_id,
                productData.name,
                productData.description,
                productData.price,
                productData.category_id,
                productData.inventory_quantity || 0,
                productData.weight,
                productData.dimensions,
                productData.sku,
                productData.barcode,
                productData.image_url,
                productData.status || 'active',
                productData.featured || false,
                productData.tags,
                productData.attributes,
                productData.seo_title,
                productData.seo_description,
                0, // view_count
                0, // sales_count
                productData.created_at,
                productData.updated_at
            ];

            const result = await this.db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la création du produit:', error);
            throw error;
        }
    }

    /**
     * Obtenir un produit par ID
     */
    async findById(productId) {
        try {
            const query = `
                SELECT p.*, c.name as category_name,
                       u.username as vendor_username, u.full_name as vendor_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.vendor_id = u.id
                WHERE p.id = $1 AND p.deleted_at IS NULL
            `;

            const result = await this.db.query(query, [productId]);
            return result.rows[0] || null;

        } catch (error) {
            console.error('Erreur lors de la recherche du produit:', error);
            throw error;
        }
    }

    /**
     * Obtenir un produit avec détails complets
     */
    async findByIdWithDetails(productId) {
        try {
            const query = `
                SELECT p.*, c.name as category_name,
                       u.username as vendor_username, u.full_name as vendor_name,
                       u.rank as vendor_rank,
                       COALESCE(AVG(r.rating), 0) as average_rating,
                       COUNT(r.id) as review_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.vendor_id = u.id
                LEFT JOIN reviews r ON p.id = r.product_id AND r.is_public = true
                WHERE p.id = $1 AND p.deleted_at IS NULL
                GROUP BY p.id, c.name, u.username, u.full_name, u.rank
            `;

            const result = await this.db.query(query, [productId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const product = result.rows[0];

            // Parser les champs JSON
            if (product.tags) {
                product.tags = JSON.parse(product.tags);
            } else {
                product.tags = [];
            }

            if (product.attributes) {
                product.attributes = JSON.parse(product.attributes);
            } else {
                product.attributes = {};
            }

            if (product.dimensions) {
                product.dimensions = JSON.parse(product.dimensions);
            } else {
                product.dimensions = {};
            }

            // Obtenir les images du produit
            const imagesQuery = `
                SELECT * FROM product_images
                WHERE product_id = $1
                ORDER BY sort_order ASC, id ASC
            `;

            const imagesResult = await this.db.query(imagesQuery, [productId]);
            product.images = imagesResult.rows;

            return product;

        } catch (error) {
            console.error('Erreur lors de la recherche du produit avec détails:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour un produit
     */
    async update(productId, updateData) {
        try {
            const fields = [];
            const values = [];
            let paramIndex = 1;

            // Construire dynamiquement la requête
            for (const [key, value] of Object.entries(updateData)) {
                if (key !== 'id') {
                    fields.push(`${key} = $${paramIndex++}`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                throw new Error('Aucun champ à mettre à jour');
            }

            fields.push(`updated_at = $${paramIndex++}`);
            values.push(new Date());

            values.push(productId);

            const query = `
                UPDATE products 
                SET ${fields.join(', ')}
                WHERE id = $${paramIndex} AND deleted_at IS NULL
                RETURNING *
            `;

            const result = await this.db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la mise à jour du produit:', error);
            throw error;
        }
    }

    /**
     * Supprimer un produit (soft delete)
     */
    async delete(productId) {
        try {
            const query = `
                UPDATE products 
                SET deleted_at = $1, updated_at = $2
                WHERE id = $3
            `;

            await this.db.query(query, [new Date(), new Date(), productId]);

        } catch (error) {
            console.error('Erreur lors de la suppression du produit:', error);
            throw error;
        }
    }

    /**
     * Rechercher des produits
     */
    async search(filters = {}, limit = 20, offset = 0) {
        try {
            let whereClause = 'WHERE p.deleted_at IS NULL';
            const params = [];
            let paramIndex = 1;

            // Filtres
            if (filters.search) {
                whereClause += ` AND (
                    p.name ILIKE $${paramIndex} OR 
                    p.description ILIKE $${paramIndex} OR 
                    p.sku ILIKE $${paramIndex}
                )`;
                params.push(`%${filters.search}%`);
                paramIndex++;
            }

            if (filters.category_id) {
                whereClause += ` AND p.category_id = $${paramIndex}`;
                params.push(filters.category_id);
                paramIndex++;
            }

            if (filters.vendor_id) {
                whereClause += ` AND p.vendor_id = $${paramIndex}`;
                params.push(filters.vendor_id);
                paramIndex++;
            }

            if (filters.status) {
                whereClause += ` AND p.status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }

            if (filters.featured !== undefined) {
                whereClause += ` AND p.featured = $${paramIndex}`;
                params.push(filters.featured);
                paramIndex++;
            }

            if (filters.min_price !== undefined) {
                whereClause += ` AND p.price >= $${paramIndex}`;
                params.push(filters.min_price);
                paramIndex++;
            }

            if (filters.max_price !== undefined) {
                whereClause += ` AND p.price <= $${paramIndex}`;
                params.push(filters.max_price);
                paramIndex++;
            }

            if (filters.in_stock !== undefined) {
                if (filters.in_stock) {
                    whereClause += ` AND p.inventory_quantity > 0`;
                } else {
                    whereClause += ` AND p.inventory_quantity = 0`;
                }
            }

            // Tri
            let orderClause = 'ORDER BY';
            const sortBy = filters.sort_by || 'created_at';
            const sortOrder = filters.sort_order || 'DESC';

            const allowedSortFields = ['name', 'price', 'created_at', 'view_count', 'sales_count', 'average_rating'];
            if (allowedSortFields.includes(sortBy)) {
                if (sortBy === 'average_rating') {
                    orderClause += ` COALESCE(avg_rating, 0) ${sortOrder}`;
                } else {
                    orderClause += ` p.${sortBy} ${sortOrder}`;
                }
            } else {
                orderClause += ` p.created_at DESC`;
            }

            const query = `
                SELECT p.*, c.name as category_name,
                       u.username as vendor_username, u.full_name as vendor_name,
                       COALESCE(AVG(r.rating), 0) as average_rating,
                       COUNT(r.id) as review_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.vendor_id = u.id
                LEFT JOIN reviews r ON p.id = r.product_id AND r.is_public = true
                ${whereClause}
                GROUP BY p.id, c.name, u.username, u.full_name
                ${orderClause}
                LIMIT $${paramIndex++} OFFSET $${paramIndex}
            `;

            params.push(limit, offset);

            const result = await this.db.query(query, params);

            // Parser les champs JSON pour chaque produit
            return result.rows.map(product => {
                if (product.tags) {
                    product.tags = JSON.parse(product.tags);
                } else {
                    product.tags = [];
                }

                if (product.attributes) {
                    product.attributes = JSON.parse(product.attributes);
                } else {
                    product.attributes = {};
                }

                return product;
            });

        } catch (error) {
            console.error('Erreur lors de la recherche des produits:', error);
            throw error;
        }
    }

    /**
     * Compter les produits
     */
    async count(filters = {}) {
        try {
            let whereClause = 'WHERE deleted_at IS NULL';
            const params = [];
            let paramIndex = 1;

            // Appliquer les mêmes filtres que dans search()
            if (filters.search) {
                whereClause += ` AND (
                    name ILIKE $${paramIndex} OR 
                    description ILIKE $${paramIndex} OR 
                    sku ILIKE $${paramIndex}
                )`;
                params.push(`%${filters.search}%`);
                paramIndex++;
            }

            if (filters.category_id) {
                whereClause += ` AND category_id = $${paramIndex}`;
                params.push(filters.category_id);
                paramIndex++;
            }

            if (filters.vendor_id) {
                whereClause += ` AND vendor_id = $${paramIndex}`;
                params.push(filters.vendor_id);
                paramIndex++;
            }

            if (filters.status) {
                whereClause += ` AND status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }

            if (filters.featured !== undefined) {
                whereClause += ` AND featured = $${paramIndex}`;
                params.push(filters.featured);
                paramIndex++;
            }

            if (filters.min_price !== undefined) {
                whereClause += ` AND price >= $${paramIndex}`;
                params.push(filters.min_price);
                paramIndex++;
            }

            if (filters.max_price !== undefined) {
                whereClause += ` AND price <= $${paramIndex}`;
                params.push(filters.max_price);
                paramIndex++;
            }

            if (filters.in_stock !== undefined) {
                if (filters.in_stock) {
                    whereClause += ` AND inventory_quantity > 0`;
                } else {
                    whereClause += ` AND inventory_quantity = 0`;
                }
            }

            const query = `SELECT COUNT(*) as count FROM products ${whereClause}`;
            const result = await this.db.query(query, params);

            return parseInt(result.rows[0].count);

        } catch (error) {
            console.error('Erreur lors du comptage des produits:', error);
            throw error;
        }
    }

    /**
     * Obtenir les produits d'un vendeur
     */
    async findByVendor(vendorId, limit = 20, offset = 0) {
        return this.search({ vendor_id: vendorId }, limit, offset);
    }

    /**
     * Compter les produits d'un vendeur
     */
    async countByVendor(vendorId) {
        return this.count({ vendor_id: vendorId });
    }

    /**
     * Vérifier si une catégorie existe
     */
    async categoryExists(categoryId) {
        try {
            const query = 'SELECT id FROM categories WHERE id = $1';
            const result = await this.db.query(query, [categoryId]);
            return result.rows.length > 0;

        } catch (error) {
            console.error('Erreur lors de la vérification de la catégorie:', error);
            return false;
        }
    }

    /**
     * Incrémenter le nombre de vues
     */
    async incrementViewCount(productId) {
        try {
            const query = `
                UPDATE products 
                SET view_count = view_count + 1, updated_at = $1
                WHERE id = $2
            `;

            await this.db.query(query, [new Date(), productId]);

        } catch (error) {
            console.error('Erreur lors de l\'incrémentation du nombre de vues:', error);
        }
    }

    /**
     * Incrémenter le nombre de ventes
     */
    async incrementSalesCount(productId, quantity = 1) {
        try {
            const query = `
                UPDATE products 
                SET sales_count = sales_count + $1, updated_at = $2
                WHERE id = $3
            `;

            await this.db.query(query, [quantity, new Date(), productId]);

        } catch (error) {
            console.error('Erreur lors de l\'incrémentation du nombre de ventes:', error);
        }
    }

    /**
     * Mettre à jour le stock
     */
    async updateStock(productId, quantity) {
        try {
            const query = `
                UPDATE products 
                SET inventory_quantity = $1, updated_at = $2
                WHERE id = $3
            `;

            await this.db.query(query, [quantity, new Date(), productId]);

        } catch (error) {
            console.error('Erreur lors de la mise à jour du stock:', error);
            throw error;
        }
    }

    /**
     * Vérifier si le produit a des commandes actives
     */
    async hasActiveOrders(productId) {
        try {
            const query = `
                SELECT COUNT(*) as count 
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.product_id = $1 
                AND o.status NOT IN ('delivered', 'cancelled', 'refunded')
            `;

            const result = await this.db.query(query, [productId]);
            return parseInt(result.rows[0].count) > 0;

        } catch (error) {
            console.error('Erreur lors de la vérification des commandes actives:', error);
            return false;
        }
    }

    /**
     * Ajouter une image au produit
     */
    async addImage(productId, imageData) {
        try {
            const query = `
                INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [
                productId,
                imageData.url,
                imageData.alt_text,
                imageData.is_primary,
                imageData.sort_order,
                imageData.created_at
            ];

            const result = await this.db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'image:', error);
            throw error;
        }
    }

    /**
     * Supprimer une image de produit
     */
    async removeImage(imageId) {
        try {
            const query = 'DELETE FROM product_images WHERE id = $1';
            await this.db.query(query, [imageId]);

        } catch (error) {
            console.error('Erreur lors de la suppression de l\'image:', error);
            throw error;
        }
    }

    /**
     * Obtenir les catégories
     */
    async getCategories() {
        try {
            const query = `
                SELECT c.*, COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL
                GROUP BY c.id
                ORDER BY c.name
            `;

            const result = await this.db.query(query);
            return result.rows;

        } catch (error) {
            console.error('Erreur lors de la récupération des catégories:', error);
            throw error;
        }
    }

    /**
     * Obtenir les produits populaires
     */
    async getPopularProducts(limit = 10) {
        try {
            const query = `
                SELECT p.*, c.name as category_name,
                       u.username as vendor_username, u.full_name as vendor_name,
                       COALESCE(AVG(r.rating), 0) as average_rating,
                       COUNT(r.id) as review_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.vendor_id = u.id
                LEFT JOIN reviews r ON p.id = r.product_id AND r.is_public = true
                WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.inventory_quantity > 0
                GROUP BY p.id, c.name, u.username, u.full_name
                ORDER BY p.sales_count DESC, p.view_count DESC
                LIMIT $1
            `;

            const result = await this.db.query(query, [limit]);

            return result.rows.map(product => {
                if (product.tags) {
                    product.tags = JSON.parse(product.tags);
                } else {
                    product.tags = [];
                }

                if (product.attributes) {
                    product.attributes = JSON.parse(product.attributes);
                } else {
                    product.attributes = {};
                }

                return product;
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des produits populaires:', error);
            throw error;
        }
    }

    /**
     * Obtenir les produits en vedette
     */
    async getFeaturedProducts(limit = 10) {
        try {
            const query = `
                SELECT p.*, c.name as category_name,
                       u.username as vendor_username, u.full_name as vendor_name,
                       COALESCE(AVG(r.rating), 0) as average_rating,
                       COUNT(r.id) as review_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.vendor_id = u.id
                LEFT JOIN reviews r ON p.id = r.product_id AND r.is_public = true
                WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.featured = true
                GROUP BY p.id, c.name, u.username, u.full_name
                ORDER BY p.created_at DESC
                LIMIT $1
            `;

            const result = await this.db.query(query, [limit]);

            return result.rows.map(product => {
                if (product.tags) {
                    product.tags = JSON.parse(product.tags);
                } else {
                    product.tags = [];
                }

                if (product.attributes) {
                    product.attributes = JSON.parse(product.attributes);
                } else {
                    product.attributes = {};
                }

                return product;
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des produits en vedette:', error);
            throw error;
        }
    }

    /**
     * Obtenir les produits similaires
     */
    async getSimilarProducts(productId, limit = 5) {
        try {
            // D'abord obtenir le produit de référence
            const referenceProduct = await this.findById(productId);
            if (!referenceProduct) {
                return [];
            }

            const query = `
                SELECT p.*, c.name as category_name,
                       u.username as vendor_username, u.full_name as vendor_name,
                       COALESCE(AVG(r.rating), 0) as average_rating,
                       COUNT(r.id) as review_count,
                       ABS(p.price - $2) as price_diff
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.vendor_id = u.id
                LEFT JOIN reviews r ON p.id = r.product_id AND r.is_public = true
                WHERE p.deleted_at IS NULL 
                AND p.status = 'active' 
                AND p.inventory_quantity > 0
                AND p.id != $1
                AND (
                    p.category_id = $3 OR
                    p.vendor_id = $4 OR
                    ABS(p.price - $2) < ($2 * 0.3)
                )
                GROUP BY p.id, c.name, u.username, u.full_name
                ORDER BY 
                    CASE WHEN p.category_id = $3 THEN 0 ELSE 1 END,
                    price_diff ASC,
                    p.sales_count DESC
                LIMIT $5
            `;

            const result = await this.db.query(query, [
                productId,
                referenceProduct.price,
                referenceProduct.category_id,
                referenceProduct.vendor_id,
                limit
            ]);

            return result.rows.map(product => {
                if (product.tags) {
                    product.tags = JSON.parse(product.tags);
                } else {
                    product.tags = [];
                }

                if (product.attributes) {
                    product.attributes = JSON.parse(product.attributes);
                } else {
                    product.attributes = {};
                }

                return product;
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des produits similaires:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques des produits d'un vendeur
     */
    async getVendorProductStats(vendorId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_products,
                    COUNT(CASE WHEN inventory_quantity > 0 THEN 1 END) as in_stock_products,
                    COUNT(CASE WHEN featured = true THEN 1 END) as featured_products,
                    COALESCE(SUM(sales_count), 0) as total_sales,
                    COALESCE(SUM(view_count), 0) as total_views,
                    COALESCE(AVG(price), 0) as average_price,
                    COALESCE(MIN(price), 0) as min_price,
                    COALESCE(MAX(price), 0) as max_price
                FROM products
                WHERE vendor_id = $1 AND deleted_at IS NULL
            `;

            const result = await this.db.query(query, [vendorId]);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques produits vendeur:', error);
            throw error;
        }
    }
}

module.exports = Product;
