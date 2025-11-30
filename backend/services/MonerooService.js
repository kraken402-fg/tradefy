const { config, getMonerooConfig } = require('../config/platforms');
const Security = require('../utils/Security');

class MonerooService {
    constructor() {
        this.config = getMonerooConfig();
        this.baseURL = this.config.baseUrl;
        this.apiKey = this.config.apiKey;
        this.secretKey = this.config.secretKey;
    }

    /**
     * Initialiser un paiement
     */
    async initializePayment(paymentData) {
        try {
            const payload = {
                amount: paymentData.amount,
                currency: paymentData.currency || 'XAF',
                customer: {
                    email: paymentData.customer_email,
                    name: paymentData.customer_name,
                    phone: paymentData.customer_phone
                },
                metadata: {
                    order_id: paymentData.order_id,
                    user_id: paymentData.user_id,
                    product_ids: paymentData.product_ids
                },
                redirect_url: paymentData.redirect_url,
                webhook_url: paymentData.webhook_url,
                cancel_url: paymentData.cancel_url
            };

            const response = await this.makeRequest('POST', '/payments/initialize', payload);
            
            return {
                success: true,
                data: {
                    payment_id: response.data.payment_id,
                    payment_url: response.data.payment_url,
                    status: response.data.status,
                    amount: response.data.amount,
                    currency: response.data.currency
                }
            };

        } catch (error) {
            console.error('Initialize payment error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de l\'initialisation du paiement',
                    details: error.message
                }
            };
        }
    }

    /**
     * Vérifier le statut d'un paiement
     */
    async verifyPayment(paymentId) {
        try {
            const response = await this.makeRequest('GET', `/payments/${paymentId}/status`);
            
            return {
                success: true,
                data: {
                    payment_id: response.data.payment_id,
                    status: response.data.status,
                    amount: response.data.amount,
                    currency: response.data.currency,
                    paid_at: response.data.paid_at,
                    metadata: response.data.metadata
                }
            };

        } catch (error) {
            console.error('Verify payment error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la vérification du paiement',
                    details: error.message
                }
            };
        }
    }

    /**
     * Traiter un webhook Moneroo
     */
    async processWebhook(payload, signature) {
        try {
            // Vérifier la signature
            if (!this.verifyWebhookSignature(payload, signature)) {
                throw new Error('Signature webhook invalide');
            }

            const eventType = payload.event_type;
            const paymentData = payload.data;

            switch (eventType) {
                case 'payment.completed':
                    return await this.handlePaymentCompleted(paymentData);
                    
                case 'payment.failed':
                    return await this.handlePaymentFailed(paymentData);
                    
                case 'payment.cancelled':
                    return await this.handlePaymentCancelled(paymentData);
                    
                default:
                    console.log(`Webhook event type non géré: ${eventType}`);
                    return { success: true, message: 'Event ignored' };
            }

        } catch (error) {
            console.error('Process webhook error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec du traitement du webhook',
                    details: error.message
                }
            };
        }
    }

    /**
     * Créer un remboursement
     */
    async createRefund(paymentId, refundData) {
        try {
            const payload = {
                payment_id: paymentId,
                amount: refundData.amount,
                reason: refundData.reason || 'Customer request'
            };

            const response = await this.makeRequest('POST', '/refunds', payload);
            
            return {
                success: true,
                data: {
                    refund_id: response.data.refund_id,
                    status: response.data.status,
                    amount: response.data.amount
                }
            };

        } catch (error) {
            console.error('Create refund error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la création du remboursement',
                    details: error.message
                }
            };
        }
    }

    /**
     * Obtenir les détails d'un paiement
     */
    async getPaymentDetails(paymentId) {
        try {
            const response = await this.makeRequest('GET', `/payments/${paymentId}`);
            
            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('Get payment details error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la récupération des détails du paiement',
                    details: error.message
                }
            };
        }
    }

    /**
     * Lister les paiements d'un utilisateur
     */
    async listUserPayments(userId, filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.status) params.append('status', filters.status);
            if (filters.limit) params.append('limit', filters.limit);
            if (filters.offset) params.append('offset', filters.offset);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);

            const response = await this.makeRequest('GET', `/payments?user_id=${userId}&${params}`);
            
            return {
                success: true,
                data: {
                    payments: response.data.payments,
                    total: response.data.total,
                    page: response.data.page
                }
            };

        } catch (error) {
            console.error('List user payments error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la liste des paiements',
                    details: error.message
                }
            };
        }
    }

    /**
     * Calculer les frais de transaction
     */
    calculateFees(amount, paymentMethod = 'mobile_money') {
        const feeStructure = {
            mobile_money: {
                percentage: 0.029, // 2.9%
                fixed: 50 // 50 FCFA fixe
            },
            card: {
                percentage: 0.034, // 3.4%
                fixed: 100 // 100 FCFA fixe
            },
            bank_transfer: {
                percentage: 0.015, // 1.5%
                fixed: 200 // 200 FCFA fixe
            }
        };

        const fees = feeStructure[paymentMethod] || feeStructure.mobile_money;
        const variableFee = amount * fees.percentage;
        const totalFees = variableFee + fees.fixed;
        const netAmount = amount - totalFees;

        return {
            gross_amount: amount,
            fees: {
                percentage: fees.percentage * 100,
                fixed: fees.fixed,
                variable_fee: variableFee,
                total_fees: totalFees
            },
            net_amount: netAmount
        };
    }

    /**
     * Valider les données de paiement
     */
    validatePaymentData(data) {
        const errors = [];

        if (!data.amount || !Security.isValidAmount(data.amount)) {
            errors.push('Montant invalide');
        }

        if (!data.customer_email || !Security.isValidEmail(data.customer_email)) {
            errors.push('Email client invalide');
        }

        if (!data.order_id) {
            errors.push('ID de commande requis');
        }

        if (data.amount < config.app.products.minPrice || data.amount > config.app.products.maxPrice) {
            errors.push(`Montant doit être entre ${config.app.products.minPrice} et ${config.app.products.maxPrice}`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ====================
    // 🔧 MÉTHODES PRIVÉES
    // ====================

    /**
     * Faire une requête à l'API Moneroo
     */
    async makeRequest(method, endpoint, payload = null) {
        const axios = require('axios');
        const url = `${this.baseURL}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Moneroo-Signature': this.generateRequestSignature(payload)
        };

        try {
            const config = {
                method: method.toLowerCase(),
                url: url,
                headers: headers,
                timeout: 30000 // 30 secondes
            };

            if (payload && method !== 'GET') {
                config.data = payload;
            }

            const response = await axios(config);

            if (!response.data.success) {
                throw new Error(response.data.message || 'API request failed');
            }

            return response.data;

        } catch (error) {
            if (error.response) {
                const errorData = error.response.data;
                throw new Error(errorData.message || `HTTP ${error.response.status}`);
            } else if (error.request) {
                throw new Error('Pas de réponse du serveur Moneroo');
            } else {
                throw new Error(error.message);
            }
        }
    }

    /**
     * Générer la signature pour une requête
     */
    generateRequestSignature(payload) {
        if (!payload) return '';

        const crypto = require('crypto');
        const payloadString = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(payloadString)
            .digest('hex');
    }

    /**
     * Vérifier la signature d'un webhook
     */
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const payloadString = JSON.stringify(payload);
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payloadString)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Traiter un paiement complété
     */
    async handlePaymentCompleted(paymentData) {
        try {
            // Mettre à jour le statut de la commande dans la base de données
            const Order = require('../models/Order');
            const orderModel = new Order(this.db);
            
            await orderModel.updateStatus(paymentData.metadata.order_id, 'paid');
            
            // Créer une notification pour le vendeur
            const Notification = require('../models/Notification');
            const notificationModel = new Notification(this.db);
            
            await notificationModel.create({
                user_id: paymentData.metadata.user_id,
                type: 'payment_completed',
                title: 'Paiement reçu',
                message: `Paiement de ${paymentData.amount} ${paymentData.currency} reçu pour la commande #${paymentData.metadata.order_id}`,
                metadata: paymentData
            });

            // Journaliser l'événement
            Security.logSecurityEvent('PAYMENT_COMPLETED', {
                payment_id: paymentData.payment_id,
                order_id: paymentData.metadata.order_id,
                amount: paymentData.amount,
                currency: paymentData.currency
            });

            return { success: true, message: 'Payment completed processed' };

        } catch (error) {
            console.error('Handle payment completed error:', error);
            throw error;
        }
    }

    /**
     * Traiter un paiement échoué
     */
    async handlePaymentFailed(paymentData) {
        try {
            // Mettre à jour le statut de la commande
            const Order = require('../models/Order');
            const orderModel = new Order(this.db);
            
            await orderModel.updateStatus(paymentData.metadata.order_id, 'payment_failed');
            
            // Journaliser l'événement
            Security.logSecurityEvent('PAYMENT_FAILED', {
                payment_id: paymentData.payment_id,
                order_id: paymentData.metadata.order_id,
                amount: paymentData.amount,
                currency: paymentData.currency
            });

            return { success: true, message: 'Payment failed processed' };

        } catch (error) {
            console.error('Handle payment failed error:', error);
            throw error;
        }
    }

    /**
     * Traiter un paiement annulé
     */
    async handlePaymentCancelled(paymentData) {
        try {
            // Mettre à jour le statut de la commande
            const Order = require('../models/Order');
            const orderModel = new Order(this.db);
            
            await orderModel.updateStatus(paymentData.metadata.order_id, 'cancelled');
            
            // Journaliser l'événement
            Security.logSecurityEvent('PAYMENT_CANCELLED', {
                payment_id: paymentData.payment_id,
                order_id: paymentData.metadata.order_id,
                amount: paymentData.amount,
                currency: paymentData.currency
            });

            return { success: true, message: 'Payment cancelled processed' };

        } catch (error) {
            console.error('Handle payment cancelled error:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques de paiement
     */
    async getPaymentStats(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            if (filters.status) params.append('status', filters.status);

            const response = await this.makeRequest('GET', `/payments/stats?${params}`);
            
            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('Get payment stats error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la récupération des statistiques',
                    details: error.message
                }
            };
        }
    }
}

module.exports = MonerooService;
