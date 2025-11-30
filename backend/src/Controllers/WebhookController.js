const crypto = require('crypto');
const MonerooService = require('../../services/MonerooService');
const Order = require('../../models/Order');
const User = require('../../models/User');
const GamificationService = require('../../services/GamificationService');

/**
 * Contrôleur pour la gestion des webhooks
 */
class WebhookController {
    constructor(db) {
        this.db = db;
        this.monerooService = new MonerooService();
        this.order = new Order(db);
        this.user = new User(db);
        this.gamificationService = new GamificationService(db);
    }

    /**
     * Traiter les webhooks Moneroo
     */
    async handleMonerooWebhook(req, res) {
        try {
            const signature = req.headers['x-moneroo-signature'];
            const payload = JSON.stringify(req.body);

            // Vérifier la signature
            if (!this.verifyWebhookSignature(payload, signature)) {
                console.error('Signature webhook invalide');
                return res.status(401).json({ error: 'Signature invalide' });
            }

            const event = req.body.event;
            const data = req.body.data;

            console.log(`🪝 Webhook Moneroo reçu: ${event}`, data);

            let result;

            switch (event) {
                case 'payment.completed':
                    result = await this.handlePaymentCompleted(data);
                    break;
                case 'payment.failed':
                    result = await this.handlePaymentFailed(data);
                    break;
                case 'payment.pending':
                    result = await this.handlePaymentPending(data);
                    break;
                case 'payment.cancelled':
                    result = await this.handlePaymentCancelled(data);
                    break;
                case 'refund.processed':
                    result = await this.handleRefundProcessed(data);
                    break;
                case 'dispute.created':
                    result = await this.handleDisputeCreated(data);
                    break;
                default:
                    console.warn(`Événement webhook non géré: ${event}`);
                    result = { success: true, message: 'Événement non géré' };
            }

            // Journaliser le webhook
            await this.logWebhook('moneroo', event, req.body, result);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Erreur lors du traitement du webhook Moneroo:', error);
            return res.status(500).json({ 
                error: 'Erreur interne du serveur',
                message: error.message 
            });
        }
    }

    /**
     * Traiter un paiement complété
     */
    async handlePaymentCompleted(data) {
        try {
            const { payment_id, metadata, amount, currency } = data;
            const orderId = metadata?.order_id;

            if (!orderId) {
                throw new Error('Order ID manquant dans les métadonnées');
            }

            // Obtenir la commande
            const order = await this.order.findById(orderId);
            if (!order) {
                throw new Error(`Commande ${orderId} non trouvée`);
            }

            // Vérifier que le paiement n'a pas déjà été traité
            if (order.payment_status === 'paid') {
                return { success: true, message: 'Paiement déjà traité' };
            }

            // Mettre à jour le statut de paiement
            await this.order.update(orderId, {
                payment_status: 'paid',
                payment_id: payment_id,
                paid_at: new Date(),
                status: 'confirmed',
                confirmed_at: new Date(),
                updated_at: new Date()
            });

            // Mettre à jour les statistiques du vendeur
            await this.order.updateVendorTotals(order.vendor_id, order.total_amount);

            // Mettre à jour les statistiques du client
            await this.user.updateSalesStats(order.customer_id, {
                total_orders: 1,
                total_spent: order.total_amount
            });

            // Débloquer les achievements de gamification
            await this.gamificationService.checkAndUnlockAchievements(order.customer_id);

            // Envoyer les notifications
            await this.sendPaymentNotifications(order, 'completed');

            console.log(`✅ Paiement ${payment_id} traité pour la commande ${orderId}`);

            return {
                success: true,
                message: 'Paiement complété traité avec succès',
                order_id: orderId
            };

        } catch (error) {
            console.error('Erreur lors du traitement du paiement complété:', error);
            throw error;
        }
    }

    /**
     * Traiter un paiement échoué
     */
    async handlePaymentFailed(data) {
        try {
            const { payment_id, metadata, error_code, error_message } = data;
            const orderId = metadata?.order_id;

            if (!orderId) {
                throw new Error('Order ID manquant dans les métadonnées');
            }

            // Obtenir la commande
            const order = await this.order.findById(orderId);
            if (!order) {
                throw new Error(`Commande ${orderId} non trouvée`);
            }

            // Mettre à jour le statut de paiement
            await this.order.update(orderId, {
                payment_status: 'failed',
                payment_id: payment_id,
                status: 'payment_failed',
                updated_at: new Date()
            });

            // Envoyer les notifications
            await this.sendPaymentNotifications(order, 'failed', { error_message });

            console.log(`❌ Paiement ${payment_id} échoué pour la commande ${orderId}`);

            return {
                success: true,
                message: 'Paiement échoué traité avec succès',
                order_id: orderId
            };

        } catch (error) {
            console.error('Erreur lors du traitement du paiement échoué:', error);
            throw error;
        }
    }

    /**
     * Traiter un paiement en attente
     */
    async handlePaymentPending(data) {
        try {
            const { payment_id, metadata } = data;
            const orderId = metadata?.order_id;

            if (!orderId) {
                throw new Error('Order ID manquant dans les métadonnées');
            }

            // Obtenir la commande
            const order = await this.order.findById(orderId);
            if (!order) {
                throw new Error(`Commande ${orderId} non trouvée`);
            }

            // Mettre à jour le statut de paiement
            await this.order.update(orderId, {
                payment_status: 'pending',
                payment_id: payment_id,
                updated_at: new Date()
            });

            console.log(`⏳ Paiement ${payment_id} en attente pour la commande ${orderId}`);

            return {
                success: true,
                message: 'Paiement en attente traité avec succès',
                order_id: orderId
            };

        } catch (error) {
            console.error('Erreur lors du traitement du paiement en attente:', error);
            throw error;
        }
    }

    /**
     * Traiter un paiement annulé
     */
    async handlePaymentCancelled(data) {
        try {
            const { payment_id, metadata } = data;
            const orderId = metadata?.order_id;

            if (!orderId) {
                throw new Error('Order ID manquant dans les métadonnées');
            }

            // Obtenir la commande
            const order = await this.order.findById(orderId);
            if (!order) {
                throw new Error(`Commande ${orderId} non trouvée`);
            }

            // Mettre à jour le statut de paiement
            await this.order.update(orderId, {
                payment_status: 'cancelled',
                payment_id: payment_id,
                status: 'cancelled',
                cancelled_at: new Date(),
                updated_at: new Date()
            });

            // Remettre les produits en stock
            const items = await this.order.getOrderItems(orderId);
            for (const item of items) {
                await this.order.updateProductStock(item.product_id, item.quantity);
            }

            // Envoyer les notifications
            await this.sendPaymentNotifications(order, 'cancelled');

            console.log(`🚫 Paiement ${payment_id} annulé pour la commande ${orderId}`);

            return {
                success: true,
                message: 'Paiement annulé traité avec succès',
                order_id: orderId
            };

        } catch (error) {
            console.error('Erreur lors du traitement du paiement annulé:', error);
            throw error;
        }
    }

    /**
     * Traiter un remboursement traité
     */
    async handleRefundProcessed(data) {
        try {
            const { refund_id, payment_id, amount, metadata } = data;
            const orderId = metadata?.order_id;

            if (!orderId) {
                throw new Error('Order ID manquant dans les métadonnées');
            }

            // Obtenir la commande
            const order = await this.order.findById(orderId);
            if (!order) {
                throw new Error(`Commande ${orderId} non trouvée`);
            }

            // Mettre à jour le statut de la commande
            await this.order.update(orderId, {
                status: 'refunded',
                refund_id: refund_id,
                refund_amount: amount,
                refunded_at: new Date(),
                updated_at: new Date()
            });

            // Envoyer les notifications
            await this.sendPaymentNotifications(order, 'refunded', { refund_amount: amount });

            console.log(`💰 Remboursement ${refund_id} traité pour la commande ${orderId}`);

            return {
                success: true,
                message: 'Remboursement traité avec succès',
                order_id: orderId
            };

        } catch (error) {
            console.error('Erreur lors du traitement du remboursement:', error);
            throw error;
        }
    }

    /**
     * Traiter une dispute créée
     */
    async handleDisputeCreated(data) {
        try {
            const { dispute_id, payment_id, reason, metadata } = data;
            const orderId = metadata?.order_id;

            if (!orderId) {
                throw new Error('Order ID manquant dans les métadonnées');
            }

            // Obtenir la commande
            const order = await this.order.findById(orderId);
            if (!order) {
                throw new Error(`Commande ${orderId} non trouvée`);
            }

            // Mettre à jour le statut de la commande
            await this.order.update(orderId, {
                status: 'disputed',
                dispute_id: dispute_id,
                dispute_reason: reason,
                disputed_at: new Date(),
                updated_at: new Date()
            });

            // Envoyer les notifications
            await this.sendPaymentNotifications(order, 'disputed', { reason });

            console.log(`⚠️ Dispute ${dispute_id} créée pour la commande ${orderId}`);

            return {
                success: true,
                message: 'Dispute traitée avec succès',
                order_id: orderId
            };

        } catch (error) {
            console.error('Erreur lors du traitement de la dispute:', error);
            throw error;
        }
    }

    /**
     * Traiter les webhooks Supabase (si nécessaire)
     */
    async handleSupabaseWebhook(req, res) {
        try {
            const { type, table, record, old_record } = req.body;

            console.log(`🪝 Webhook Supabase reçu: ${type} sur ${table}`);

            let result;

            switch (type) {
                case 'INSERT':
                    result = await this.handleSupabaseInsert(table, record);
                    break;
                case 'UPDATE':
                    result = await this.handleSupabaseUpdate(table, record, old_record);
                    break;
                case 'DELETE':
                    result = await this.handleSupabaseDelete(table, old_record);
                    break;
                default:
                    console.warn(`Type d'opération Supabase non géré: ${type}`);
                    result = { success: true, message: 'Opération non gérée' };
            }

            // Journaliser le webhook
            await this.logWebhook('supabase', type, req.body, result);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Erreur lors du traitement du webhook Supabase:', error);
            return res.status(500).json({ 
                error: 'Erreur interne du serveur',
                message: error.message 
            });
        }
    }

    /**
     * Traiter une insertion Supabase
     */
    async handleSupabaseInsert(table, record) {
        try {
            switch (table) {
                case 'users':
                    await this.handleNewUser(record);
                    break;
                case 'products':
                    await this.handleNewProduct(record);
                    break;
                case 'orders':
                    await this.handleNewOrder(record);
                    break;
                default:
                    console.log(`Insertion sur table ${table} non traitée spécifiquement`);
            }

            return { success: true, message: 'Insertion traitée' };

        } catch (error) {
            console.error('Erreur lors du traitement de l\'insertion Supabase:', error);
            throw error;
        }
    }

    /**
     * Traiter une mise à jour Supabase
     */
    async handleSupabaseUpdate(table, record, oldRecord) {
        try {
            switch (table) {
                case 'users':
                    await this.handleUserUpdate(record, oldRecord);
                    break;
                case 'products':
                    await this.handleProductUpdate(record, oldRecord);
                    break;
                case 'orders':
                    await this.handleOrderUpdate(record, oldRecord);
                    break;
                default:
                    console.log(`Mise à jour sur table ${table} non traitée spécifiquement`);
            }

            return { success: true, message: 'Mise à jour traitée' };

        } catch (error) {
            console.error('Erreur lors du traitement de la mise à jour Supabase:', error);
            throw error;
        }
    }

    /**
     * Traiter une suppression Supabase
     */
    async handleSupabaseDelete(table, record) {
        try {
            switch (table) {
                case 'users':
                    await this.handleUserDelete(record);
                    break;
                case 'products':
                    await this.handleProductDelete(record);
                    break;
                default:
                    console.log(`Suppression sur table ${table} non traitée spécifiquement`);
            }

            return { success: true, message: 'Suppression traitée' };

        } catch (error) {
            console.error('Erreur lors du traitement de la suppression Supabase:', error);
            throw error;
        }
    }

    /**
     * Traiter un nouvel utilisateur
     */
    async handleNewUser(user) {
        console.log(`👤 Nouvel utilisateur: ${user.email}`);
        // Envoyer un email de bienvenue
        // Initialiser la gamification
        await this.gamificationService.initializeUserGamification(user.id);
    }

    /**
     * Traiter une mise à jour d'utilisateur
     */
    async handleUserUpdate(newUser, oldUser) {
        if (newUser.rank !== oldUser.rank) {
            console.log(`🏆 Changement de rang pour ${newUser.username}: ${oldUser.rank} → ${newUser.rank}`);
            // Envoyer une notification de promotion
            await this.gamificationService.checkAndUnlockAchievements(newUser.id);
        }
    }

    /**
     * Traiter un nouveau produit
     */
    async handleNewProduct(product) {
        console.log(`📦 Nouveau produit: ${product.name}`);
        // Indexer pour la recherche
        // Notifier les abonnés du vendeur
    }

    /**
     * Traiter une mise à jour de produit
     */
    async handleProductUpdate(newProduct, oldProduct) {
        if (newProduct.status !== oldProduct.status) {
            console.log(`📦 Changement de statut pour ${newProduct.name}: ${oldProduct.status} → ${newProduct.status}`);
        }
    }

    /**
     * Traiter une nouvelle commande
     */
    async handleNewOrder(order) {
        console.log(`🛒 Nouvelle commande: ${order.order_number}`);
        // Notifier le vendeur
        // Mettre à jour les statistiques
    }

    /**
     * Traiter une mise à jour de commande
     */
    async handleOrderUpdate(newOrder, oldOrder) {
        if (newOrder.status !== oldOrder.status) {
            console.log(`🛒 Changement de statut pour ${newOrder.order_number}: ${oldOrder.status} → ${newOrder.status}`);
            // Envoyer des notifications
            // Mettre à jour la gamification si livré
            if (newOrder.status === 'delivered' && oldOrder.status !== 'delivered') {
                await this.gamificationService.checkAndUnlockAchievements(newOrder.customer_id);
            }
        }
    }

    /**
     * Traiter la suppression d'utilisateur
     */
    async handleUserDelete(user) {
        console.log(`🗑️ Utilisateur supprimé: ${user.email}`);
        // Nettoyer les données associées
    }

    /**
     * Traiter la suppression de produit
     */
    async handleProductDelete(product) {
        console.log(`🗑️ Produit supprimé: ${product.name}`);
        // Nettoyer les données associées
    }

    /**
     * Envoyer les notifications de paiement
     */
    async sendPaymentNotifications(order, status, extraData = {}) {
        try {
            // Implémenter l'envoi d'emails/notifications
            console.log(`📧 Notification ${status} pour la commande ${order.order_number}`);
            
            // Exemples de notifications à implémenter:
            // - Email au client
            // - Email au vendeur
            // - Notification push
            // - SMS (si configuré)

        } catch (error) {
            console.error('Erreur lors de l\'envoi des notifications:', error);
            // Ne pas bloquer le traitement du webhook
        }
    }

    /**
     * Vérifier la signature du webhook
     */
    verifyWebhookSignature(payload, signature) {
        try {
            if (!signature) {
                return false;
            }

            const { config } = require('../../config/platforms');
            const secret = config.payment.webhookSecret;

            if (!secret) {
                console.warn('Webhook secret non configuré');
                return false;
            }

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );

        } catch (error) {
            console.error('Erreur lors de la vérification de la signature:', error);
            return false;
        }
    }

    /**
     * Journaliser un webhook
     */
    async logWebhook(source, event, payload, result) {
        try {
            const logData = {
                source: source,
                event: event,
                payload: JSON.stringify(payload),
                result: JSON.stringify(result),
                status: result.success ? 'success' : 'error',
                created_at: new Date()
            };

            await this.db.query(`
                INSERT INTO webhook_logs (source, event, payload, result, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                logData.source,
                logData.event,
                logData.payload,
                logData.result,
                logData.status,
                logData.created_at
            ]);

        } catch (error) {
            console.error('Erreur lors du journalisation du webhook:', error);
            // Ne pas bloquer le traitement
        }
    }

    /**
     * Obtenir les logs de webhooks
     */
    async getWebhookLogs(filters = {}, page = 1, perPage = 20) {
        try {
            const limit = perPage;
            const offset = (page - 1) * perPage;

            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (filters.source) {
                whereClause += ` AND source = $${paramIndex++}`;
                params.push(filters.source);
            }

            if (filters.event) {
                whereClause += ` AND event = $${paramIndex++}`;
                params.push(filters.event);
            }

            if (filters.status) {
                whereClause += ` AND status = $${paramIndex++}`;
                params.push(filters.status);
            }

            const query = `
                SELECT * FROM webhook_logs
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;

            params.push(limit, offset);

            const result = await this.db.query(query, params);

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total FROM webhook_logs ${whereClause}
            `;
            const countResult = await this.db.query(countQuery, params.slice(0, -2));
            const total = parseInt(countResult.rows[0].total);

            return {
                success: true,
                data: {
                    logs: result.rows,
                    pagination: {
                        page: page,
                        per_page: perPage,
                        total: total,
                        pages: Math.ceil(total / perPage)
                    }
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération des logs de webhooks:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors de la récupération des logs',
                error: error.message
            };
        }
    }

    /**
     * Retenter un webhook échoué
     */
    async retryWebhook(logId) {
        try {
            // Obtenir le log
            const logResult = await this.db.query(
                'SELECT * FROM webhook_logs WHERE id = $1',
                [logId]
            );

            if (logResult.rows.length === 0) {
                return {
                    success: false,
                    status: 404,
                    message: 'Log de webhook non trouvé'
                };
            }

            const log = logResult.rows[0];
            const payload = JSON.parse(log.payload);

            // Retraiter le webhook
            let result;
            if (log.source === 'moneroo') {
                const event = payload.event;
                const data = payload.data;

                switch (event) {
                    case 'payment.completed':
                        result = await this.handlePaymentCompleted(data);
                        break;
                    case 'payment.failed':
                        result = await this.handlePaymentFailed(data);
                        break;
                    // Autres cas...
                    default:
                        result = { success: false, message: 'Événement non supporté pour retry' };
                }
            } else {
                result = { success: false, message: 'Source non supportée pour retry' };
            }

            // Mettre à jour le log
            await this.db.query(`
                UPDATE webhook_logs 
                SET result = $1, status = $2, updated_at = $3
                WHERE id = $4
            `, [
                JSON.stringify(result),
                result.success ? 'success' : 'error',
                new Date(),
                logId
            ]);

            return {
                success: true,
                message: 'Webhook retenté avec succès',
                result: result
            };

        } catch (error) {
            console.error('Erreur lors du retry du webhook:', error);
            return {
                success: false,
                status: 500,
                message: 'Erreur lors du retry du webhook',
                error: error.message
            };
        }
    }
}

module.exports = WebhookController;
