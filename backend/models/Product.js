const { config, getDatabaseConfig } = require('../config/platforms');

class Product {
    constructor(db) {
        this.db = db;
    }

    /**
     * Créer un nouveau produit
     */
    async create(productData) {
        const query = `
            INSERT INTO products (
                vendor_id, name, description, price, compare_price, sku, barcode,
                track_inventory, inventory_quantity, inventory_policy, weight,
                requires_shipping, taxable, status, featured, category_id, tags,
                seo_title, seo_description, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *
        `;
        
        const values = [
            productData.vendor_id,
            productData.name,
            productData.description,
            productData.price,
            productData.compare_price,
            productData.sku,
            productData.barcode,
            productData.track_inventory,
            productData.inventory_quantity,
            productData.inventory_policy,
            productData.weight,
            productData.requires_shipping,
            productData.taxable,
            productData.status,
            productData.featured,
            productData.category_id,
            productData.tags,
            productData.seo_title,
            productData.seo_description,
            productData.created_at,
            productData.updated_at
        ];
        
        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Create product error:', error);
            throw error;
        }
    }

    /**
     * Trouver un produit par ID
     */
    async findById(id) {
        const query = 'SELECT * FROM products WHERE id = $1';
        
        try {
            const result = await this.db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find product by ID error:', error);
            throw error;
        }
    }

    /**
     * Trouver un produit par ID avec détails
     */
    async findByIdWithDetails(id) {
        const query = `
            SELECT 
                p.*,
                u.username as vendor_name,
                u.full_name as vendor_full_name,
                c.name as category_name,
                c.slug as category_slug,
                (SELECT url FROM product_images WHERE product_id = p.id AND is_main = true LIMIT 1) as main_image_url,
                (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as average_rating,
                (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
            FROM products p
            LEFT JOIN users u ON p.vendor_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1
        `;
        
        try {
            const result = await this.db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Find product with details error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour un produit
     */
    async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Construire dynamiquement la requête
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(updateData[key]);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        // Ajouter updated_at
        fields.push(`updated_at = $${paramIndex}`);
        values.push(new Date());
        paramIndex++;

        // Ajouter l'ID
        values.push(id);

        const query = `
            UPDATE products 
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Update product error:', error);
            throw error;
        }
    }

    /**
     * Supprimer un produit
     */
    async delete(id) {
        const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
        
        try {
            const result = await this.db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Delete product error:', error);
            throw error;
        }
    }

    /**
     * Rechercher des produits
     */
    async search(filters = {}, limit = 20, offset = 0) {
        let query = `
            SELECT 
                p.*,
                u.username as vendor_name,
                (SELECT url FROM product_images WHERE product_id = p.id AND is_main = true LIMIT 1) as main_image_url,
                (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as average_rating,
                (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
            FROM products p
            LEFT JOIN users u ON p.vendor_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        // Appliquer les filtres
        if (filters.status) {
            query += ` AND p.status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.vendor_id) {
            query += ` AND p.vendor_id = $${paramIndex}`;
            values.push(filters.vendor_id);
            paramIndex++;
        }

        if (filters.category_id) {
            query += ` AND p.category_id = $${paramIndex}`;
            values.push(filters.category_id);
            paramIndex++;
        }

        if (filters.search) {
            query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.min_price) {
            query += ` AND p.price >= $${paramIndex}`;
            values.push(filters.min_price);
            paramIndex++;
        }

        if (filters.max_price) {
            query += ` AND p.price <= $${paramIndex}`;
            values.push(filters.max_price);
            paramIndex++;
        }

        if (filters.featured !== undefined) {
            query += ` AND p.featured = $${paramIndex}`;
            values.push(filters.featured);
            paramIndex++;
        }

        if (filters.tags && filters.tags.length > 0) {
            query += ` AND p.tags && $${paramIndex}`;
            values.push(filters.tags);
            paramIndex++;
        }

        // Ordre
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        query += ` ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;

        // Pagination
        query += ` LIMIT $${paramIndex}`;
        values.push(limit);
        paramIndex++;

        query += ` OFFSET $${paramIndex}`;
        values.push(offset);

        try {
            const result = await this.db.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Search products error:', error);
            throw error;
        }
    }

    /**
     * Compter les produits
     */
    async count(filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        // Appliquer les mêmes filtres que search()
        if (filters.status) {
            query += ` AND status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.vendor_id) {
            query += ` AND vendor_id = $${paramIndex}`;
            values.push(filters.vendor_id);
            paramIndex++;
        }

        if (filters.category_id) {
            query += ` AND category_id = $${paramIndex}`;
            values.push(filters.category_id);
            paramIndex++;
        }

        if (filters.search) {
            query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.min_price) {
            query += ` AND price >= $${paramIndex}`;
            values.push(filters.min_price);
            paramIndex++;
        }

        if (filters.max_price) {
            query += ` AND price <= $${paramIndex}`;
            values.push(filters.max_price);
            paramIndex++;
        }

        if (filters.featured !== undefined) {
            query += ` AND featured = $${paramIndex}`;
            values.push(filters.featured);
            paramIndex++;
        }

        try {
            const result = await this.db.query(query, values);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Count products error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le stock
     */
    async updateStock(productId, newQuantity) {
        const query = `
            UPDATE products 
            SET inventory_quantity = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, inventory_quantity, updated_at
        `;
        
        try {
            const result = await this.db.query(query, [newQuantity, new Date(), productId]);
            return result.rows[0];
        } catch (error) {
            console.error('Update stock error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les produits avec stock faible
     */
    async getLowStock(vendorId, threshold = 5) {
        const query = `
            SELECT 
                p.*,
                (SELECT url FROM product_images WHERE product_id = p.id AND is_main = true LIMIT 1) as main_image_url
            FROM products p
            WHERE p.vendor_id = $1 
            AND p.track_inventory = true 
            AND p.inventory_quantity <= $2
            AND p.status = 'active'
            ORDER BY p.inventory_quantity ASC
        `;
        
        try {
            const result = await this.db.query(query, [vendorId, threshold]);
            return result.rows;
        } catch (error) {
            console.error('Get low stock products error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les catégories
     */
    async getCategories() {
        const query = `
            SELECT 
                c.*,
                COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
            WHERE c.is_active = true
            GROUP BY c.id, c.name, c.slug, c.description, c.image_url, c.parent_id, c.position, c.is_active, c.created_at, c.updated_at
            ORDER BY c.position ASC, c.name ASC
        `;
        
        try {
            const result = await this.db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Get categories error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les produits populaires
     */
    async getPopularProducts(limit = 10) {
        const query = `
            SELECT 
                p.*,
                u.username as vendor_name,
                (SELECT url FROM product_images WHERE product_id = p.id AND is_main = true LIMIT 1) as main_image_url,
                (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as average_rating,
                (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
                COUNT(oi.id) as order_count
            FROM products p
            LEFT JOIN users u ON p.vendor_id = u.id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
            WHERE p.status = 'active' AND p.featured = true
            GROUP BY p.id, u.username
            ORDER BY order_count DESC, average_rating DESC
            LIMIT $1
        `;
        
        try {
            const result = await this.db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Get popular products error:', error);
            throw error;
        }
    }

    /**
     * Sauvegarder une image de produit
     */
    async saveProductImage(imageData) {
        const query = `
            INSERT INTO product_images (
                product_id, url, alt_text, position, is_main, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const values = [
            imageData.product_id,
            imageData.url,
            imageData.alt_text,
            imageData.position,
            imageData.is_main,
            new Date()
        ];
        
        try {
            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Save product image error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les images d'un produit
     */
    async getProductImages(productId) {
        const query = `
            SELECT * FROM product_images 
            WHERE product_id = $1 
            ORDER BY position ASC, is_main DESC, created_at ASC
        `;
        
        try {
            const result = await this.db.query(query, [productId]);
            return result.rows;
        } catch (error) {
            console.error('Get product images error:', error);
            throw error;
        }
    }

    /**
     * Supprimer une image de produit
     */
    async deleteProductImage(productId, imageUrl) {
        const query = 'DELETE FROM product_images WHERE product_id = $1 AND url = $2 RETURNING *';
        
        try {
            const result = await this.db.query(query, [productId, imageUrl]);
            return result.rows[0];
        } catch (error) {
            console.error('Delete product image error:', error);
            throw error;
        }
    }

    /**
     * Vérifier si un SKU existe déjà
     */
    async skuExists(sku, excludeId = null) {
        let query = 'SELECT id FROM products WHERE sku = $1';
        const values = [sku];
        
        if (excludeId) {
            query += ' AND id != $2';
            values.push(excludeId);
        }
        
        try {
            const result = await this.db.query(query, values);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Check SKU exists error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques des produits d'un vendeur
     */
    async getVendorProductStats(vendorId) {
        const query = `
            SELECT 
                COUNT(*) as total_products,
                COUNT(*) FILTER (WHERE status = 'active') as active_products,
                COUNT(*) FILTER (WHERE status = 'draft') as draft_products,
                COUNT(*) FILTER (WHERE featured = true) as featured_products,
                COALESCE(SUM(inventory_quantity), 0) as total_inventory,
                COALESCE(AVG(price), 0) as average_price,
                COALESCE(MIN(price), 0) as min_price,
                COALESCE(MAX(price), 0) as max_price
            FROM products
            WHERE vendor_id = $1
        `;
        
        try {
            const result = await this.db.query(query, [vendorId]);
            return result.rows[0];
        } catch (error) {
            console.error('Get vendor product stats error:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le statut de plusieurs produits
     */
    async updateMultipleStatus(productIds, status) {
        const query = `
            UPDATE products 
            SET status = $1, updated_at = $2
            WHERE id = ANY($3)
            RETURNING id, status, updated_at
        `;
        
        try {
            const result = await this.db.query(query, [status, new Date(), productIds]);
            return result.rows;
        } catch (error) {
            console.error('Update multiple status error:', error);
            throw error;
        }
    }

    /**
     * Dupliquer un produit
     */
    async duplicate(productId, newVendorId = null) {
        try {
            // Récupérer le produit original
            const originalProduct = await this.findById(productId);
            if (!originalProduct) {
                throw new Error('Produit original non trouvé');
            }

            // Créer la copie
            const duplicatedProduct = {
                ...originalProduct,
                id: undefined,
                vendor_id: newVendorId || originalProduct.vendor_id,
                name: `${originalProduct.name} (Copie)`,
                sku: `${originalProduct.sku}-COPY`,
                status: 'draft',
                created_at: new Date(),
                updated_at: new Date()
            };

            delete duplicatedProduct.id;
            
            const newProduct = await this.create(duplicatedProduct);

            // Copier les images
            const images = await this.getProductImages(productId);
            for (const image of images) {
                await this.saveProductImage({
                    product_id: newProduct.id,
                    url: image.url,
                    alt_text: image.alt_text,
                    position: image.position,
                    is_main: image.is_main
                });
            }

            return newProduct;

        } catch (error) {
            console.error('Duplicate product error:', error);
            throw error;
        }
    }
}

module.exports = Product;
