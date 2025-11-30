const { config, isProduction } = require('../config/platforms');
const Order = require('../models/Order');
const MonerooService = require('../services/MonerooService');
const Commission = require('../utils/Commission');

class OrderController {
    constructor(db) {
        this.db = db;
        this.orderModel = new Order(db);
        this.monerooService = new MonerooService();
        this.commission = new Commission();
    }

    /**
     * Créer une nouvelle commande
     */
    async create(userData, orderData) {
        try {
            // Validation des données
            const validation = this.validateOrderData(orderData);
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

            // Vérifier les produits et calculer les totaux
            const orderTotals = await this.calculateOrderTotals(orderData.items);
            if (!orderTotals.valid) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: orderTotals.message,
                        code: 'INVALID_PRODUCTS'
                    },
                    timestamp: Date.now()
                };
            }

            // Générer un numéro de commande unique
            const orderNumber = await this.generateOrderNumber();

            // Calculer la commission
            const commissionAmount = await this.commission.calculateCommission(
                orderTotals.subtotal,
                orderData.vendor_id
            );

            // Préparer les données de la commande
            const completeOrderData = {
                order_number: orderNumber,
                customer_id: userData.user_id,
                vendor_id: orderData.vendor_id,
                status: 'pending',
                currency: orderData.currency || 'XAF',
                subtotal: orderTotals.subtotal,
                tax_amount: orderTotals.taxAmount,
                shipping_amount: orderTotals.shippingAmount,
                total_amount: orderTotals.totalAmount,
                commission_amount: commissionAmount,
                payment_status: 'pending',
                shipping_address: orderData.shipping_address,
                billing_address: orderData.billing_address || orderData.shipping_address,
                notes: orderData.notes || null,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Créer la commande
            const order = await this.orderModel.create(completeOrderData);

            // Créer les lignes de commande
            for (const item of orderData.items) {
                await this.orderModel.createOrderItem({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    product_snapshot: item.product_snapshot
                });

                // Mettre à jour le stock
                await this.orderModel.updateProductStock(item.product_id, -item.quantity);
            }

            // Si paiement immédiat, initialiser le paiement Moneroo
            if (orderData.payment_method === 'moneroo') {
                const paymentData = {
                    amount: order.total_amount,
                    currency: order.currency,
                    customer_email: userData.email,
                    customer_name: userData.full_name || userData.username,
                    customer_phone: userData.phone,
                    order_id: order.id,
                    user_id: userData.user_id,
                    product_ids: orderData.items.map(item => item.product_id),
                    redirect_url: orderData.redirect_url || `${config.frontend.url}/orders/${order.id}`,
                    webhook_url: `${config.backend.url}/api/webhooks/moneroo`,
                    cancel_url: orderData.cancel_url || `${config.frontend.url}/cart`
                };

                const paymentResult = await this.monerooService.initializePayment(paymentData);
                
                if (paymentResult.success) {
                    // Mettre à jour la commande avec les infos de paiement
                    await this.orderModel.update(order.id, {
                        payment_id: paymentResult.data.payment_id,
                        payment_method: 'moneroo'
                    });

                    return {
                        success: true,
                        status: 201,
                        data: {
                            order: order,
                            payment: paymentResult.data,
                            message: 'Commande créée et paiement initialisé'
                        },
                        timestamp: Date.now()
                    };
                } else {
                    throw new Error('Échec de l\'initialisation du paiement');
                }
            }

            return {
                success: true,
                status: 201,
                data: {
                    order: order,
                    message: 'Commande créée avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Create order error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'CREATE_ORDER_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir une commande par ID
     */
    async getOrder(userData, orderId) {
        try {
            const order = await this.orderModel.findByIdWithDetails(orderId);
            
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Commande non trouvée',
                        code: 'ORDER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier les permissions
            if (order.customer_id !== userData.user_id && 
                order.vendor_id !== userData.user_id && 
                userData.role !== 'admin') {
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

            return {
                success: true,
                status: 200,
                data: {
                    order: order
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get order error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_ORDER_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les commandes du client
     */
    async getCustomerOrders(userData, page = 1, perPage = 20) {
        try {
            const filters = {
                customer_id: userData.user_id
            };

            const offset = (page - 1) * perPage;
            
            const orders = await this.orderModel.getOrdersWithDetails(filters, perPage, offset);
            const total = await this.orderModel.count(filters);

            return {
                success: true,
                status: 200,
                data: {
                    orders: orders,
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
            console.error('Get customer orders error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_CUSTOMER_ORDERS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les commandes du vendeur
     */
    async getVendorOrders(userData, page = 1, perPage = 20) {
        try {
            const filters = {
                vendor_id: userData.user_id
            };

            const offset = (page - 1) * perPage;
            
            const orders = await this.orderModel.getOrdersWithDetails(filters, perPage, offset);
            const total = await this.orderModel.count(filters);

            return {
                success: true,
                status: 200,
                data: {
                    orders: orders,
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
            console.error('Get vendor orders error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_VENDOR_ORDERS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Mettre à jour le statut d'une commande
     */
    async updateStatus(userData, orderId, statusData) {
        try {
            const order = await this.orderModel.findById(orderId);
            
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Commande non trouvée',
                        code: 'ORDER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier les permissions
            const canUpdate = (
                (order.vendor_id === userData.user_id && ['confirmed', 'processing', 'shipped'].includes(statusData.status)) ||
                (userData.role === 'admin') ||
                (order.customer_id === userData.user_id && statusData.status === 'cancelled')
            );

            if (!canUpdate) {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Accès non autorisé pour ce changement de statut',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            // Valider la transition de statut
            const validTransition = this.validateStatusTransition(order.status, statusData.status);
            if (!validTransition.valid) {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: validTransition.message,
                        code: 'INVALID_STATUS_TRANSITION'
                    },
                    timestamp: Date.now()
                };
            }

            // Mettre à jour le statut
            const updateFields = {
                status: statusData.status,
                updated_at: new Date()
            };

            // Ajouter les timestamps spécifiques
            if (statusData.status === 'shipped') {
                updateFields.shipped_at = new Date();
            } else if (statusData.status === 'delivered') {
                updateFields.delivered_at = new Date();
                updateFields.payment_status = 'paid';
            }

            const updatedOrder = await this.orderModel.update(orderId, updateFields);

            // Si la commande est livrée, mettre à jour les statistiques du vendeur
            if (statusData.status === 'delivered') {
                await this.updateVendorStats(order.vendor_id, order.total_amount);
            }

            return {
                success: true,
                status: 200,
                data: {
                    order: updatedOrder,
                    message: 'Statut mis à jour avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Update status error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'UPDATE_STATUS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Ajouter un avis à une commande
     */
    async addReview(userData, orderId, reviewData) {
        try {
            const order = await this.orderModel.findById(orderId);
            
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Commande non trouvée',
                        code: 'ORDER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            // Seul le client peut laisser un avis
            if (order.customer_id !== userData.user_id) {
                return {
                    success: false,
                    status: 403,
                    error: {
                        message: 'Seul le client peut laisser un avis',
                        code: 'UNAUTHORIZED'
                    },
                    timestamp: Date.now()
                };
            }

            // La commande doit être livrée
            if (order.status !== 'delivered') {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Un avis ne peut être ajouté qu\'aux commandes livrées',
                        code: 'ORDER_NOT_DELIVERED'
                    },
                    timestamp: Date.now()
                };
            }

            // Vérifier qu'un avis n'existe pas déjà
            const existingReview = await this.orderModel.getOrderReview(orderId);
            if (existingReview) {
                return {
                    success: false,
                    status: 409,
                    error: {
                        message: 'Un avis existe déjà pour cette commande',
                        code: 'REVIEW_EXISTS'
                    },
                    timestamp: Date.now()
                };
            }

            // Valider les données d'avis
            const validation = this.validateReviewData(reviewData);
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

            // Créer l'avis
            const review = await this.orderModel.createReview({
                order_id: orderId,
                product_id: reviewData.product_id,
                customer_id: userData.user_id,
                rating: reviewData.rating,
                title: reviewData.title,
                content: reviewData.content,
                created_at: new Date(),
                updated_at: new Date()
            });

            return {
                success: true,
                status: 201,
                data: {
                    review: review,
                    message: 'Avis ajouté avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Add review error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'ADD_REVIEW_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Rembourser une commande
     */
    async refundOrder(userData, orderId, refundData) {
        try {
            const order = await this.orderModel.findById(orderId);
            
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    error: {
                        message: 'Commande non trouvée',
                        code: 'ORDER_NOT_FOUND'
                    },
                    timestamp: Date.now()
                };
            }

            // Seul le vendeur ou admin peut rembourser
            if (order.vendor_id !== userData.user_id && userData.role !== 'admin') {
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

            // La commande doit être payée
            if (order.payment_status !== 'paid') {
                return {
                    success: false,
                    status: 400,
                    error: {
                        message: 'Seules les commandes payées peuvent être remboursées',
                        code: 'ORDER_NOT_PAID'
                    },
                    timestamp: Date.now()
                };
            }

            // Si paiement Moneroo, créer le remboursement
            if (order.payment_method === 'moneroo' && order.payment_id) {
                const refundResult = await this.monerooService.createRefund(order.payment_id, {
                    amount: refundData.amount || order.total_amount,
                    reason: refundData.reason || 'Customer request'
                });

                if (!refundResult.success) {
                    return {
                        success: false,
                        status: 500,
                        error: {
                            message: 'Échec du remboursement Moneroo',
                            details: refundResult.error
                        },
                        timestamp: Date.now()
                    };
                }
            }

            // Mettre à jour le statut de la commande
            await this.orderModel.update(orderId, {
                status: 'refunded',
                payment_status: 'refunded',
                updated_at: new Date()
            });

            // Restaurer le stock
            const orderItems = await this.orderModel.getOrderItems(orderId);
            for (const item of orderItems) {
                await this.orderModel.updateProductStock(item.product_id, item.quantity);
            }

            return {
                success: true,
                status: 200,
                data: {
                    message: 'Commande remboursée avec succès'
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Refund order error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'REFUND_ORDER_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les commandes récentes (admin seulement)
     */
    async getRecentOrders(userData, limit = 50) {
        try {
            if (userData.role !== 'admin') {
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

            const orders = await this.orderModel.getRecentOrders(limit);

            return {
                success: true,
                status: 200,
                data: {
                    orders: orders
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get recent orders error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_RECENT_ORDERS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    /**
     * Obtenir les statistiques du vendeur
     */
    async getVendorStats(userData) {
        try {
            const stats = await this.orderModel.getVendorStats(userData.user_id);

            return {
                success: true,
                status: 200,
                data: {
                    stats: stats
                },
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Get vendor stats error:', error);
            return {
                success: false,
                status: 500,
                error: {
                    message: isProduction() ? 'Erreur serveur' : error.message,
                    code: 'GET_VENDOR_STATS_ERROR'
                },
                timestamp: Date.now()
            };
        }
    }

    // ====================
    // 🔧 MÉTHODES PRIVÉES
    // ====================

    /**
     * Valider les données de commande
     */
    validateOrderData(data) {
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
            return {
                valid: false,
                message: 'Les articles de la commande sont requis'
            };
        }

        if (!data.vendor_id) {
            return {
                valid: false,
                message: 'Le vendeur est requis'
            };
        }

        if (!data.shipping_address) {
            return {
                valid: false,
                message: 'L\'adresse de livraison est requise'
            };
        }

        for (const item of data.items) {
            if (!item.product_id || !item.quantity || !item.unit_price) {
                return {
                    valid: false,
                    message: 'Chaque article doit avoir un produit_id, une quantité et un prix unitaire'
                };
            }

            if (item.quantity <= 0) {
                return {
                    valid: false,
                    message: 'La quantité doit être supérieure à 0'
                };
            }
        }

        return { valid: true };
    }

    /**
     * Calculer les totaux de la commande
     */
    async calculateOrderTotals(items) {
        let subtotal = 0;
        let totalWeight = 0;

        for (const item of items) {
            // Vérifier que le produit existe et est disponible
            const product = await this.orderModel.getProductById(item.product_id);
            if (!product || product.status !== 'active') {
                return {
                    valid: false,
                    message: `Le produit ${item.product_id} n'est pas disponible`
                };
            }

            // Vérifier le stock
            if (product.track_inventory && product.inventory_quantity < item.quantity) {
                return {
                    valid: false,
                    message: `Stock insuffisant pour le produit ${product.name}`
                };
            }

            // Calculer le prix total de l'article
            const itemTotal = item.unit_price * item.quantity;
            subtotal += itemTotal;

            // Calculer le poids total
            if (product.weight) {
                totalWeight += product.weight * item.quantity;
            }

            // Ajouter le snapshot du produit
            item.product_snapshot = {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.main_image_url
            };

            item.total_price = itemTotal;
        }

        // Calculer les frais de livraison (simple pour l'exemple)
        const shippingAmount = this.calculateShipping(totalWeight);

        // Calculer la taxe (10% pour l'exemple)
        const taxAmount = subtotal * 0.1;

        const totalAmount = subtotal + taxAmount + shippingAmount;

        return {
            valid: true,
            subtotal: subtotal,
            taxAmount: taxAmount,
            shippingAmount: shippingAmount,
            totalAmount: totalAmount
        };
    }

    /**
     * Calculer les frais de livraison
     */
    calculateShipping(weight) {
        // Frais de livraison simples
        if (weight <= 0.5) return 500; // 500 FCFA
        if (weight <= 2) return 1000;   // 1000 FCFA
        if (weight <= 5) return 2000;   // 2000 FCFA
        return 3000; // 3000 FCFA
    }

    /**
     * Générer un numéro de commande unique
     */
    async generateOrderNumber() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        return `TRF-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Valider la transition de statut
     */
    validateStatusTransition(currentStatus, newStatus) {
        const transitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['processing', 'cancelled'],
            'processing': ['shipped'],
            'shipped': ['delivered'],
            'delivered': [],
            'cancelled': [],
            'refunded': []
        };

        if (!transitions[currentStatus].includes(newStatus)) {
            return {
                valid: false,
                message: `Transition invalide de ${currentStatus} vers ${newStatus}`
            };
        }

        return { valid: true };
    }

    /**
     * Valider les données d'avis
     */
    validateReviewData(data) {
        if (!data.rating || data.rating < 1 || data.rating > 5) {
            return {
                valid: false,
                message: 'La note doit être entre 1 et 5'
            };
        }

        if (!data.product_id) {
            return {
                valid: false,
                message: 'Le produit est requis'
            };
        }

        return { valid: true };
    }

    /**
     * Mettre à jour les statistiques du vendeur
     */
    async updateVendorStats(vendorId, amount) {
        try {
            // Mettre à jour les totaux du vendeur
            await this.orderModel.updateVendorTotals(vendorId, amount);

            // Mettre à jour les statistiques quotidiennes
            await this.orderModel.updateVendorDailyStats(vendorId, amount);
        } catch (error) {
            console.error('Update vendor stats error:', error);
        }
    }
}

module.exports = OrderController;
