const axios = require('axios');
const crypto = require('crypto');
const { config } = require('../../config/platforms');

/**
 * Service de paiement Moneroo
 */
class MonerooService {
    constructor() {
        this.baseUrl = config.payment.baseUrl;
        this.apiKey = config.payment.apiKey;
        this.secretKey = config.payment.secretKey;
        this.webhookSecret = config.payment.webhookSecret;
        this.timeout = 15000;
        
        // Configuration axios
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        });
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
                    email: paymentData.customer.email,
                    name: paymentData.customer.name,
                    phone: paymentData.customer.phone || null
                },
                metadata: paymentData.metadata || {},
                redirect_url: paymentData.redirect_url || null,
                webhook_url: paymentData.webhook_url || null,
                custom_data: paymentData.custom_data || {}
            };

            // Valider les données
            const validation = this.validatePaymentData(payload);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.message,
                    details: validation.errors
                };
            }

            // Ajouter la signature
            payload.signature = this.generateSignature(payload);

            const response = await this.client.post('/payments/initialize', payload);

            if (response.data.success) {
                return {
                    success: true,
                    data: {
                        payment_id: response.data.payment_id,
                        payment_url: response.data.payment_url,
                        qr_code: response.data.qr_code || null,
                        expires_at: response.data.expires_at,
                        status: response.data.status
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Erreur lors de l\'initialisation du paiement',
                    details: response.data.errors || []
                };
            }

        } catch (error) {
            console.error('Erreur lors de l\'initialisation du paiement Moneroo:', error);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data.message || 'Erreur API Moneroo',
                    details: error.response.data.errors || [],
                    status: error.response.status
                };
            }

            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo',
                details: error.message
            };
        }
    }

    /**
     * Vérifier le statut d'un paiement
     */
    async verifyPayment(paymentId) {
        try {
            const response = await this.client.get(`/payments/${paymentId}/status`);

            if (response.data.success) {
                return {
                    success: true,
                    data: {
                        payment_id: response.data.payment_id,
                        status: response.data.status,
                        amount: response.data.amount,
                        currency: response.data.currency,
                        paid_at: response.data.paid_at,
                        failed_at: response.data.failed_at,
                        cancelled_at: response.data.cancelled_at,
                        customer: response.data.customer,
                        metadata: response.data.metadata
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Erreur lors de la vérification du paiement',
                    details: response.data.errors || []
                };
            }

        } catch (error) {
            console.error('Erreur lors de la vérification du paiement Moneroo:', error);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data.message || 'Erreur API Moneroo',
                    details: error.response.data.errors || [],
                    status: error.response.status
                };
            }

            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo',
                details: error.message
            };
        }
    }

    /**
     * Traiter un remboursement
     */
    async refundPayment(paymentId, refundData) {
        try {
            const payload = {
                payment_id: paymentId,
                amount: refundData.amount,
                reason: refundData.reason || 'Remboursement demandé',
                metadata: refundData.metadata || {}
            };

            // Valider les données
            const validation = this.validateRefundData(payload);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.message,
                    details: validation.errors
                };
            }

            // Ajouter la signature
            payload.signature = this.generateSignature(payload);

            const response = await this.client.post('/payments/refund', payload);

            if (response.data.success) {
                return {
                    success: true,
                    data: {
                        refund_id: response.data.refund_id,
                        payment_id: response.data.payment_id,
                        amount: response.data.amount,
                        status: response.data.status,
                        processed_at: response.data.processed_at
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Erreur lors du remboursement',
                    details: response.data.errors || []
                };
            }

        } catch (error) {
            console.error('Erreur lors du remboursement Moneroo:', error);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data.message || 'Erreur API Moneroo',
                    details: error.response.data.errors || [],
                    status: error.response.status
                };
            }

            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo',
                details: error.message
            };
        }
    }

    /**
     * Créer un lien de paiement
     */
    async createPaymentLink(linkData) {
        try {
            const payload = {
                title: linkData.title,
                description: linkData.description || '',
                amount: linkData.amount,
                currency: linkData.currency || 'XAF',
                quantity: linkData.quantity || 1,
                redirect_url: linkData.redirect_url || null,
                webhook_url: linkData.webhook_url || null,
                metadata: linkData.metadata || {},
                expires_at: linkData.expires_at || null
            };

            // Valider les données
            const validation = this.validateLinkData(payload);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.message,
                    details: validation.errors
                };
            }

            // Ajouter la signature
            payload.signature = this.generateSignature(payload);

            const response = await this.client.post('/payment-links/create', payload);

            if (response.data.success) {
                return {
                    success: true,
                    data: {
                        link_id: response.data.link_id,
                        link_url: response.data.link_url,
                        qr_code: response.data.qr_code || null,
                        expires_at: response.data.expires_at,
                        status: response.data.status
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Erreur lors de la création du lien',
                    details: response.data.errors || []
                };
            }

        } catch (error) {
            console.error('Erreur lors de la création du lien de paiement Moneroo:', error);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data.message || 'Erreur API Moneroo',
                    details: error.response.data.errors || [],
                    status: error.response.status
                };
            }

            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo',
                details: error.message
            };
        }
    }

    /**
     * Obtenir les détails d'un paiement
     */
    async getPaymentDetails(paymentId) {
        try {
            const response = await this.client.get(`/payments/${paymentId}`);

            if (response.data.success) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Paiement non trouvé',
                    details: response.data.errors || []
                };
            }

        } catch (error) {
            console.error('Erreur lors de la récupération des détails du paiement:', error);
            
            if (error.response && error.response.status === 404) {
                return {
                    success: false,
                    error: 'Paiement non trouvé',
                    status: 404
                };
            }

            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo',
                details: error.message
            };
        }
    }

    /**
     * Lister les paiements
     */
    async listPayments(filters = {}, page = 1, perPage = 20) {
        try {
            const params = {
                page: page,
                per_page: perPage,
                ...filters
            };

            const response = await this.client.get('/payments', { params });

            if (response.data.success) {
                return {
                    success: true,
                    data: {
                        payments: response.data.payments,
                        pagination: response.data.pagination
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Erreur lors de la récupération des paiements',
                    details: response.data.errors || []
                };
            }

        } catch (error) {
            console.error('Erreur lors de la récupération des paiements:', error);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data.message || 'Erreur API Moneroo',
                    details: error.response.data.errors || [],
                    status: error.response.status
                };
            }

            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo',
                details: error.message
            };
        }
    }

    /**
     * Traiter un webhook
     */
    async processWebhook(payload, signature) {
        try {
            // Vérifier la signature
            if (!this.verifyWebhookSignature(payload, signature)) {
                return {
                    success: false,
                    error: 'Signature invalide'
                };
            }

            const event = payload.event;
            const data = payload.data;

            // Traiter selon le type d'événement
            switch (event) {
                case 'payment.completed':
                    return this.handlePaymentCompleted(data);
                case 'payment.failed':
                    return this.handlePaymentFailed(data);
                case 'payment.pending':
                    return this.handlePaymentPending(data);
                case 'payment.cancelled':
                    return this.handlePaymentCancelled(data);
                case 'refund.processed':
                    return this.handleRefundProcessed(data);
                default:
                    return {
                        success: true,
                        message: 'Événement non traité',
                        event: event
                    };
            }

        } catch (error) {
            console.error('Erreur lors du traitement du webhook Moneroo:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Traiter un paiement complété
     */
    handlePaymentCompleted(data) {
        try {
            // Validation des données
            const requiredFields = ['payment_id', 'amount', 'currency', 'customer'];
            for (const field of requiredFields) {
                if (!data[field]) {
                    return {
                        success: false,
                        error: `Champ requis manquant: ${field}`
                    };
                }
            }

            return {
                success: true,
                event: 'payment.completed',
                data: {
                    payment_id: data.payment_id,
                    amount: data.amount,
                    currency: data.currency,
                    customer: data.customer,
                    paid_at: data.paid_at,
                    metadata: data.metadata
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Traiter un paiement échoué
     */
    handlePaymentFailed(data) {
        try {
            return {
                success: true,
                event: 'payment.failed',
                data: {
                    payment_id: data.payment_id,
                    error_code: data.error_code,
                    error_message: data.error_message,
                    failed_at: data.failed_at,
                    metadata: data.metadata
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Traiter un paiement en attente
     */
    handlePaymentPending(data) {
        try {
            return {
                success: true,
                event: 'payment.pending',
                data: {
                    payment_id: data.payment_id,
                    amount: data.amount,
                    currency: data.currency,
                    pending_at: data.pending_at,
                    metadata: data.metadata
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Traiter un paiement annulé
     */
    handlePaymentCancelled(data) {
        try {
            return {
                success: true,
                event: 'payment.cancelled',
                data: {
                    payment_id: data.payment_id,
                    cancelled_at: data.cancelled_at,
                    reason: data.reason,
                    metadata: data.metadata
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Traiter un remboursement traité
     */
    handleRefundProcessed(data) {
        try {
            return {
                success: true,
                event: 'refund.processed',
                data: {
                    refund_id: data.refund_id,
                    payment_id: data.payment_id,
                    amount: data.amount,
                    processed_at: data.processed_at,
                    metadata: data.metadata
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Générer une signature pour les requêtes
     */
    generateSignature(payload) {
        try {
            // Trier les champs par ordre alphabétique
            const sortedPayload = Object.keys(payload)
                .filter(key => key !== 'signature')
                .sort()
                .reduce((result, key) => {
                    if (payload[key] !== null && payload[key] !== undefined) {
                        result[key] = payload[key];
                    }
                    return result;
                }, {});

            // Convertir en chaîne de caractères
            const payloadString = JSON.stringify(sortedPayload);

            // Générer la signature HMAC-SHA256
            const signature = crypto
                .createHmac('sha256', this.secretKey)
                .update(payloadString)
                .digest('hex');

            return signature;

        } catch (error) {
            console.error('Erreur lors de la génération de la signature:', error);
            throw error;
        }
    }

    /**
     * Vérifier la signature d'un webhook
     */
    verifyWebhookSignature(payload, signature) {
        try {
            if (!signature || !this.webhookSecret) {
                return false;
            }

            const payloadString = JSON.stringify(payload);
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(payloadString)
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
     * Valider les données de paiement
     */
    validatePaymentData(data) {
        const errors = [];

        if (!data.amount || data.amount <= 0) {
            errors.push('Le montant doit être positif');
        }

        if (!data.currency || !/^[A-Z]{3}$/.test(data.currency)) {
            errors.push('La devise doit être un code ISO 4217 valide');
        }

        if (!data.customer || !data.customer.email) {
            errors.push('L\'email du client est requis');
        }

        if (data.customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer.email)) {
            errors.push('L\'email du client est invalide');
        }

        if (data.amount > 1000000) { // 1 million XAF max
            errors.push('Le montant dépasse la limite autorisée');
        }

        return {
            valid: errors.length === 0,
            message: errors.length > 0 ? errors.join(', ') : null,
            errors
        };
    }

    /**
     * Valider les données de remboursement
     */
    validateRefundData(data) {
        const errors = [];

        if (!data.payment_id) {
            errors.push('L\'ID du paiement est requis');
        }

        if (!data.amount || data.amount <= 0) {
            errors.push('Le montant du remboursement doit être positif');
        }

        if (!data.reason || data.reason.trim().length === 0) {
            errors.push('La raison du remboursement est requise');
        }

        return {
            valid: errors.length === 0,
            message: errors.length > 0 ? errors.join(', ') : null,
            errors
        };
    }

    /**
     * Valider les données de lien de paiement
     */
    validateLinkData(data) {
        const errors = [];

        if (!data.title || data.title.trim().length === 0) {
            errors.push('Le titre du lien est requis');
        }

        if (!data.amount || data.amount <= 0) {
            errors.push('Le montant doit être positif');
        }

        if (!data.currency || !/^[A-Z]{3}$/.test(data.currency)) {
            errors.push('La devise doit être un code ISO 4217 valide');
        }

        if (data.quantity && data.quantity <= 0) {
            errors.push('La quantité doit être positive');
        }

        return {
            valid: errors.length === 0,
            message: errors.length > 0 ? errors.join(', ') : null,
            errors
        };
    }

    /**
     * Formater le montant
     */
    formatAmount(amount, currency = 'XAF') {
        try {
            const formatter = new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });

            return formatter.format(amount);

        } catch (error) {
            return `${amount} ${currency}`;
        }
    }

    /**
     * Obtenir les devises supportées
     */
    getSupportedCurrencies() {
        return [
            { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA' },
            { code: 'EUR', name: 'Euro', symbol: '€' },
            { code: 'USD', name: 'Dollar américain', symbol: '$' }
        ];
    }

    /**
     * Obtenir les méthodes de paiement supportées
     */
    getSupportedMethods() {
        return [
            { code: 'mobile_money', name: 'Mobile Money', providers: ['MTN', 'Orange'] },
            { code: 'card', name: 'Carte bancaire', providers: ['Visa', 'Mastercard'] },
            { code: 'bank_transfer', name: 'Virement bancaire', providers: [] }
        ];
    }

    /**
     * Vérifier la connectivité avec l'API
     */
    async checkConnectivity() {
        try {
            const response = await this.client.get('/health', { timeout: 5000 });
            return {
                success: true,
                status: response.status,
                message: 'Connectivité OK'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status || null
            };
        }
    }

    /**
     * Obtenir les statistiques de paiement
     */
    async getPaymentStats(startDate, endDate) {
        try {
            const params = {
                start_date: startDate,
                end_date: endDate
            };

            const response = await this.client.get('/payments/stats', { params });

            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.stats
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Erreur lors de la récupération des statistiques'
                };
            }

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo'
            };
        }
    }

    /**
     * Exporter les paiements
     */
    async exportPayments(filters = {}, format = 'csv') {
        try {
            const params = {
                ...filters,
                format: format
            };

            const response = await this.client.get('/payments/export', { params });

            if (response.data.success) {
                return {
                    success: true,
                    data: {
                        download_url: response.data.download_url,
                        expires_at: response.data.expires_at
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Erreur lors de l\'exportation'
                };
            }

        } catch (error) {
            console.error('Erreur lors de l\'exportation des paiements:', error);
            return {
                success: false,
                error: 'Erreur de connexion au service Moneroo'
            };
        }
    }
}

module.exports = MonerooService;
