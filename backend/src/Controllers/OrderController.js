const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Commission = require('../../utils/Commission');
const MonerooService = require('../../services/MonerooService');
const { validateOrder, validateOrderUpdate } = require('../../utils/Validators');

/**
 * Contrôleur pour la gestion des commandes
 */
class OrderController {
    constructor(db) {
        this.db = db;
        this.order = new Order(db);
        this.product = new Product(db);
        this.user = new User(db);
        this.commission = new Commission();
        this.monerooService = new MonerooService();
    }

    /**
     * Créer une nouvelle commande
     */
    async create(user, orderData) {
        try {
            // Valider les données
            const validation = validateOrder(orderData);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    message: 'Données invalides',
                    errors: validation.errors
                };
            }

            // Vérifier que le client est le bon utilisateur
            if (orderData.customer_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Vérifier les produits et calculer les totaux
            const items = orderData.items || [];
            let subtotal = 0;
            let totalWeight = 0;

            for (const item of items) {
                // Vérifier le produit
                const product = await this.product.findById(item.product_id);
                if (!product) {
                    return {
                        success: false,
                        status: 404,
                        message: `Produit ${item.product_id} non trouvé`
                    };
                }

                if (product.status !== 'active') {
                    return {
                        success: false,
                        status: 400,
                        message: `Produit ${item.product_id} n'est pas disponible`
                    };
                }

                // Vérifier le stock
                if (product.inventory_quantity < item.quantity) {
                    return {
                        success: false,
                        status: 400,
                        message: `Stock insuffisant pour le produit ${item.product_id}`
                    };
                }

                // Calculer le prix (utiliser le prix actuel du produit)
                const itemPrice = product.price;
                const itemTotal = itemPrice * item.quantity;
                subtotal += itemTotal;
                totalWeight += (product.weight || 0) * item.quantity;

                // Ajouter les informations du produit à l'item
                item.unit_price = itemPrice;
                item.total_price = itemTotal;
                item.product_snapshot = {
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url
                };
            }

            // Calculer les frais de livraison
            const shippingAmount = this.calculateShipping(totalWeight, orderData.shipping_address);
            
            // Calculer la taxe (19.25% au Cameroun)
            const taxRate = 0.1925;
            const taxAmount = Math.round(subtotal * taxRate);
            
            // Calculer le total
            const totalAmount = subtotal + taxAmount + shippingAmount;

            // Générer le numéro de commande
            const orderNumber = this.generateOrderNumber();

            // Calculer la commission
            const vendor = await this.user.findById(orderData.vendor_id);
            const commissionRate = vendor ? vendor.commission_rate : 450; // 4.5% par défaut
            const commissionAmount = Math.round(totalAmount * (commissionRate / 10000));

            // Créer la commande
            const order = await this.order.create({
                order_number: orderNumber,
                customer_id: orderData.customer_id,
                vendor_id: orderData.vendor_id,
                status: 'pending',
                currency: orderData.currency || 'XAF',
                subtotal,
                tax_amount: taxAmount,
                shipping_amount: shippingAmount,
                total_amount: totalAmount,
                commission_amount: commissionAmount,
                payment_status: 'pending',
                payment_method: orderData.payment_method || 'mobile_money',
                shipping_address: JSON.stringify(orderData.shipping_address),
                billing_address: JSON.stringify(orderData.billing_address || orderData.shipping_address),
                notes: orderData.notes || '',
                created_at: new Date(),
                updated_at: new Date()
            });

            // Créer les items de commande
            for (const item of items) {
                await this.order.createOrderItem({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    product_snapshot: JSON.stringify(item.product_snapshot),
                    created_at: new Date()
                });

                // Mettre à jour le stock
                await this.order.updateProductStock(item.product_id, -item.quantity);
            }

            // Mettre à jour les totaux du vendeur
            await this.order.updateVendorTotals(orderData.vendor_id, totalAmount);

            // Retourner la commande créée
            const createdOrder = await this.order.findByIdWithDetails(order.id);

            return {
                success: true,
                status: 201,
                message: 'Commande créée avec succès',
                data: {
                    order: createdOrder
                }
            };

        } catch (error) {
            console.error('Erreur lors de la création de la commande:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la création de la commande',
                error: error.message
            };
        }
    }

    /**
     * Obtenir une commande par ID
     */
    async getOrder(orderId, user) {
        try {
            const order = await this.order.findByIdWithDetails(orderId);
            
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    message: 'Commande non trouvée'
                };
            }

            // Vérifier les permissions
            if (order.customer_id !== user.user_id && 
                order.vendor_id !== user.user_id && 
                user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            return {
                success: true,
                status: 200,
                data: {
                    order: order
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération de la commande:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération de la commande',
                error: error.message
            };
        }
    }

    /**
     * Mettre à jour une commande
     */
    async updateOrder(orderId, user, updateData) {
        try {
            // Valider les données
            const validation = validateOrderUpdate(updateData);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 400,
                    message: 'Données invalides',
                    errors: validation.errors
                };
            }

            // Obtenir la commande existante
            const existingOrder = await this.order.findById(orderId);
            if (!existingOrder) {
                return {
                    success: false,
                    status: 404,
                    message: 'Commande non trouvée'
                };
            }

            // Vérifier les permissions
            if (existingOrder.vendor_id !== user.user_id && user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Mettre à jour la commande
            const updatedOrder = await this.order.update(orderId, {
                ...updateData,
                updated_at: new Date()
            });

            return {
                success: true,
                status: 200,
                message: 'Commande mise à jour avec succès',
                data: {
                    order: updatedOrder
                }
            };

        } catch (error) {
            console.error('Erreur lors de la mise à jour de la commande:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la mise à jour de la commande',
                error: error.message
            };
        }
    }

    /**
     * Annuler une commande
     */
    async cancelOrder(orderId, user, reason) {
        try {
            const order = await this.order.findById(orderId);
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    message: 'Commande non trouvée'
                };
            }

            // Vérifier les permissions
            if (order.customer_id !== user.user_id && 
                order.vendor_id !== user.user_id && 
                user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Vérifier que la commande peut être annulée
            if (['delivered', 'cancelled'].includes(order.status)) {
                return {
                    success: false,
                    status: 400,
                    message: 'Cette commande ne peut plus être annulée'
                };
            }

            // Mettre à jour le statut
            await this.order.update(orderId, {
                status: 'cancelled',
                cancellation_reason: reason,
                cancelled_at: new Date(),
                updated_at: new Date()
            });

            // Remettre les produits en stock
            const items = await this.order.getOrderItems(orderId);
            for (const item of items) {
                await this.order.updateProductStock(item.product_id, item.quantity);
            }

            // Si paiement déjà effectué, initier le remboursement
            if (order.payment_status === 'paid') {
                try {
                    await this.monerooService.refundPayment(order.payment_id, {
                        amount: order.total_amount,
                        reason: reason
                    });
                } catch (refundError) {
                    console.error('Erreur lors du remboursement:', refundError);
                    // Continuer même si le remboursement échoue
                }
            }

            return {
                success: true,
                status: 200,
                message: 'Commande annulée avec succès',
                data: {
                    order: await this.order.findByIdWithDetails(orderId)
                }
            };

        } catch (error) {
            console.error('Erreur lors de l\'annulation de la commande:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de l\'annulation de la commande',
                error: error.message
            };
        }
    }

    /**
     * Obtenir les commandes d'un utilisateur
     */
    async getUserOrders(user, filters = {}, page = 1, perPage = 20) {
        try {
            let orderFilters = {};

            if (user.role === 'customer') {
                orderFilters.customer_id = user.user_id;
            } else if (user.role === 'vendor') {
                orderFilters.vendor_id = user.user_id;
            }

            // Appliquer les filtres additionnels
            Object.assign(orderFilters, filters);

            const limit = perPage;
            const offset = (page - 1) * perPage;

            const orders = await this.order.getOrdersWithDetails(orderFilters, limit, offset);
            const total = await this.order.count(orderFilters);

            return {
                success: true,
                status: 200,
                data: {
                    orders: orders,
                    pagination: {
                        page: page,
                        per_page: perPage,
                        total: total,
                        pages: Math.ceil(total / perPage)
                    }
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des commandes:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des commandes',
                error: error.message
            };
        }
    }

    /**
     * Mettre à jour le statut de paiement
     */
    async updatePaymentStatus(orderId, paymentStatus, paymentId = null) {
        try {
            const order = await this.order.findById(orderId);
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    message: 'Commande non trouvée'
                };
            }

            await this.order.update(orderId, {
                payment_status: paymentStatus,
                payment_id: paymentId || order.payment_id,
                updated_at: new Date()
            });

            // Si paiement confirmé, mettre à jour le statut de la commande
            if (paymentStatus === 'paid' && order.status === 'pending') {
                await this.order.update(orderId, {
                    status: 'confirmed',
                    confirmed_at: new Date(),
                    updated_at: new Date()
                });
            }

            return {
                success: true,
                status: 200,
                message: 'Statut de paiement mis à jour',
                data: {
                    order: await this.order.findByIdWithDetails(orderId)
                }
            };

        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut de paiement:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la mise à jour du statut de paiement',
                error: error.message
            };
        }
    }

    /**
     * Initialiser le paiement d'une commande
     */
    async initiatePayment(orderId, user, paymentData) {
        try {
            const order = await this.order.findById(orderId);
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    message: 'Commande non trouvée'
                };
            }

            // Vérifier les permissions
            if (order.customer_id !== user.user_id) {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Vérifier que la commande n'est pas déjà payée
            if (order.payment_status === 'paid') {
                return {
                    success: false,
                    status: 400,
                    message: 'Cette commande est déjà payée'
                };
            }

            // Initialiser le paiement avec Moneroo
            const paymentResult = await this.monerooService.initializePayment({
                amount: order.total_amount,
                currency: order.currency,
                customer: {
                    email: user.email,
                    name: user.full_name,
                    phone: user.phone
                },
                metadata: {
                    order_id: order.id,
                    order_number: order.order_number,
                    customer_id: user.user_id
                },
                redirect_url: paymentData.redirect_url,
                webhook_url: `${process.env.BACKEND_URL}/webhooks/moneroo`,
                custom_data: {
                    order_id: order.id
                }
            });

            if (paymentResult.success) {
                // Mettre à jour la commande avec l'ID de paiement
                await this.updatePaymentStatus(orderId, 'pending', paymentResult.data.payment_id);

                return {
                    success: true,
                    status: 200,
                    message: 'Paiement initialisé',
                    data: {
                        payment: paymentResult.data,
                        order: order
                    }
                };
            } else {
                return {
                    success: false,
                    status: 400,
                    message: 'Erreur lors de l\'initialisation du paiement',
                    error: paymentResult.error
                };
            }

        } catch (error) {
            console.error('Erreur lors de l\'initialisation du paiement:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de l\'initialisation du paiement',
                error: error.message
            };
        }
    }

    /**
     * Ajouter un avis à une commande
     */
    async addReview(orderId, user, reviewData) {
        try {
            const order = await this.order.findById(orderId);
            if (!order) {
                return {
                    success: false,
                    status: 404,
                    message: 'Commande non trouvée'
                };
            }

            // Vérifier que l'utilisateur est le client
            if (order.customer_id !== user.user_id) {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            // Vérifier que la commande est livrée
            if (order.status !== 'delivered') {
                return {
                    success: false,
                    status: 400,
                    message: 'Un avis ne peut être ajouté qu\'aux commandes livrées'
                };
            }

            // Vérifier qu'un avis n'existe pas déjà
            const existingReview = await this.order.getOrderReview(orderId);
            if (existingReview) {
                return {
                    success: false,
                    status: 400,
                    message: 'Un avis existe déjà pour cette commande'
                };
            }

            // Créer l'avis
            const review = await this.order.createReview({
                product_id: reviewData.product_id,
                order_id: orderId,
                customer_id: user.user_id,
                rating: reviewData.rating,
                title: reviewData.title,
                content: reviewData.content,
                is_verified: true,
                is_public: reviewData.is_public !== false,
                created_at: new Date(),
                updated_at: new Date()
            });

            return {
                success: true,
                status: 201,
                message: 'Avis ajouté avec succès',
                data: {
                    review: review
                }
            };

        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'avis:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de l\'ajout de l\'avis',
                error: error.message
            };
        }
    }

    /**
     * Obtenir les statistiques des commandes (admin/vendeur)
     */
    async getOrderStats(user, filters = {}) {
        try {
            let vendorId = null;

            if (user.role === 'vendor') {
                vendorId = user.user_id;
            } else if (user.role !== 'admin') {
                return {
                    success: false,
                    status: 403,
                    message: 'Accès non autorisé'
                };
            }

            const stats = await this.order.getVendorStats(vendorId, filters);

            return {
                success: true,
                status: 200,
                data: {
                    stats: stats
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des statistiques',
                error: error.message
            };
        }
    }

    /**
     * Calculer les frais de livraison
     */
    calculateShipping(weight, address) {
        // Logique de calcul des frais de livraison
        let baseRate = 1000; // 1000 FCFA de base
        
        // Surcharge en fonction du poids
        if (weight > 1000) { // Plus de 1kg
            baseRate += Math.ceil((weight - 1000) / 500) * 200; // 200 FCFA par 500g supplémentaire
        }

        // Surcharge en fonction de la distance (simulation)
        if (address && address.city) {
            const majorCities = ['Douala', 'Yaoundé', 'Bafoussam'];
            if (!majorCities.includes(address.city)) {
                baseRate += 500; // 500 FCFA supplémentaire pour les autres villes
            }
        }

        return baseRate;
    }

    /**
     * Générer un numéro de commande unique
     */
    generateOrderNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        return `ORD-${year}${month}${day}-${random}`;
    }
}

module.exports = OrderController;
