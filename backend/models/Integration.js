const { config } = require('../config/platforms');

/**
 * Gestion des intégrations externes
 */
class Integration {
    constructor(db) {
        this.db = db;
        this.integrations = {
            supabase: {
                name: 'Supabase',
                type: 'database',
                status: 'disconnected',
                lastCheck: null,
                error: null
            },
            moneroo: {
                name: 'Moneroo',
                type: 'payment',
                status: 'disconnected',
                lastCheck: null,
                error: null
            },
            vercel: {
                name: 'Vercel',
                type: 'frontend',
                status: 'connected',
                lastCheck: null,
                error: null
            },
            infinityfree: {
                name: 'InfinityFree',
                type: 'backend',
                status: 'connected',
                lastCheck: null,
                error: null
            }
        };
    }

    /**
     * Vérifier la connexion Supabase
     */
    async checkSupabaseConnection() {
        try {
            console.log('🔗 Vérification connexion Supabase...');
            
            if (!config.database.url) {
                throw new Error('URL Supabase non configurée');
            }

            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: config.database.url,
                ssl: config.environment === 'production' ? { rejectUnauthorized: false } : false
            });

            // Test simple de connexion
            const client = await pool.connect();
            const result = await client.query('SELECT NOW() as server_time, version() as version');
            client.release();
            await pool.end();

            const integration = this.integrations.supabase;
            integration.status = 'connected';
            integration.lastCheck = new Date();
            integration.error = null;

            console.log('✅ Supabase connecté');
            
            return {
                success: true,
                data: {
                    server_time: result.rows[0].server_time,
                    version: result.rows[0].version
                }
            };

        } catch (error) {
            const integration = this.integrations.supabase;
            integration.status = 'error';
            integration.lastCheck = new Date();
            integration.error = error.message;

            console.error('❌ Erreur connexion Supabase:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Vérifier la connexion Moneroo
     */
    async checkMonerooConnection() {
        try {
            console.log('💳 Vérification connexion Moneroo...');
            
            if (!config.payment.apiKey) {
                throw new Error('Clé API Moneroo non configurée');
            }

            const axios = require('axios');
            
            // Test de l'API Moneroo (endpoint de test)
            const response = await axios.get(`${config.payment.baseUrl}/health`, {
                headers: {
                    'Authorization': `Bearer ${config.payment.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const integration = this.integrations.moneroo;
            integration.status = 'connected';
            integration.lastCheck = new Date();
            integration.error = null;

            console.log('✅ Moneroo connecté');
            
            return {
                success: true,
                data: {
                    api_status: response.status,
                    response_time: response.headers['x-response-time'] || 'N/A'
                }
            };

        } catch (error) {
            const integration = this.integrations.moneroo;
            integration.status = 'error';
            integration.lastCheck = new Date();
            integration.error = error.message;

            console.error('❌ Erreur connexion Moneroo:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Vérifier la connectivité avec le frontend
     */
    async checkFrontendConnection() {
        try {
            console.log('🌐 Vérification connectivité frontend...');
            
            if (!config.frontend.url) {
                throw new Error('URL Frontend non configurée');
            }

            const axios = require('axios');
            
            // Test de l'URL du frontend
            const response = await axios.get(config.frontend.url, {
                timeout: 10000,
                validateStatus: (status) => status < 500 // Accepter les erreurs 4xx
            });

            const integration = this.integrations.vercel;
            integration.status = response.status < 400 ? 'connected' : 'warning';
            integration.lastCheck = new Date();
            integration.error = response.status >= 400 ? `HTTP ${response.status}` : null;

            console.log(`${integration.status === 'connected' ? '✅' : '⚠️'} Frontend: ${integration.status}`);
            
            return {
                success: integration.status === 'connected',
                data: {
                    status_code: response.status,
                    response_time: response.headers['x-response-time'] || 'N/A'
                }
            };

        } catch (error) {
            const integration = this.integrations.vercel;
            integration.status = 'error';
            integration.lastCheck = new Date();
            integration.error = error.message;

            console.error('❌ Erreur connectivité frontend:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtenir le statut de toutes les intégrations
     */
    async getAllIntegrationsStatus() {
        const results = {};

        // Vérifier chaque intégration
        results.supabase = await this.checkSupabaseConnection();
        results.moneroo = await this.checkMonerooConnection();
        results.frontend = await this.checkFrontendConnection();

        // InfinityFree est toujours "connecté" car c'est le serveur actuel
        results.infinityfree = {
            success: true,
            data: {
                status: 'running',
                environment: config.environment,
                node_version: process.version
            }
        };

        return results;
    }

    /**
     * Obtenir les détails d'une intégration
     */
    getIntegrationDetails(name) {
        const integration = this.integrations[name.toLowerCase()];
        
        if (!integration) {
            return {
                success: false,
                error: 'Intégration non trouvée'
            };
        }

        return {
            success: true,
            data: {
                ...integration,
                configured: this.isIntegrationConfigured(name.toLowerCase())
            }
        };
    }

    /**
     * Vérifier si une intégration est configurée
     */
    isIntegrationConfigured(name) {
        switch (name) {
            case 'supabase':
                return !!(config.database.url && config.database.key);
            case 'moneroo':
                return !!(config.payment.apiKey && config.payment.secretKey);
            case 'vercel':
                return !!config.frontend.url;
            case 'infinityfree':
                return !!config.backend.url;
            default:
                return false;
        }
    }

    /**
     * Sauvegarder les logs d'intégration
     */
    async saveIntegrationLog(integrationName, action, result, error = null) {
        try {
            const query = `
                INSERT INTO integration_logs (
                    integration_name, action, status, response_data, error_message, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;

            const values = [
                integrationName,
                action,
                result.success ? 'success' : 'error',
                JSON.stringify(result.data || {}),
                error,
                new Date()
            ];

            const dbResult = await this.db.query(query, values);
            return dbResult.rows[0].id;

        } catch (logError) {
            console.error('Erreur sauvegarde log intégration:', logError.message);
            return null;
        }
    }

    /**
     * Obtenir les logs d'intégration
     */
    async getIntegrationLogs(integrationName = null, limit = 100) {
        try {
            let query = `
                SELECT * FROM integration_logs
                ${integrationName ? 'WHERE integration_name = $1' : ''}
                ORDER BY created_at DESC
                LIMIT $${integrationName ? 2 : 1}
            `;

            const values = integrationName ? [integrationName, limit] : [limit];

            const result = await this.db.query(query, values);
            return result.rows;

        } catch (error) {
            console.error('Erreur récupération logs intégration:', error.message);
            return [];
        }
    }

    /**
     * Tester une intégration spécifique
     */
    async testIntegration(name) {
        const integrationName = name.toLowerCase();
        
        switch (integrationName) {
            case 'supabase':
                return await this.checkSupabaseConnection();
            case 'moneroo':
                return await this.checkMonerooConnection();
            case 'vercel':
                return await this.checkFrontendConnection();
            case 'infinityfree':
                return {
                    success: true,
                    data: {
                        status: 'running',
                        environment: config.environment,
                        uptime: process.uptime()
                    }
                };
            default:
                return {
                    success: false,
                    error: 'Intégration non reconnue'
                };
        }
    }

    /**
     * Obtenir les métriques d'intégration
     */
    async getIntegrationMetrics() {
        try {
            const query = `
                SELECT 
                    integration_name,
                    COUNT(*) as total_requests,
                    COUNT(*) FILTER (WHERE status = 'success') as success_count,
                    COUNT(*) FILTER (WHERE status = 'error') as error_count,
                    ROUND(COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*), 2) as success_rate,
                    MAX(created_at) as last_request
                FROM integration_logs
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY integration_name
                ORDER BY integration_name
            `;

            const result = await this.db.query(query);
            return result.rows;

        } catch (error) {
            console.error('Erreur récupération métriques intégration:', error.message);
            return [];
        }
    }

    /**
     * Créer un webhook pour une intégration
     */
    async createWebhook(integrationName, webhookData) {
        try {
            const query = `
                INSERT INTO webhooks (
                    integration_name, url, events, secret, is_active, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [
                integrationName,
                webhookData.url,
                JSON.stringify(webhookData.events || []),
                webhookData.secret || this.generateSecret(),
                webhookData.is_active !== false,
                new Date()
            ];

            const result = await this.db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Erreur création webhook:', error.message);
            throw error;
        }
    }

    /**
     * Générer un secret pour webhook
     */
    generateSecret() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Obtenir les webhooks d'une intégration
     */
    async getWebhooks(integrationName) {
        try {
            const query = 'SELECT * FROM webhooks WHERE integration_name = $1 ORDER BY created_at DESC';
            const result = await this.db.query(query, [integrationName]);
            return result.rows;

        } catch (error) {
            console.error('Erreur récupération webhooks:', error.message);
            return [];
        }
    }

    /**
     * Mettre à jour le statut d'une intégration
     */
    updateIntegrationStatus(name, status, error = null) {
        const integration = this.integrations[name.toLowerCase()];
        
        if (integration) {
            integration.status = status;
            integration.lastCheck = new Date();
            integration.error = error;
        }
    }

    /**
     * Obtenir un résumé de toutes les intégrations
     */
    async getIntegrationsSummary() {
        const status = await this.getAllIntegrationsStatus();
        
        const summary = {
            total_integrations: Object.keys(this.integrations).length,
            connected_count: 0,
            error_count: 0,
            warning_count: 0,
            integrations: {}
        };

        for (const [name, integration] of Object.entries(this.integrations)) {
            const testResult = status[name];
            
            summary.integrations[name] = {
                name: integration.name,
                type: integration.type,
                status: integration.status,
                configured: this.isIntegrationConfigured(name),
                last_check: integration.lastCheck,
                error: integration.error,
                test_result: testResult
            };

            if (integration.status === 'connected') {
                summary.connected_count++;
            } else if (integration.status === 'error') {
                summary.error_count++;
            } else if (integration.status === 'warning') {
                summary.warning_count++;
            }
        }

        summary.overall_health = summary.connected_count === summary.total_integrations ? 'healthy' : 
                               summary.error_count > 0 ? 'critical' : 'warning';

        return summary;
    }

    /**
     * Configurer une intégration
     */
    configureIntegration(name, configData) {
        const integrationName = name.toLowerCase();
        
        switch (integrationName) {
            case 'supabase':
                if (configData.url) config.database.url = configData.url;
                if (configData.key) config.database.key = configData.key;
                if (configData.secret) config.database.secret = configData.secret;
                break;
                
            case 'moneroo':
                if (configData.apiKey) config.payment.apiKey = configData.apiKey;
                if (configData.secretKey) config.payment.secretKey = configData.secretKey;
                if (configData.webhookSecret) config.payment.webhookSecret = configData.webhookSecret;
                break;
                
            case 'vercel':
                if (configData.url) config.frontend.url = configData.url;
                break;
                
            case 'infinityfree':
                if (configData.url) config.backend.url = configData.url;
                break;
                
            default:
                throw new Error('Intégration non reconnue');
        }

        this.updateIntegrationStatus(name, 'configured');
        
        return {
            success: true,
            message: `Intégration ${name} configurée avec succès`
        };
    }
}

module.exports = Integration;
